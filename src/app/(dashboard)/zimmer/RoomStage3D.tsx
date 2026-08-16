"use client";

/**
 * 3D-Bühne des Gaming-Zimmers (Three.js/React Three Fiber) — Ersatz für das
 * SVG-basierte RoomStage.tsx. Übernimmt denselben Props-Vertrag 1:1
 * ({state, ownerName, vitrine, vitrineReadOnly, onInteract, edit}), damit
 * RoomView.tsx und RoomEditor.tsx nur den Import umstellen mussten.
 *
 * Raum-Shell + Möbel sind prozedural (kein Foto-Sprite, kein glTF) — siehe
 * FurniturePrimitive.tsx. Tapete/Boden sind Flachfarben (room-3d.ts), keine
 * Fototextur mehr. Die Vitrine ist kein eigenes seitliches Panel mehr,
 * sondern ein anklickbares Objekt IM Raum (VitrineMarker) — passt besser zum
 * 3D-Look als ein zusätzliches 2D-Panel neben der Bühne. Das bestehende
 * VitrinePanel.tsx (reichhaltige SVG-Trophäenanzeige) bleibt als Komponente
 * für einen möglichen späteren Einsatz erhalten, wird hier aber nicht mehr
 * gerendert — Trophäen/Pokale/Details zeigt weiterhin VitrineModal.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera, ContactShadows, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  Vector3, Mesh, MeshStandardMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace,
  type OrthographicCamera as ThreeOrthographicCamera,
} from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { useGLTF } from "@react-three/drei";

// Einmalig auf Modulebene, nicht in einem Component-Effect: RectAreaLight
// (Monitor-Screens/Neon-Panels, siehe FurniturePrimitive.tsx) braucht diese
// Uniform-Library, bevor der erste Frame gerendert wird — sonst bleibt das
// erste Bild falsch/dunkel, bis ein Effect nachträglich greift.
RectAreaLightUniformsLib.init();
import {
  ROOM_SIZE, ROOM_CENTER, ACCENT_COLORS, WALL_THICKNESS, shadeHex,
  gridToWorld, surfaceRotationY, worldToGrid, type RoomSurface,
} from "@/lib/room-3d";
import { getRoomItem } from "@/lib/room-items";
import {
  roomLevel, standCells, footprint, ROOM_LEVEL_THRESHOLDS,
  type PlacedItem, type RoomState, type RoomSurface as LayoutSurface,
} from "@/lib/room-layout";
import type { VitrineItem } from "@/lib/room-vitrine";
import { FurniturePrimitive } from "./furniture/FurniturePrimitive";
import { RoomWindow3D, WindowLight, CeilingLamp3D, EntranceDoor3D, WINDOW_GEOM } from "./RoomLevelFixtures";

export type InteractTarget = "crt" | "vitrine" | "jobboard";

export interface EditHooks {
  selectedId: string | null;
  legal: { zone: LayoutSurface; x: number; y: number }[];
  ghost: { w: number; h: number; key: string; rotation: number } | null;
  onSelect: (id: string) => void;
  onGrab:   (id: string) => void;
  onDrop:   (zone: LayoutSurface, x: number, y: number) => void;
}

interface Props {
  state:     RoomState;
  ownerName: string;
  vitrine: { slots: (VitrineItem | null)[]; hiddenCount: number };
  vitrineReadOnly?: boolean;
  onInteract: (target: InteractTarget, itemKey?: string, slotIndex?: number) => void;
  edit?: EditHooks;
  /**
   * Aktuell offenes Interaktions-Overlay (Profil-Popup/Vitrine) — vom Aufrufer
   * durchgereicht (siehe RoomView.tsx `openTarget`), damit die Kamera beim
   * Öffnen ECHT auf das Objekt zuzoomt statt nur ein Popup aufreißen zu lassen,
   * und beim Schließen wieder auf die normale Raumansicht zurückfährt.
   */
  focusTarget?: InteractTarget | null;
  /** Admin-verstellbare Stufe-1/2/3-Investitionsschwellen (siehe RoomConfig
   *  in room-config.ts) — Default ROOM_LEVEL_THRESHOLDS, falls der Aufrufer
   *  die Config nicht geladen hat (z.B. Vorschau-Kontexte). */
  levelThresholds?: readonly number[];
}

// ── Prozedurale Boden-/Wand-Texturen ────────────────────────────────────────
// Reine Flachfarben (bloß `color`) wirkten leblos/plastikartig — hier kommt
// ein kleines, per <canvas> gezeichnetes Tile-Muster dazu (kein Foto-Asset
// nötig, bleibt beliebig re-skinnbar).
//
// Wand/Boden sind KEIN Katalog-Kauf mehr (siehe CATEGORY_ORDER in
// room-items.ts) — sie werten sich automatisch mit der Zimmerstufe auf, genau
// wie Deckenlampe/Fenster (RoomLevelFixtures.tsx): schäbige Grundausstattung
// bis hin zu edel/luxuriös, ohne dass der User Tapete/Boden einzeln
// aussuchen oder kaufen muss.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => clamp255(v).toString(16).padStart(2, "0")).join("")}`;
}

type TexturePattern = "grain" | "planks" | "grid" | "panels";

/**
 * Wand-Ausstattung je Zimmerstufe (0..3, siehe ROOM_LEVEL_LABEL in
 * RoomLevelFixtures.tsx) — von abgewohnter Raufaser bis zu edlem Sci-Fi-Panel.
 */
const ROOM_WALL_STAGES: readonly { color: string; pattern: TexturePattern }[] = [
  { color: "#4a4260", pattern: "grain" },  // 0: Abgewohnt — vergilbte Raufaser
  { color: "#584f78", pattern: "grain" },  // 1: Frisch renoviert — aufgefrischter Anstrich
  { color: "#2a5560", pattern: "panels" }, // 2: Modern eingerichtet — Sci-Fi-Paneele
  { color: "#241f40", pattern: "panels" }, // 3: Luxuriös ausgestattet — dunkles Edel-Panel
];

/** Boden-Ausstattung je Zimmerstufe — von fleckigem Linoleum bis Gitterrost. */
const ROOM_FLOOR_STAGES: readonly { color: string; pattern: TexturePattern }[] = [
  { color: "#39324a", pattern: "grain" },  // 0: Abgewohnt — fleckiges Linoleum
  { color: "#5a4230", pattern: "planks" }, // 1: Frisch renoviert — Holzdielen
  { color: "#6a5038", pattern: "planks" }, // 2: Modern eingerichtet — edlere Dielen
  { color: "#243840", pattern: "grid" },   // 3: Luxuriös ausgestattet — Gitterrost-Boden
];

/** Seeded PRNG (mulberry32) — reproduzierbares "organisches" Rauschen statt
 *  echtem Math.random(), sonst ändert sich das Muster bei jedem Re-Render. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrain(ctx: CanvasRenderingContext2D, size: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const [r, g, b] = hexToRgb(base);
  const rng = makeRng(size * 7 + r + g * 13 + b * 31);
  // Große, weiche Schmutz-/Verfärbungsflecken zuerst (organische Wandflächen
  // sind nie gleichmäßig eingefärbt) — danach feines Korn obendrauf. Ohne die
  // Flecken wirkte reines Pixelrauschen wie digitales "TV-Schnee", nicht wie
  // eine gealterte Fläche.
  for (let i = 0; i < 10; i++) {
    const cx = rng() * size, cy = rng() * size, rad = size * (0.12 + rng() * 0.22);
    const dark = rng() > 0.5;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grad.addColorStop(0, `rgba(${dark ? 0 : 255},${dark ? 0 : 255},${dark ? 0 : 255},${0.05 + rng() * 0.06})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
  }
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * 20;
    img.data[i] = clamp255(img.data[i] + n);
    img.data[i + 1] = clamp255(img.data[i + 1] + n);
    img.data[i + 2] = clamp255(img.data[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}

function drawPlanks(ctx: CanvasRenderingContext2D, size: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const [r, g, b] = hexToRgb(base);
  const rng = makeRng(size * 3 + g);
  const rows = 5, plankH = size / rows;
  const plankW = size / 2; // zwei Dielen pro Reihe, versetzte Stöße wie echtes Parkett
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : plankW / 2;
    for (let px = -plankW; px < size + plankW; px += plankW) {
      const x = px + offset;
      const shade = 0.85 + rng() * 0.35;
      ctx.fillStyle = rgbToHex(r * shade, g * shade, b * shade);
      ctx.fillRect(x, row * plankH, plankW - 2, plankH - 2);
      // Organische Maserung: mehrere leicht wellige Linien statt gerader Striche.
      ctx.strokeStyle = `rgba(0,0,0,${0.06 + rng() * 0.06})`;
      ctx.lineWidth = 1;
      for (let g2 = 0; g2 < 3; g2++) {
        const gy = row * plankH + 3 + rng() * (plankH - 6);
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.quadraticCurveTo(x + plankW / 2, gy + (rng() - 0.5) * 6, x + plankW, gy + (rng() - 0.5) * 4);
        ctx.stroke();
      }
      // Gelegentlicher Astknoten.
      if (rng() > 0.6) {
        const kx = x + plankW * (0.2 + rng() * 0.6), ky = row * plankH + plankH * (0.3 + rng() * 0.4);
        const kr = 2 + rng() * 2.5;
        const kg = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
        kg.addColorStop(0, "rgba(0,0,0,0.32)");
        kg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = kg;
        ctx.beginPath(); ctx.ellipse(kx, ky, kr, kr * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Fugenlinie samt leichtem Bevel (Schatten oben, Glanzkante darunter).
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, row * plankH + plankH - 2, size, 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, row * plankH, size, 1);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const step = size / 5;
  const barW = step * 0.22;
  // Erhabene Metallstege statt reiner Linien: dunkler Kern-Strich, heller
  // Glanzstreifen versetzt daneben — simuliert eine Kante, die Licht fängt.
  ctx.lineCap = "square";
  for (let i = 0; i <= 5; i++) {
    const x = i * step, y = i * step;
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = barW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = barW * 0.3;
    ctx.beginPath(); ctx.moveTo(x - barW * 0.25, 0); ctx.lineTo(x - barW * 0.25, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y - barW * 0.25); ctx.lineTo(size, y - barW * 0.25); ctx.stroke();
  }
  // Niete an jeder Kreuzung.
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const cx = i * step, cy = j * step;
      const rg = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, barW * 0.5);
      rg.addColorStop(0, "rgba(255,255,255,0.5)");
      rg.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(cx, cy, barW * 0.42, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawPanels(ctx: CanvasRenderingContext2D, size: number, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const [r, g, b] = hexToRgb(base);
  const rng = makeRng(size * 5 + b);
  const cols = 2, rows = 2;
  const pw = size / cols, ph = size / rows;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * pw, y0 = cy * ph;
      const shade = 0.94 + rng() * 0.14;
      ctx.fillStyle = rgbToHex(r * shade, g * shade, b * shade);
      ctx.fillRect(x0 + 1, y0 + 1, pw - 2, ph - 2);
      // Gebürstetes Metall: feine diagonale Streifen in leichter Varianz.
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let s = 0; s < 10; s++) {
        const sy = y0 + (s / 10) * ph;
        ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + pw, sy + ph * 0.15); ctx.stroke();
      }
      // Bevel: helle Kante oben/links, dunkle Kante unten/rechts.
      ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + ph - 1); ctx.lineTo(x0 + 1, y0 + 1); ctx.lineTo(x0 + pw - 1, y0 + 1); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0 + pw - 1, y0 + 1); ctx.lineTo(x0 + pw - 1, y0 + ph - 1); ctx.lineTo(x0 + 1, y0 + ph - 1); ctx.stroke();
      // Ecknieten.
      for (const [rx, ry] of [[8, 8], [pw - 8, 8], [8, ph - 8], [pw - 8, ph - 8]]) {
        const px = x0 + rx, py = y0 + ry;
        const rg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 3);
        rg.addColorStop(0, "rgba(255,255,255,0.55)");
        rg.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

/** Erzeugt (memoized) eine wiederholbare Canvas-Textur für ein Muster+Farbe. */
function useRoomTexture(pattern: TexturePattern, baseColor: string, repeatX: number, repeatY: number): CanvasTexture {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    if (pattern === "planks") drawPlanks(ctx, size, baseColor);
    else if (pattern === "grid") drawGrid(ctx, size, baseColor);
    else if (pattern === "panels") drawPanels(ctx, size, baseColor);
    else drawGrain(ctx, size, baseColor);
    const tex = new CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.colorSpace = SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, [pattern, baseColor, repeatX, repeatY]);
}

function RoomShell({
  level, hiddenWalls,
}: { level: number; hiddenWalls: ReadonlySet<RoomSurface> }) {
  const { width, depth, height } = ROOM_SIZE;
  const wallStage = ROOM_WALL_STAGES[level] ?? ROOM_WALL_STAGES[0];
  const floorStage = ROOM_FLOOR_STAGES[level] ?? ROOM_FLOOR_STAGES[0];
  const wallColor = wallStage.color;
  const floorColor = floorStage.color;
  const trim = "#d8d2ea";

  // Ein Tile pro ~1.4 Weltmeter — grob abgestimmt, damit weder Wand noch
  // Boden sichtbar "verwaschen groß" oder "unruhig klein" gekachelt wirken.
  const TILE = 1.4;
  const floorTex   = useRoomTexture(floorStage.pattern, floorColor, Math.round(width / TILE), Math.round(depth / TILE));
  const wallTexWide = useRoomTexture(wallStage.pattern, wallColor, Math.round(width / TILE), Math.round(height / TILE));
  const sideColor = shadeHex(wallColor, 0.72);
  const wallTexDeepDark = useRoomTexture(wallStage.pattern, sideColor, Math.round(depth / TILE), Math.round(height / TILE));

  // Die Rückwand bekommt eine ECHTE Öffnung an der Fensterposition (vier
  // Segmente statt einer durchgehenden Box) — sonst sitzt eine blickdichte
  // Wand direkt hinter dem (jetzt hohlen) Fensterrahmen, und die dahinter
  // gestaffelte Aussichts-Diorama (RoomLevelFixtures.tsx, WindowGlass) ist
  // unsichtbar, weil sie im/hinter dem massiven Wandkörper liegt. Jedes
  // Segment bekommt seine eigene, proportional passende Textur-Wiederholung
  // (wie floorTex/wallTexWide/wallTexDeepDark oben), sonst wirken die
  // schmalen Streifen im Vergleich zu den breiten Seiten verzerrt gekachelt.
  const backLeftW  = WINDOW_GEOM.x0;
  const backRightW = width - (WINDOW_GEOM.x0 + WINDOW_GEOM.w);
  const backTopH   = height - (WINDOW_GEOM.y0 + WINDOW_GEOM.h);
  const backBottomH = WINDOW_GEOM.y0;
  const backLeftTex   = useRoomTexture(wallStage.pattern, wallColor, Math.round(backLeftW / TILE) || 1, Math.round(height / TILE));
  const backRightTex  = useRoomTexture(wallStage.pattern, wallColor, Math.round(backRightW / TILE) || 1, Math.round(height / TILE));
  const backTopTex    = useRoomTexture(wallStage.pattern, wallColor, Math.round(WINDOW_GEOM.w / TILE) || 1, Math.round(backTopH / TILE) || 1);
  const backBottomTex = useRoomTexture(wallStage.pattern, wallColor, Math.round(WINDOW_GEOM.w / TILE) || 1, Math.round(backBottomH / TILE) || 1);

  return (
    <group>
      {/*
       * `emissive` = die eigene Flächenfarbe bei moderater Intensität: ohne
       * das komprimiert Three.js' Standard-Tonemapping (ACES-artig) normal
       * beleuchtete, matte Flächen erheblich dunkler als der reine Hex-Wert
       * vermuten lässt — sichtbar nur die `toneMapped={false}`-Neon-Elemente,
       * Wand/Boden verschwimmen mit dem Void dahinter. Ein Eigenleuchtanteil
       * garantiert Mindesthelligkeit unabhängig vom Lichtwinkel — passt auch
       * besser zum flachen, nicht-photorealistischen Low-Poly-Zielbild als
       * reine PBR-Schattierung.
       */}
      {/*
       * Boden/Wände als Boxen mit echter Stärke (WALL_THICKNESS) statt
       * nulldicker Planes — flache Planes wirkten aus jedem Winkel, der die
       * Kante zeigt, papierdünn. Die sichtbare Innenfläche bleibt exakt bei
       * y=0/x=0/z=0/width/depth (dieselben Koordinaten, die gridToWorld für
       * Möbel verwendet), die Box wächst nur nach außen/unten weiter.
       *
       * Vier Wände statt zwei: die Raum-Shell ist jetzt eine geschlossene
       * Box, aber IMMER nur die zwei kamerafernen Wände werden gerendert
       * (siehe `hiddenWalls`, kamerarelativ in RoomCanvas berechnet) — sonst
       * würde die feste Iso-Kamera beim Drehen irgendwann direkt gegen eine
       * nahe Wand schauen und nichts vom Rauminneren mehr sehen.
       */}
      {/* Boden um WALL_THICKNESS nach allen vier Seiten vergrößert, damit
          seine Außenkante bündig mit der Wand-Außenseite abschließt statt an
          deren Innenkante eine Lücke zu lassen — unabhängig davon, welche
          zwei Wände gerade sichtbar sind. */}
      {/* emissiveIntensity deutlich reduziert (war 0.55, pauschal für JEDE
          Fläche) — die Grundhelligkeit kommt jetzt vom echten Licht in
          RoomLighting, dieser Rest-Eigenleuchtanteil verhindert nur noch
          reines Schwarz in unbeleuchteten Ecken. */}
      {/* `color` bleibt bei texturierten Flächen Weiß: die Canvas-Textur
          backt die eigentliche Farbe schon ein (siehe drawGrain/drawPlanks/…)
          — ein zusätzliches `color={floorColor}` würde mit der Textur
          MULTIPLIZIEREN (Three.js' `map`-Verhalten) und die Fläche unnötig
          verdunkeln/vermatschen, statt sie nur zu texturieren. `emissive`
          bleibt unverändert additiv und behält seine ursprüngliche Aufgabe
          (Mindesthelligkeit in unbeleuchteten Ecken). */}
      <mesh position={[width / 2, -WALL_THICKNESS / 2, depth / 2]} receiveShadow>
        <boxGeometry args={[width + WALL_THICKNESS * 2, WALL_THICKNESS, depth + WALL_THICKNESS * 2]} />
        <meshStandardMaterial map={floorTex} color="#ffffff" emissive={floorColor} emissiveIntensity={0.12} roughness={0.85} />
      </mesh>
      {!hiddenWalls.has("wall_back") && (
        <>
          {/* Links/rechts vom Fenster — volle Wandhöhe */}
          <mesh position={[backLeftW / 2, height / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
            <boxGeometry args={[backLeftW, height, WALL_THICKNESS]} />
            <meshStandardMaterial map={backLeftTex} color="#ffffff" emissive={wallColor} emissiveIntensity={0.12} roughness={0.9} />
          </mesh>
          <mesh position={[WINDOW_GEOM.x0 + WINDOW_GEOM.w + backRightW / 2, height / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
            <boxGeometry args={[backRightW, height, WALL_THICKNESS]} />
            <meshStandardMaterial map={backRightTex} color="#ffffff" emissive={wallColor} emissiveIntensity={0.12} roughness={0.9} />
          </mesh>
          {/* Über/unter dem Fenster — nur die Fensterbreite */}
          {backTopH > 0 && (
            <mesh position={[WINDOW_GEOM.x0 + WINDOW_GEOM.w / 2, WINDOW_GEOM.y0 + WINDOW_GEOM.h + backTopH / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
              <boxGeometry args={[WINDOW_GEOM.w, backTopH, WALL_THICKNESS]} />
              <meshStandardMaterial map={backTopTex} color="#ffffff" emissive={wallColor} emissiveIntensity={0.12} roughness={0.9} />
            </mesh>
          )}
          {backBottomH > 0 && (
            <mesh position={[WINDOW_GEOM.x0 + WINDOW_GEOM.w / 2, backBottomH / 2, -WALL_THICKNESS / 2]} receiveShadow castShadow>
              <boxGeometry args={[WINDOW_GEOM.w, backBottomH, WALL_THICKNESS]} />
              <meshStandardMaterial map={backBottomTex} color="#ffffff" emissive={wallColor} emissiveIntensity={0.12} roughness={0.9} />
            </mesh>
          )}
        </>
      )}
      {!hiddenWalls.has("wall_front") && (
        <mesh position={[width / 2, height / 2, depth + WALL_THICKNESS / 2]} receiveShadow castShadow>
          <boxGeometry args={[width, height, WALL_THICKNESS]} />
          <meshStandardMaterial map={wallTexWide} color="#ffffff" emissive={wallColor} emissiveIntensity={0.12} roughness={0.9} />
        </mesh>
      )}
      {!hiddenWalls.has("wall_side") && (
        <mesh position={[-WALL_THICKNESS / 2, height / 2, depth / 2]} receiveShadow castShadow>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial
            map={wallTexDeepDark} color="#ffffff" emissive={sideColor} emissiveIntensity={0.12}
            roughness={0.9}
          />
        </mesh>
      )}
      {!hiddenWalls.has("wall_right") && (
        <mesh position={[width + WALL_THICKNESS / 2, height / 2, depth / 2]} receiveShadow castShadow>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial
            map={wallTexDeepDark} color="#ffffff" emissive={sideColor} emissiveIntensity={0.12}
            roughness={0.9}
          />
        </mesh>
      )}
      {/*
       * Dünner heller Kantenrahmen um den Boden (alle vier Seiten): macht die
       * Raumgrenze auch bei dunkler Tapete/Boden sofort lesbar, statt dass
       * Möbel scheinbar im Void schweben — die Referenz-Screenshots zeigen
       * durchgehend einen scharfen, hellen Bodenrand.
       */}
      <mesh position={[width / 2, 0.02, 0.02]}>
        <boxGeometry args={[width, 0.04, 0.04]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[width / 2, 0.02, depth - 0.02]}>
        <boxGeometry args={[width, 0.04, 0.04]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[0.02, 0.02, depth / 2]}>
        <boxGeometry args={[0.04, 0.04, depth]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[width - 0.02, 0.02, depth / 2]}>
        <boxGeometry args={[0.04, 0.04, depth]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Beleuchtung des Raums — bewusst kein rein dekoratives Ambiente-Licht mehr
 * (die frühere Deckenkanten-Neon-Linie, die unabhängig von jeder echten
 * Lichtquelle immer lief, ist entfernt). Basis ist ein gedämpftes
 * Umgebungslicht (verhindert reines Schwarz in Schattenbereichen) plus ein
 * gerichtetes "Sonnenlicht" durchs Fenster, das ECHTE Schatten wirft
 * (`castShadow`) — Möbel-Schatten kommen jetzt von einer echten Lichtquelle,
 * nicht mehr nur vom gebackenen `ContactShadows`-Bodenschatten. Einzelne
 * Leuchtmittel (Deckenlampe, Stehlampe, Monitore, Neon-Deko) tragen ihr
 * eigenes `pointLight`/`rectAreaLight` direkt an ihrer Geometrie (siehe
 * CeilingLamp3D, FurniturePrimitive.tsx) statt einer globalen Pauschale.
 */
function RoomLighting({ blindsClosed }: { blindsClosed: boolean }) {
  const { width, depth } = ROOM_SIZE;
  // Deutlich gedämpfte Grundhelligkeit (vorher 0.22/0.35): die einzelnen
  // Lichtquellen (Deckenlampe, Fenster) sollen den Unterschied machen, nicht
  // ein permanent helles Umgebungslicht, das an/aus kaum spürbar macht.
  return (
    <>
      <ambientLight intensity={0.1} />
      <hemisphereLight args={["#6a63a0", "#1c1830", 0.16]} />
      {/* Simuliert Tageslicht, das durchs Fenster hereinfällt — fällt fast
          komplett weg, wenn der Rolladen unten ist, statt unabhängig vom
          Fenster immer gleich hell zu bleiben. Position bewusst VOR der
          Rückwand (negatives Z, außerhalb des Zimmers, ungefähr auf Höhe des
          Fensters bei X≈width/2) und mit dem Standard-Zielpunkt (0,0,0) —
          vorher stand das Licht auf der GEGENÜBERLIEGENDEN Raumseite
          (Z=depth*1.3) und schien in Richtung Fenster statt hindurch, wodurch
          Möbel ihren Schatten in die falsche Richtung (zur Fensterwand hin
          statt von ihr weg) warfen. */}
      <directionalLight
        position={[width * 0.55, 5.5, -4]}
        intensity={blindsClosed ? 0.12 : 1.5}
        color="#fff2e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-Math.max(width, depth) * 0.7}
        shadow-camera-right={Math.max(width, depth) * 0.7}
        shadow-camera-top={Math.max(width, depth) * 0.7}
        shadow-camera-bottom={-Math.max(width, depth) * 0.7}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-bias={-0.0015}
      />
    </>
  );
}

/** Halbtransparente Zellen-Fläche für Legal-Cell-Highlights & Ghost-Preview. */
function CellHighlight({
  surface, x, y, w, h, color, opacity,
}: { surface: RoomSurface; x: number; y: number; w: number; h: number; color: string; opacity: number }) {
  const world = gridToWorld(surface, x, y, w, h);
  const rotX = surface === "floor" ? -Math.PI / 2 : 0;
  const rotY = surfaceRotationY(surface);
  const offset = 0.01;
  // Leicht von der jeweiligen Wandfläche Richtung Rauminnere versetzt (gegen
  // Z-Fighting mit der Wand selbst) — bei den beiden "fernen" Wänden
  // (front/right, an Z=depth bzw. X=width) läuft der Versatz nach INNEN
  // (subtrahiert), nicht nach außen.
  const pos = surface === "floor" ? [world.x, offset, world.z] as const
    : surface === "wall_back"  ? [world.x, world.y, offset] as const
    : surface === "wall_front" ? [world.x, world.y, ROOM_SIZE.depth - offset] as const
    : surface === "wall_side"  ? [offset, world.y, world.z] as const
    : [ROOM_SIZE.width - offset, world.y, world.z] as const; // wall_right
  return (
    <mesh position={pos} rotation={[rotX, rotY, 0]}>
      <planeGeometry args={[w * 0.96, h * 0.96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

/**
 * Höhe der Tisch-/Ablage-Oberkante, auf die ein "desk"-stehendes Objekt
 * angehoben wird — ein einzelner plausibler Schreibtisch-Wert statt einer
 * Pro-Modell-Vermessung jedes einzelnen Tisches (die realen GLB-Tische
 * variieren kaum genug, um das visuell zu rechtfertigen). Ohne diese
 * Anhebung sitzt gridToWorld()'s Boden-Y=0 IMMER auf dem Fußboden, egal ob
 * das Item eigentlich auf einem Tisch stehen soll — sichtbar z.B. am
 * Röhrenmonitor, der sonst neben/unter statt auf dem Tisch stand.
 */
const DESK_STAND_HEIGHT = 0.74;

/**
 * Dezenter, pulsierender Bodenring unter winzigen 1×1-Objekten (Webcam,
 * Maus, Capture-Karte & Co.) — die gehen in der isometrischen Ansicht neben
 * großen Möbelstücken sonst leicht unter. Rein optisch, kein Klickziel
 * (siehe `raycast={() => null}`, damit der Ring keine Pointer-Events vom
 * eigentlichen Objekt darunter/davor abfängt).
 */
function SmallItemMarker({ color }: { color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const mat = ref.current?.material;
    if (mat && !Array.isArray(mat) && "opacity" in mat) {
      mat.opacity = 0.22 + Math.sin(clock.elapsedTime * 2.2) * 0.12;
    }
  });
  return (
    <mesh ref={ref} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[0.32, 0.4, 28]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} toneMapped={false} />
    </mesh>
  );
}

function PlacedFurniture({
  placed, edit, onInteract, hiddenWalls,
}: { placed: PlacedItem[]; edit?: EditHooks; onInteract: Props["onInteract"]; hiddenWalls: ReadonlySet<RoomSurface> }) {
  // Alle Boden-Zellen, die gerade tatsächlich von einem Tisch/einer Ablage
  // belegt sind — einmal pro Render-Durchlauf berechnet, nicht pro Item.
  const deskCells = useMemo(() => standCells(placed), [placed]);

  const entries = useMemo(() => placed.map(item => {
    // Ein Wandobjekt auf einer gerade kameraseits ausgeblendeten Wand (siehe
    // RoomShell) würde ohne seine tragende Wand freischwebend im Void
    // erscheinen — bleibt einfach unsichtbar, bis der User dorthin dreht.
    if (hiddenWalls.has(item.zone)) return null;
    const def = getRoomItem(item.key);
    if (!def) return null;
    const world = gridToWorld(item.zone, item.x, item.y, def.w, def.h);
    // Steht dieses Boden-Objekt gerade WIRKLICH auf einem Tisch (Pflicht via
    // mustStandOn ODER optional via canAlsoStandOn, siehe room-items.ts)?
    // Dann seine komplette Footprint gegen deskCells prüfen — nicht nur die
    // erste Zelle, sonst hebt sich ein großes Objekt schon durch eine
    // einzelne überlappende Tischecke fälschlich an.
    if (item.zone === "floor" && (def.mustStandOn === "desk" || def.canAlsoStandOn?.includes("desk"))) {
      const { w, h } = footprint(def, item.zone, item.rotation);
      let allOnDesk = true;
      for (let dx = 0; dx < w && allOnDesk; dx++) {
        for (let dy = 0; dy < h; dy++) {
          if (!deskCells.has(`${item.x + dx},${item.y + dy}`)) { allOnDesk = false; break; }
        }
      }
      if (allOnDesk) world.y += DESK_STAND_HEIGHT;
    }
    // Nutzer-Drehung (0-3 × 90°) kommt nur bei Boden-Objekten oben drauf —
    // Wand-Objekte bleiben an ihrer festen surfaceRotationY, sonst würden sie
    // aus der Wandebene herausklappen (siehe rotate() in RoomEditor.tsx).
    const rotY = surfaceRotationY(item.zone) + (item.zone === "floor" ? (item.rotation ?? 0) * (Math.PI / 2) : 0);
    return { item, def, world, rotY };
  }).filter((e): e is NonNullable<typeof e> => e !== null), [placed, hiddenWalls, deskCells]);

  return (
    <>
      {entries.map(({ item, def, world, rotY }) => {
        const selected = edit?.selectedId === item.id;
        // Trägt DIESES Möbelstück gerade das gehaltene Objekt (Tisch/Ablage
        // für ein mustStandOn:"desk"-Item wie einen Monitor, Regal für
        // "shelf")? Dann darf der Klick NICHT hier stehenbleiben — sonst
        // würde ein Klick auf den Tisch (um z.B. einen Monitor DARAUF zu
        // stellen) immer nur den Tisch selbst auswählen, weil sein Mesh
        // näher an der Kamera liegt als die unsichtbare Boden-Klickfläche
        // darunter (siehe EditLayer). Der Klick wird dann bewusst NICHT
        // gestoppt, damit er zur Klickfläche durchgereicht wird.
        const holdsGhost = (() => {
          if (!edit?.ghost) return false;
          const ghostDef = getRoomItem(edit.ghost.key);
          if (!ghostDef) return false;
          if (ghostDef.mustStandOn === "desk") return def.tags.includes("desk") || def.tags.includes("surface");
          if (ghostDef.mustStandOn === "shelf") return def.tags.includes("shelf") || def.tags.includes("trophy_shelf");
          return false;
        })();
        function handleClick(e: ThreeEvent<MouseEvent>) {
          if (edit) {
            if (holdsGhost) return; // durchreichen an die Klickfläche dahinter
            e.stopPropagation();
            edit.onSelect(item.id);
            return;
          }
          e.stopPropagation();
          if (def.interactive) onInteract(def.interactive, def.interactive === "crt" ? item.key : undefined);
        }
        function handlePointerDown(e: ThreeEvent<PointerEvent>) {
          if (!edit || holdsGhost) return;
          e.stopPropagation();
          edit.onGrab(item.id);
        }
        return (
          <group
            key={item.id} position={world} rotation={[0, rotY, 0]}
            onClick={handleClick} onPointerDown={handlePointerDown}
          >
            <group scale={selected ? 1.06 : 1}>
              <FurniturePrimitive def={def} />
            </group>
            {selected && (
              <mesh position={[0, def.h * 0.5, 0]}>
                <ringGeometry args={[Math.max(def.w, def.h) * 0.6, Math.max(def.w, def.h) * 0.68, 24]} />
                <meshBasicMaterial color="#5ee6ff" transparent opacity={0.5} toneMapped={false} />
              </mesh>
            )}
            {!selected && item.zone === "floor" && def.w === 1 && def.h === 1 && (
              <SmallItemMarker color={ACCENT_COLORS[def.accent]} />
            )}
          </group>
        );
      })}
    </>
  );
}

/**
 * Feste Position der Vitrine im Raum — kein Katalog-Platzierung (siehe
 * room-items.ts, "vitrine"-Eintrag: `interactive: "vitrine"` bleibt der
 * Ziel-Typ, aber das Objekt sitzt hier an einem festen Bühnenplatz statt im
 * frei belegbaren Raster, damit es in jedem Zimmer am selben Fleck steht).
 */
const VITRINE_MARKER = { zone: "floor" as RoomSurface, x: ROOM_SIZE.width - 2, y: 0, w: 2, h: 2 };

/**
 * Anklickbares Vitrinen-Objekt im Raum — ersetzt das frühere seitliche
 * VitrinePanel. Pulsierender Goldrahmen signalisiert Interaktivität (wie der
 * "atmende Rahmen" der alten SVG-Bühne, hier per useFrame statt CSS-Keyframe,
 * da innerhalb des Canvas kein CSS greift). Öffnet immer die Gesamtübersicht
 * (kein `slotIndex`) — das einzelne Anklicken je Trophäenfach gab es nur in
 * der SVG-Ansicht mit sichtbaren Einzel-Pedestalen.
 */
/**
 * Die Blender-Quelle exportiert "Glass1".."Glass6" mit einem regulär
 * opaken PBR-Material (kein Blend-Mode/Transmission gesetzt) — ohne diesen
 * Fix wirkt die Vitrine wie ein massiver dunkler Klotz statt einer
 * Glasvitrine. `Frame` bleibt unangetastet (fertig texturiertes PBR-Holz,
 * keine Transparenz nötig).
 */
function VitrineCabinet() {
  const { scene } = useGLTF("/models/vitrine_glass.glb");
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(obj => {
      if (!(obj instanceof Mesh)) return;
      if (!obj.name.toLowerCase().startsWith("glass")) return;
      const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
      if (!(src instanceof MeshStandardMaterial)) return;
      const glass = src.clone();
      glass.transparent = true;
      glass.opacity = 0.28;
      glass.roughness = 0.05;
      glass.metalness = 0;
      glass.color.set("#bfe4ff");
      glass.depthWrite = false;
      obj.material = glass;
    });
    return clone;
  }, [scene]);
  return <primitive object={cloned} />;
}

/**
 * Goldene Pokal-Silhouetten hinter dem Vitrinenglas — sonst wirkt die jetzt
 * tatsächlich transparente Vitrine leer, obwohl der User Pokale/Abzeichen
 * besitzt. Rein andeutend (Kelch-Form aus Kegel+Kugel+Fuß), keine 1:1-
 * Abbildung der 15 echten Fächer — bei bis zu 15 belegten Fächern wären
 * Einzelmodelle im Miniaturmaßstab ohnehin nicht unterscheidbar. Deutlich
 * größer/heller als der erste Versuch (der ging neben dem Glas-Look optisch
 * unter) plus ein eigenes warmes Punktlicht, damit der Inhalt auch ohne
 * Bloom-Schwelle klar als "da drin liegt was" erkennbar ist.
 */
function VitrineTrophies({ count }: { count: number }) {
  const shown = Math.min(count, 6);
  if (shown === 0) return null;
  const spacing = 1.75 / Math.max(shown - 1, 1);
  const startX = shown > 1 ? -1.75 / 2 : 0;
  return (
    <group>
      <pointLight position={[0, 1.1, 0.3]} color="#ffcf6b" intensity={1.2} distance={3} decay={2} />
      {Array.from({ length: shown }).map((_, i) => {
        const x = shown > 1 ? startX + i * spacing : 0;
        return (
          <group key={i} position={[x, 0.78, 0]}>
            {/* Kelch-Becher */}
            <mesh position={[0, 0.13, 0]}>
              <sphereGeometry args={[0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.3} roughness={0.25} metalness={0.7} />
            </mesh>
            {/* Henkel links/rechts */}
            {[-1, 1].map(side => (
              <mesh key={side} position={[side * 0.11, 0.13, 0]} rotation={[0, 0, side * 0.5]}>
                <torusGeometry args={[0.045, 0.012, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.1} roughness={0.3} metalness={0.6} />
              </mesh>
            ))}
            {/* Stiel */}
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.018, 0.032, 0.11, 10]} />
              <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.0} roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Sockel */}
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.055, 0.06, 0.04, 12]} />
              <meshStandardMaterial color="#7a5a2a" emissive="#7a5a2a" emissiveIntensity={0.5} roughness={0.5} metalness={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Runder OMA-Teppich mit Logo — festes Bühnenelement wie die Vitrine (siehe
 * VITRINE_MARKER oben): liegt exakt in der Bodenmitte jedes Zimmers, ist kein
 * Katalog-Platzierung mehr (siehe DEFAULT_PLACEMENTS in room-layout.ts) und
 * darf im Editor weder eingelagert noch verschoben werden.
 */
function CenterRug() {
  const def = getRoomItem("teppich_rund_logo");
  if (!def) return null;
  return (
    <group position={[ROOM_SIZE.width / 2, 0, ROOM_SIZE.depth / 2]}>
      <FurniturePrimitive def={def} />
    </group>
  );
}

function VitrineMarker({
  hiddenCount, filledCount, onClick,
}: { hiddenCount: number; filledCount: number; onClick: () => void }) {
  const world = gridToWorld(VITRINE_MARKER.zone, VITRINE_MARKER.x, VITRINE_MARKER.y, VITRINE_MARKER.w, VITRINE_MARKER.h);
  const ringRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.18;
    (ringRef.current.material as { opacity: number }).opacity = hovered ? 0.7 : pulse;
  });

  return (
    <group
      position={world}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <VitrineCabinet />
      <VitrineTrophies count={filledCount} />
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.1, 28]} />
        <meshBasicMaterial color="#ffcf6b" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      {hiddenCount > 0 && (
        <Html position={[0.65, 2.15, 0]} center distanceFactor={8} occlude={false}>
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-black/80 border border-amber-400/50 text-amber-300 text-[10px] font-bold">
            +{hiddenCount}
          </div>
        </Html>
      )}
    </group>
  );
}

function EditLayer({ edit, hiddenWalls }: { edit: EditHooks; hiddenWalls: ReadonlySet<RoomSurface> }) {
  const accent = edit.ghost ? ACCENT_COLORS[getRoomItem(edit.ghost.key)?.accent ?? "teal"] : "#5ee6ff";
  const [hover, setHover] = useState<{ zone: RoomSurface; x: number; y: number } | null>(null);
  // Nur Zellen auf gerade sichtbaren Wänden anbieten — sonst könnte man
  // "blind" auf eine ausgeblendete Wand droppen (siehe RoomShell/hiddenWalls).
  const visibleLegal = useMemo(
    () => edit.legal.filter(c => !hiddenWalls.has(c.zone)),
    [edit.legal, hiddenWalls],
  );

  function raycastToCell(surface: RoomSurface, e: ThreeEvent<PointerEvent>) {
    if (!edit.ghost) return;
    const { a, b } = worldToGrid(surface, e.point);
    // An der oberen/hinteren Zellkante ausrichten (nicht am Mittelpunkt), wie in room-layout.ts erwartet.
    const anchorA = Math.round(a - edit.ghost.w / 2);
    const anchorB = Math.round(b - edit.ghost.h / 2);
    const match = visibleLegal.find(c => c.zone === surface && c.x === anchorA && c.y === anchorB);
    setHover(match ? { zone: surface, x: match.x, y: match.y } : null);
  }

  return (
    <>
      {/* Klickflächen für Boden/Wände — nehmen Pointer-Events für Platzierung entgegen. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} position={[ROOM_SIZE.width / 2, 0, ROOM_SIZE.depth / 2]}
        onPointerMove={e => raycastToCell("floor", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "floor") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.depth]} />
      </mesh>
      <mesh
        position={[ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0]}
        onPointerMove={e => raycastToCell("wall_back", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_back") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.height]} />
      </mesh>
      <mesh
        rotation={[0, Math.PI / 2, 0]} position={[0, ROOM_SIZE.height / 2, ROOM_SIZE.depth / 2]}
        onPointerMove={e => raycastToCell("wall_side", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_side") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.depth, ROOM_SIZE.height]} />
      </mesh>
      {!hiddenWalls.has("wall_front") && (
        <mesh
          rotation={[0, Math.PI, 0]} position={[ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, ROOM_SIZE.depth]}
          onPointerMove={e => raycastToCell("wall_front", e)}
          onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_front") edit.onDrop(hover.zone, hover.x, hover.y); }}
          visible={false}
        >
          <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.height]} />
        </mesh>
      )}
      {!hiddenWalls.has("wall_right") && (
        <mesh
          rotation={[0, -Math.PI / 2, 0]} position={[ROOM_SIZE.width, ROOM_SIZE.height / 2, ROOM_SIZE.depth / 2]}
          onPointerMove={e => raycastToCell("wall_right", e)}
          onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_right") edit.onDrop(hover.zone, hover.x, hover.y); }}
          visible={false}
        >
          <planeGeometry args={[ROOM_SIZE.depth, ROOM_SIZE.height]} />
        </mesh>
      )}

      {/* Freie Zellen leuchten aus. */}
      {edit.ghost && visibleLegal.map((c, i) => (
        <CellHighlight
          key={i} surface={c.zone} x={c.x} y={c.y} w={edit.ghost!.w} h={edit.ghost!.h}
          color={accent} opacity={hover?.zone === c.zone && hover.x === c.x && hover.y === c.y ? 0.55 : 0.22}
        />
      ))}

      {/* Ghost-Vorschau des angehobenen Stücks am Hover-Ziel. `edit.ghost.w/h`
          sind bereits die (bei Bodendrehung getauschte) Footprint-Maße —
          dieselben, mit denen legalCells() die Zelle validiert hat, sonst
          sitzt die Vorschau am falschen Mittelpunkt oder zeigt die falsche
          Ausrichtung. */}
      {edit.ghost && hover && (() => {
        const def = getRoomItem(edit.ghost.key);
        if (!def) return null;
        const world = gridToWorld(hover.zone, hover.x, hover.y, edit.ghost.w, edit.ghost.h);
        const rotY = surfaceRotationY(hover.zone)
          + (hover.zone === "floor" ? edit.ghost.rotation * (Math.PI / 2) : 0);
        return (
          <group position={world} rotation={[0, rotY, 0]}>
            <FurniturePrimitive def={def} />
          </group>
        );
      })()}
    </>
  );
}

/**
 * Berechnet den Orthografie-Zoom so, dass der komplette Raum (alle 8
 * Eckpunkte der Bounding-Box) exakt in die aktuelle Canvas-Größe passt —
 * statt eines fest verdrahteten Zoom-Werts, der nur zufällig zu EINER
 * Container-Breite passt und auf schmalen/breiten Bildschirmen entweder
 * abschneidet oder unnötig viel Leerraum lässt. Reagiert auf Resize über
 * `useThree`s `size` (Canvas-Pixelgröße), reprojiziert die Eckpunkte auf die
 * tatsächlichen Kamera-Achsen (robust gegenüber Kamerawinkel-Änderungen,
 * ohne eine geschlossene Formel für die isometrische Projektion zu brauchen).
 */
/**
 * Wie stark reingezoomt wird, wenn ein Monitor/die Vitrine angeklickt wird
 * (siehe `focused`-Prop) — multipliziert auf den normalen Einpass-Zoom.
 * `virtuell reinzoomen` statt eines Popups, das abrupt über der Bühne
 * aufreißt: die Kamera fährt tatsächlich näher heran, während das
 * (unverändert bestehende) Profil-/Vitrinen-Modal sich öffnet.
 */
const FOCUS_ZOOM_BOOST = 3.2;

function FitCamera({
  camPos, focused,
}: { camPos: readonly [number, number, number]; focused: boolean }) {
  const { size, camera } = useThree();
  const currentZoom = useRef<number | null>(null);

  const zoom = useMemo(() => {
    const eye = new Vector3(...camPos);
    const forward = ROOM_CENTER.clone().sub(eye).normalize();
    const worldUp = new Vector3(0, 1, 0);
    const right = new Vector3().crossVectors(forward, worldUp).normalize();
    const up = new Vector3().crossVectors(right, forward).normalize();

    const { width, height, depth } = ROOM_SIZE;
    const corners = [
      [0, 0, 0], [width, 0, 0], [0, height, 0], [0, 0, depth],
      [width, height, 0], [width, 0, depth], [0, height, depth], [width, height, depth],
    ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y, z] of corners) {
      const rel = new Vector3(x, y, z).sub(eye);
      const px = rel.dot(right), py = rel.dot(up);
      minX = Math.min(minX, px); maxX = Math.max(maxX, px);
      minY = Math.min(minY, py); maxY = Math.max(maxY, py);
    }
    const margin = 0.86; // etwas Luft rundherum, statt bündig am Canvas-Rand zu clippen
    return Math.min(size.width / (maxX - minX), size.height / (maxY - minY)) * margin;
  }, [size.width, size.height, camPos]);

  // Beim allerersten Frame direkt auf den Ziel-Zoom springen (kein sichtbares
  // Auf-/Abschwellen beim Laden), danach für den Fokus-Zoom sanft interpolieren.
  useEffect(() => { currentZoom.current = null; }, [zoom]);

  /* eslint-disable react-hooks/immutability -- Three.js-Objekt (R3F `camera`),
     keine React-Hook-Semantik: direktes Mutieren + updateProjectionMatrix()
     pro Frame ist der von R3F selbst dokumentierte Animationsweg. */
  useFrame((_, delta) => {
    const cam = camera as ThreeOrthographicCamera;
    if (typeof cam.zoom !== "number") return;
    const target = zoom * (focused ? FOCUS_ZOOM_BOOST : 1);
    if (currentZoom.current === null) {
      currentZoom.current = target;
    } else {
      // Exponentielles Einschwingen (framerate-unabhängig) statt linearem
      // Lerp — wirkt bei variabler Framerate gleich "weich".
      const speed = 6;
      currentZoom.current += (target - currentZoom.current) * Math.min(1, delta * speed);
    }
    cam.zoom = currentZoom.current;
    cam.updateProjectionMatrix();
  });
  /* eslint-enable react-hooks/immutability */

  return null;
}

function RoomCanvas({
  state, edit, onInteract, hiddenVitrineCount, filledVitrineCount, level, rotation, lampOn, blindsClosed,
  focusTarget,
}: Pick<Props, "state" | "edit" | "onInteract"> & {
  hiddenVitrineCount: number; filledVitrineCount: number; level: number; rotation: number;
  lampOn: boolean; blindsClosed: boolean; focusTarget: InteractTarget | null;
}) {
  const camPos = useMemo(() => {
    const d = Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.4;
    // Ursprüngliche feste Eckansicht war exakt (+d, +d) — das entspricht 45°
    // um die Raummitte. `rotation` verschiebt diesen Winkel (voller 360°-Bereich,
    // kein Clamp mehr), der horizontale Radius (d·√2) und die Höhe (d·0.82)
    // bleiben unverändert, damit der Zoom/Rahmen-Look beim Drehen erhalten bleibt.
    const angle = Math.PI / 4 + rotation;
    const horizontalRadius = d * Math.SQRT2;
    return [
      ROOM_CENTER.x + horizontalRadius * Math.cos(angle),
      d * 0.82,
      ROOM_CENTER.z + horizontalRadius * Math.sin(angle),
    ] as const;
  }, [rotation]);

  /**
   * Welche zwei der vier Wände gerade zwischen Kamera und Rauminnerem stehen
   * würden (siehe ISO_GRID/RoomShell) — die werden ausgeblendet, damit man
   * bei voller 360°-Drehung immer freie Sicht ins Zimmer behält. Reiner
   * Vorzeichenvergleich zur Raummitte: Kamera auf der +Z-Seite → die NÄHERE
   * der beiden Z-Wände (wall_front, an Z=depth) blockiert die Sicht.
   */
  const hiddenWalls = useMemo(() => {
    const hidden = new Set<RoomSurface>();
    hidden.add(camPos[2] >= ROOM_CENTER.z ? "wall_front" : "wall_back");
    hidden.add(camPos[0] >= ROOM_CENTER.x ? "wall_right" : "wall_side");
    return hidden;
  }, [camPos]);

  return (
    // `shadows` aktiviert Three.js' Shadow-Map-Pipeline — RoomLighting
    // wirft jetzt ein echtes Richtungslicht mit `castShadow`, Boden/Wände
    // empfangen (`receiveShadow` in RoomShell), Möbel werfen (`castShadow`
    // in FurniturePrimitive.tsx). `ContactShadows` bleibt zusätzlich als
    // weicher Kontaktschatten direkt unter jedem Objekt (rein optisch,
    // unabhängig von der echten Lichtquelle) — beides zusammen ergibt
    // sowohl harte Wurf- als auch weiche Kontaktschatten.
    <Canvas dpr={[1, 1.5]} frameloop="always" shadows>
      <OrthographicCamera
        makeDefault
        position={camPos}
        near={0.1}
        far={100}
        onUpdate={cam => cam.lookAt(ROOM_CENTER)}
      />
      <FitCamera camPos={camPos} focused={focusTarget === "crt" || focusTarget === "vitrine"} />
      <RoomLighting blindsClosed={blindsClosed} />
      <RoomShell level={level} hiddenWalls={hiddenWalls} />
      {/* An der Rückwand bzw. Seitenwand montiert — ohne die Sichtbarkeits-
          Prüfung würden sie freischwebend im leeren Raum hängen, sobald ihre
          Wand kamerabedingt ausgeblendet ist. */}
      {/* Das Licht selbst bleibt unabhängig von hiddenWalls — es kommt von
          draußen, egal ob man die Rückwand gerade sieht (siehe WindowLight
          in RoomLevelFixtures.tsx). Nur die sichtbare Geometrie wird
          ausgeblendet, wenn die Kamera gerade wegdreht. */}
      <WindowLight level={level} closed={blindsClosed} />
      {!hiddenWalls.has("wall_back") && <RoomWindow3D level={level} closed={blindsClosed} />}
      {!hiddenWalls.has("wall_side") && <EntranceDoor3D level={level} />}
      <CeilingLamp3D level={level} on={lampOn} />
      <CenterRug />
      <PlacedFurniture placed={state.placed} edit={edit} onInteract={onInteract} hiddenWalls={hiddenWalls} />
      {/* Im Bearbeiten-Modus nicht anklickbar — sie lässt sich ohnehin nicht
          verschieben, ein Klick soll dort nicht mitten in der Möbel-Auswahl
          ein Modal aufreißen (siehe altes VitrinePanel-Verhalten). */}
      {!edit && (
        <VitrineMarker hiddenCount={hiddenVitrineCount} filledCount={filledVitrineCount} onClick={() => onInteract("vitrine")} />
      )}
      {edit && <EditLayer edit={edit} hiddenWalls={hiddenWalls} />}
      <ContactShadows
        position={[ROOM_SIZE.width / 2, 0.01, ROOM_SIZE.depth / 2]}
        opacity={0.55} scale={Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.2}
        blur={2.4} far={4}
      />
      <EffectComposer>
        {/*
         * Schwelle bewusst höher als die leicht-emissiven Wand-/Möbelflächen
         * (emissiveIntensity 0.35–0.55, siehe RoomShell/FurniturePrimitive) —
         * sonst glüht der halbe Raum mit, statt nur die echten Neon-Akzente
         * (Deckenkante, Monitor-Screens, Lampen — alle `toneMapped={false}`
         * und deutlich heller) hervorzuheben.
         */}
        <Bloom intensity={0.7} luminanceThreshold={0.65} luminanceSmoothing={0.25} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

/** Radiant Kamera-Drehung pro Pixel horizontaler Zeigerbewegung. */
const DRAG_SENSITIVITY = 0.008;

export default function RoomStage3D({
  state, vitrine, onInteract, edit, focusTarget = null, levelThresholds = ROOM_LEVEL_THRESHOLDS,
}: Props) {
  const level = roomLevel(state.placed, state.stored, levelThresholds);
  const filledVitrineCount = vitrine.slots.filter(Boolean).length;
  const [rotation, setRotation] = useState(0);
  // Unclamped (voller 360°-Bereich) — die Raum-Shell blendet dynamisch die
  // zwei kamerafernen Wände ein (siehe hiddenWalls in RoomCanvas), es gibt
  // also keinen Winkel mehr, an dem man "an der Wand vorbei ins Nichts" sähe.
  const drag = useRef<{ pointerId: number; startX: number; startRotation: number; captured: boolean } | null>(null);
  // Hinweis "Ziehen zum Drehen" — nur bis zur ersten tatsächlichen Drehung
  // sichtbar, damit erfahrene User nicht dauerhaft ein Overlay im Weg haben.
  const [hasRotated, setHasRotated] = useState(false);
  // Reine Anzeige-Umschalter (kein Katalog-/DB-Zustand, siehe CeilingLamp3D/
  // RoomWindow3D) — lassen User die Lichtverhältnisse durchprobieren, um z.B.
  // Neon-/LED-Deko bei ausgeschalteter Deckenlampe und geschlossenem Rolladen
  // besser zur Geltung kommen zu sehen.
  const [lampOn, setLampOn] = useState(true);
  const [blindsClosed, setBlindsClosed] = useState(false);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Nur der primäre Zeiger (linke Maustaste / erster Touch-Punkt) — ein
    // zweiter Finger (Pinch-Zoom-Geste o.ä.) soll die Drehung nicht kapern.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // NICHT sofort `setPointerCapture` aufrufen: das würde ALLE folgenden
    // Pointer-Events (inkl. des Klicks) auf dieses Div umleiten, bevor sie
    // den darunterliegenden R3F-Canvas erreichen — Möbel-Platzierung/Klicks
    // auf Monitor/Vitrine würden dadurch komplett aufhören zu funktionieren,
    // weil R3F's eigenes Raycasting nie mehr die pointerup/click-Events sieht
    // (Pointer Capture liefert sie stattdessen direkt an dieses Div, ohne
    // dass sie den Canvas als Ziel/Bubble-Pfad durchlaufen). Erst wenn
    // tatsächlich gezogen wird (siehe handlePointerMove), wird gekapert —
    // ein einfacher Tap bleibt dadurch ein normaler Klick im Canvas.
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startRotation: rotation, captured: false };
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.captured && Math.abs(dx) > 4) {
      drag.current.captured = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setHasRotated(true);
    }
    if (drag.current.captured) {
      setRotation(drag.current.startRotation + dx * DRAG_SENSITIVITY);
    }
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== e.pointerId) return;
    if (drag.current.captured) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* schon freigegeben */ }
    }
    drag.current = null;
  }

  return (
    <div
      title={`Zimmer-Stufe ${level + 1}`}
      className="relative w-full aspect-[6/5] overflow-hidden rounded-2xl bg-[#141018] touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <RoomCanvas
        state={state} edit={edit} onInteract={onInteract}
        hiddenVitrineCount={vitrine.hiddenCount} filledVitrineCount={filledVitrineCount} level={level}
        rotation={rotation} lampOn={lampOn} blindsClosed={blindsClosed} focusTarget={focusTarget}
      />
      {!hasRotated && !edit && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 border border-white/10 text-white/70 text-[11px] pointer-events-none select-none">
          <span aria-hidden>↔</span> Ziehen, um die Ansicht zu drehen
        </div>
      )}
      <div className="absolute top-3 right-3 flex gap-1.5 pointer-events-none">
        <button
          type="button"
          aria-label={lampOn ? "Deckenlampe ausschalten" : "Deckenlampe einschalten"}
          onClick={e => { e.stopPropagation(); setLampOn(v => !v); }}
          onPointerDown={e => e.stopPropagation()}
          className={`pointer-events-auto flex items-center gap-1 px-2.5 h-8 rounded-full border text-[11px] transition-colors ${
            lampOn
              ? "bg-amber-400/20 border-amber-300/40 text-amber-200"
              : "bg-black/55 border-white/10 text-white/60 hover:bg-black/70"
          }`}
        >
          <span aria-hidden>{lampOn ? "●" : "○"}</span> Lampe
        </button>
        <button
          type="button"
          aria-label={blindsClosed ? "Rolladen öffnen" : "Rolladen schließen"}
          onClick={e => { e.stopPropagation(); setBlindsClosed(v => !v); }}
          onPointerDown={e => e.stopPropagation()}
          className={`pointer-events-auto flex items-center gap-1 px-2.5 h-8 rounded-full border text-[11px] transition-colors ${
            blindsClosed
              ? "bg-sky-400/20 border-sky-300/40 text-sky-200"
              : "bg-black/55 border-white/10 text-white/60 hover:bg-black/70"
          }`}
        >
          <span aria-hidden>{blindsClosed ? "▤" : "▢"}</span> Rolladen
        </button>
      </div>
    </div>
  );
}

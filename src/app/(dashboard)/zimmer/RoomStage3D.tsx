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
import { Vector3, Mesh, MeshStandardMaterial, type OrthographicCamera as ThreeOrthographicCamera } from "three";
import { useGLTF } from "@react-three/drei";
import {
  ROOM_SIZE, ROOM_CENTER, SHELL_COLORS, ACCENT_COLORS, WALL_THICKNESS,
  WALL_COLOR_BY_KEY, FLOOR_COLOR_BY_KEY, shadeHex,
  gridToWorld, surfaceRotationY, worldToGrid, type RoomSurface,
} from "@/lib/room-3d";
import { getRoomItem } from "@/lib/room-items";
import { roomLevel, type PlacedItem, type RoomState, type RoomSurface as LayoutSurface } from "@/lib/room-layout";
import type { VitrineItem } from "@/lib/room-vitrine";
import { FurniturePrimitive } from "./furniture/FurniturePrimitive";
import { RoomWindow3D, CeilingLamp3D } from "./RoomLevelFixtures";

export type InteractTarget = "crt" | "vitrine" | "jobboard";

export interface EditHooks {
  selectedId: string | null;
  legal: { zone: LayoutSurface; x: number; y: number }[];
  ghost: { w: number; h: number; key: string } | null;
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
}

function RoomShell({
  wallpaperKey, floorKey, hiddenWalls,
}: { wallpaperKey: string; floorKey: string; hiddenWalls: ReadonlySet<RoomSurface> }) {
  const { width, depth, height } = ROOM_SIZE;
  const wallColor = WALL_COLOR_BY_KEY[wallpaperKey] ?? SHELL_COLORS.wallBack;
  const floorColor = FLOOR_COLOR_BY_KEY[floorKey] ?? SHELL_COLORS.floor;
  const trim = "#d8d2ea";
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
      <mesh position={[width / 2, -WALL_THICKNESS / 2, depth / 2]}>
        <boxGeometry args={[width + WALL_THICKNESS * 2, WALL_THICKNESS, depth + WALL_THICKNESS * 2]} />
        <meshStandardMaterial color={floorColor} emissive={floorColor} emissiveIntensity={0.55} roughness={0.85} />
      </mesh>
      {!hiddenWalls.has("wall_back") && (
        <mesh position={[width / 2, height / 2, -WALL_THICKNESS / 2]}>
          <boxGeometry args={[width, height, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallColor} emissive={wallColor} emissiveIntensity={0.55} roughness={0.9} />
        </mesh>
      )}
      {!hiddenWalls.has("wall_front") && (
        <mesh position={[width / 2, height / 2, depth + WALL_THICKNESS / 2]}>
          <boxGeometry args={[width, height, WALL_THICKNESS]} />
          <meshStandardMaterial color={wallColor} emissive={wallColor} emissiveIntensity={0.55} roughness={0.9} />
        </mesh>
      )}
      {!hiddenWalls.has("wall_side") && (
        <mesh position={[-WALL_THICKNESS / 2, height / 2, depth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial
            color={shadeHex(wallColor, 0.72)} emissive={shadeHex(wallColor, 0.72)} emissiveIntensity={0.55}
            roughness={0.9}
          />
        </mesh>
      )}
      {!hiddenWalls.has("wall_right") && (
        <mesh position={[width + WALL_THICKNESS / 2, height / 2, depth / 2]}>
          <boxGeometry args={[WALL_THICKNESS, height, depth]} />
          <meshStandardMaterial
            color={shadeHex(wallColor, 0.72)} emissive={shadeHex(wallColor, 0.72)} emissiveIntensity={0.55}
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

function NeonEdge() {
  const { width, depth, height } = ROOM_SIZE;
  return (
    <group>
      <mesh position={[width / 2, height - 0.05, 0.05]}>
        <boxGeometry args={[width * 0.96, 0.08, 0.08]} />
        <meshStandardMaterial color="#5ee6ff" emissive="#5ee6ff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.05, height - 0.05, depth / 2]}>
        <boxGeometry args={[depth * 0.94, 0.08, 0.08]} />
        <meshStandardMaterial color="#c07bff" emissive="#c07bff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RoomLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#6a63a0", "#1c1830", 1.1]} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} color="#fff2e0" />
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

function PlacedFurniture({
  placed, edit, onInteract, hiddenWalls,
}: { placed: PlacedItem[]; edit?: EditHooks; onInteract: Props["onInteract"]; hiddenWalls: ReadonlySet<RoomSurface> }) {
  const entries = useMemo(() => placed.map(item => {
    // Ein Wandobjekt auf einer gerade kameraseits ausgeblendeten Wand (siehe
    // RoomShell) würde ohne seine tragende Wand freischwebend im Void
    // erscheinen — bleibt einfach unsichtbar, bis der User dorthin dreht.
    if (hiddenWalls.has(item.zone)) return null;
    const def = getRoomItem(item.key);
    if (!def) return null;
    const world = gridToWorld(item.zone, item.x, item.y, def.w, def.h);
    const rotY = surfaceRotationY(item.zone);
    return { item, def, world, rotY };
  }).filter((e): e is NonNullable<typeof e> => e !== null), [placed, hiddenWalls]);

  return (
    <>
      {entries.map(({ item, def, world, rotY }) => {
        const selected = edit?.selectedId === item.id;
        function handleClick(e: ThreeEvent<MouseEvent>) {
          e.stopPropagation();
          if (edit) { edit.onSelect(item.id); return; }
          if (def.interactive) onInteract(def.interactive, def.interactive === "crt" ? item.key : undefined);
        }
        function handlePointerDown(e: ThreeEvent<PointerEvent>) {
          if (!edit) return;
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
 * Kleine goldene Pokal-Silhouetten hinter dem Vitrinenglas — sonst wirkt die
 * jetzt tatsächlich transparente Vitrine leer, obwohl der User Pokale/Abzeichen
 * besitzt. Rein andeutend (Kelch-Form aus Kegel+Kugel), keine 1:1-Abbildung
 * der 15 echten Fächer — bei bis zu 15 belegten Fächern wären Einzelmodelle
 * im Miniaturmaßstab ohnehin nicht unterscheidbar.
 */
function VitrineTrophies({ count }: { count: number }) {
  const shown = Math.min(count, 6);
  if (shown === 0) return null;
  const spacing = 1.7 / Math.max(shown - 1, 1);
  const startX = shown > 1 ? -1.7 / 2 : 0;
  return (
    <group>
      {Array.from({ length: shown }).map((_, i) => {
        const x = shown > 1 ? startX + i * spacing : 0;
        return (
          <group key={i} position={[x, 0.78, 0]}>
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[0.07, 0.1, 12]} />
              <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={0.9} roughness={0.3} metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <cylinderGeometry args={[0.015, 0.03, 0.08, 8]} />
              <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={0.7} roughness={0.3} metalness={0.6} />
            </mesh>
          </group>
        );
      })}
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
      <mesh position={[0, 1.95, 0]}>
        <circleGeometry args={[0.28, 20]} />
        <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
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

      {/* Ghost-Vorschau des angehobenen Stücks am Hover-Ziel. */}
      {edit.ghost && hover && (() => {
        const def = getRoomItem(edit.ghost.key);
        if (!def) return null;
        const world = gridToWorld(hover.zone, hover.x, hover.y, def.w, def.h);
        const rotY = surfaceRotationY(hover.zone);
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
function FitCamera({ camPos }: { camPos: readonly [number, number, number] }) {
  const { size, camera } = useThree();

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

  useEffect(() => {
    const cam = camera as ThreeOrthographicCamera;
    if (typeof cam.zoom !== "number") return;
    // Three.js-Objekte sind bewusst mutable (kein React-State) — das direkte
    // Setzen von camera.zoom + updateProjectionMatrix() ist der von R3F selbst
    // dokumentierte Weg, siehe auch drei's eigene Kamera-Helper.
    // eslint-disable-next-line react-hooks/immutability -- Three.js-Objekt, keine React-Hook-Semantik
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
  }, [zoom, camera]);

  return null;
}

function RoomCanvas({
  state, edit, onInteract, hiddenVitrineCount, filledVitrineCount, level, rotation,
}: Pick<Props, "state" | "edit" | "onInteract"> & {
  hiddenVitrineCount: number; filledVitrineCount: number; level: number; rotation: number;
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
    // Kein `shadows`-Prop: kein Mesh setzt castShadow/receiveShadow, das
    // Shadow-Map-System bliebe reiner toter Overhead — ContactShadows bakt
    // den Bodenschatten unabhängig davon in einem eigenen Offscreen-Render.
    <Canvas dpr={[1, 1.5]} frameloop="always">
      <OrthographicCamera
        makeDefault
        position={camPos}
        near={0.1}
        far={100}
        onUpdate={cam => cam.lookAt(ROOM_CENTER)}
      />
      <FitCamera camPos={camPos} />
      <RoomLighting />
      <RoomShell wallpaperKey={state.wallpaperKey} floorKey={state.floorKey} hiddenWalls={hiddenWalls} />
      <NeonEdge />
      {/* An der Rückwand montiert — ohne sie würde es freischwebend im
          leeren Raum hängen, sobald diese Wand kamerabedingt ausgeblendet ist. */}
      {!hiddenWalls.has("wall_back") && <RoomWindow3D level={level} />}
      <CeilingLamp3D level={level} />
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

export default function RoomStage3D({ state, vitrine, onInteract, edit }: Props) {
  const level = roomLevel(state.placed);
  const filledVitrineCount = vitrine.slots.filter(Boolean).length;
  const [rotation, setRotation] = useState(0);
  // Unclamped (voller 360°-Bereich) — die Raum-Shell blendet dynamisch die
  // zwei kamerafernen Wände ein (siehe hiddenWalls in RoomCanvas), es gibt
  // also keinen Winkel mehr, an dem man "an der Wand vorbei ins Nichts" sähe.
  const drag = useRef<{ pointerId: number; startX: number; startRotation: number } | null>(null);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Nur der primäre Zeiger (linke Maustaste / erster Touch-Punkt) — ein
    // zweiter Finger (Pinch-Zoom-Geste o.ä.) soll die Drehung nicht kapern.
    if (e.button !== 0 && e.pointerType === "mouse") return;
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startRotation: rotation };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    setRotation(drag.current.startRotation + dx * DRAG_SENSITIVITY);
  }
  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
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
        rotation={rotation}
      />
    </div>
  );
}

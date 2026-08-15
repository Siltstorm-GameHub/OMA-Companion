"use client";

import { useEffect, useRef, useState } from "react";
import { getRoomItem } from "@/lib/room-items";
import { CELL, roomLevel, type PlacedItem, type RoomState, type RoomSurface } from "@/lib/room-layout";
import {
  ISO_GRID, ISO_STAGE, surfaceToScreen, surfaceQuad, quadToPoints, depthKey,
  screenToFloor, screenToWallBack, screenToWallSide, wallBackToScreen, surfacePatternTransform,
} from "@/lib/room-iso";
import { CATEGORY_CONFIG, GENRE_CONFIG } from "@/lib/wanderpocal";
import { POKAL_CATEGORY_IMAGE } from "@/lib/pokal";
import type { VitrineBadge, VitrineTrophy } from "@/lib/room-profile-data";
import type { Pokal } from "@prisma/client";
import RoomItemSprite from "./RoomItemSprite";
import { VITRINE_SLOTS } from "./sprites";
import { cn } from "@/lib/utils";

export type InteractTarget = "crt" | "vitrine" | "jobboard";

export interface EditHooks {
  /** Aktuell angehobenes Möbelstück (aus dem Raum oder aus dem Lager). */
  selectedId: string | null;
  /** Erlaubte Ankerzellen für das angehobene Möbelstück. */
  legal: { zone: RoomSurface; x: number; y: number }[];
  /** Vorschau-Größe des angehobenen Stücks in Zellen. */
  ghost: { w: number; h: number; key: string } | null;
  /** Antippen: wählt an, ein zweites Antippen wählt wieder ab. */
  onSelect: (id: string) => void;
  /** Ziehen mit der Maus: wählt an, ohne je abzuwählen. */
  onGrab:   (id: string) => void;
  onDrop:   (zone: RoomSurface, x: number, y: number) => void;
}

/** Laufende Maus-Ziehbewegung. Auf Touch bewusst nicht aktiv. */
interface DragState {
  id: string;
  /** Greifpunkt innerhalb des Möbelstücks, in SVG-Einheiten. */
  dx: number;
  dy: number;
  /** Aktuell angepeilte Ankerzelle (bleibt auf derselben Fläche wie beim Greifen). */
  x: number;
  y: number;
  valid: boolean;
}

interface Props {
  state:     RoomState;
  ownerName: string;
  vitrine: {
    pokale:      Pokal[];
    pokaleTotal: number;
    badges:      VitrineBadge[];
    trophies:    VitrineTrophy[];
  };
  /**
   * `itemKey` ist nur bei `target === "crt"` gesetzt — RoomView reicht ihn an
   * CrtProfileModal weiter, damit dessen Rahmen wie GENAU DER angeklickte
   * Monitor aussieht (Röhre, Flachbildschirm oder 144Hz), nicht immer wie
   * die Röhre.
   */
  onInteract: (target: InteractTarget, itemKey?: string) => void;
  /** Gesetzt = Bearbeiten-Modus: jedes Möbelstück ist anwählbar statt interaktiv. */
  edit?: EditHooks;
}

/**
 * Visueller Höhenversatz für Objekte mit mustStandOn:"desk" (Monitore & Co.):
 * sie teilen sich die Boden-Grundfläche (x,y) mit dem Tisch (siehe
 * validatePlacement in room-layout.ts), stehen aber sichtbar AUF ihm. Rein
 * kosmetisch — reine Anzeigesache, fließt nicht in Platzierung/Speicherung
 * ein. Grob an der Höhe eines Schreibtisches orientiert (ein WALL_UNIT).
 */
const DESK_LIFT = CELL;

export default function RoomStage({ state, ownerName, vitrine, onInteract, edit }: Props) {
  const [hover, setHover] = useState<{ zone: RoomSurface; x: number; y: number } | null>(null);

  // ── Bildschirm-Zoom: "in den Monitor reinzoomen" beim Anklicken ───────
  // Ein kurzer Punch-in auf den Klickpunkt, bevor sich das Profil-Popup
  // darüberlegt — rein kosmetisch, läuft unabhängig vom Modal-Zustand und
  // setzt sich nach der Animation von selbst zurück.
  const [screenZoom, setScreenZoom] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Vitrinen-Höhe: exakt an die gerenderte Höhe der Bühne angleichen ──
  // ResizeObserver misst die TATSÄCHLICHE Pixel-Höhe der Bühne direkt und
  // reicht sie der Vitrine als festen Wert durch — deterministisch,
  // unabhängig von Flex-Stretch-Timing (siehe VitrinePanel).
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageHeight, setStageHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = stageWrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h) setStageHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function zoomIntoScreen(e: React.MouseEvent | React.KeyboardEvent) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = "clientX" in e ? e.clientX : rect.left + rect.width / 2;
    const clientY = "clientY" in e ? e.clientY : rect.top + rect.height / 2;
    const px = ((clientX - rect.left) / rect.width) * 100;
    const py = ((clientY - rect.top) / rect.height) * 100;
    setScreenZoom({ x: px, y: py });
    window.setTimeout(() => setScreenZoom(null), 500);
  }

  // ── Maus-Ziehen (Desktop-Zusatz zum Antippen) ─────────────────────────
  // Touch bleibt bewusst außen vor: Antippen funktioniert dort schon und
  // Ziehen auf einer vollbreiten Fläche kollidiert mit dem Seiten-Scroll.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragMovedRef    = useRef(false);
  const suppressClickRef = useRef(false);

  function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  /** Bildschirmpunkt → Rasterzelle, je nach Fläche über die passende Umkehrformel. */
  function screenToCell(zone: RoomSurface, sx: number, sy: number): { a: number; b: number } {
    if (zone === "floor")     { const { x, z } = screenToFloor(sx, sy);    return { a: x, b: z }; }
    if (zone === "wall_back") { const { x, y } = screenToWallBack(sx, sy); return { a: x, b: y }; }
    const { z, y } = screenToWallSide(sx, sy);
    return { a: z, b: y };
  }

  // Die Vitrine ist kein Katalog-Platzierungsobjekt mehr, sondern ein festes
  // Bühnenelement (siehe VitrinePanel unten) — ältere `placed`-Zeilen aus der
  // Zeit davor (schon materialisierte Zimmer) werden hier defensiv
  // rausgefiltert, damit sie nicht doppelt gerendert werden.
  //
  // Tiefensortierung (Painter's Algorithm): Rückwand zuerst, dann Seitenwand,
  // dann Boden-Objekte von hinten nach vorne (siehe depthKey in room-iso.ts) —
  // ersetzt die alte simple y-Sortierung der Frontalansicht.
  const items = [...state.placed.filter(p => p.key !== "vitrine")]
    .sort((a, b) => depthKey(a.zone, a.x, a.y) - depthKey(b.zone, b.x, b.y));

  // Fenster und Deckenlampe werten sich mit der Einrichtung automatisch auf
  // (siehe room-layout.ts, roomLevel) — reagiert live auf `state.placed`,
  // funktioniert also unverändert auch im Editor mit dem Entwurfs-Layout.
  const level = roomLevel(state.placed);

  /** Bildschirm-Ankerpunkt eines Items: die UNTERKANTE MITTIG seiner
   *  Grundfläche — Boden-Objekte an der Vorderkante ihres Footprints,
   *  Wand-Objekte an ihrer untersten Kante. Monitore & Co. (mustStandOn:
   *  "desk") bekommen zusätzlich den kosmetischen DESK_LIFT nach oben. */
  function anchorOf(item: PlacedItem, def: ReturnType<typeof getRoomItem>): { x: number; y: number } {
    if (!def) return { x: 0, y: 0 };
    const isFloor = item.zone === "floor";
    const a = item.x + def.w / 2;
    const b = isFloor ? item.y + def.h : item.y;
    const p = surfaceToScreen(item.zone, a, b);
    if (isFloor && def.mustStandOn === "desk") return { x: p.x, y: p.y - DESK_LIFT };
    return p;
  }

  function renderItem(item: PlacedItem) {
    const def = getRoomItem(item.key);
    if (!def) return null;
    const w = def.w * CELL, h = def.h * CELL;

    // ── Bearbeiten: jedes Möbelstück ist anwählbar (Tap) oder ziehbar (Maus) ──
    if (edit) {
      const isSelected  = edit.selectedId === item.id;
      const isDragging  = drag?.id === item.id;
      const shownItem: PlacedItem = isDragging ? { ...item, x: drag!.x, y: drag!.y } : item;
      const anchor = anchorOf(shownItem, def);
      const x = anchor.x - w / 2, y = anchor.y - h;

      return (
        <g
          key={item.id}
          className={cn(
            "room-hit",
            edit.selectedId && !isSelected && !isDragging && "room-dimmed",
            isDragging && !drag!.valid && "opacity-60",
          )}
          role="button"
          tabIndex={0}
          aria-label={`${def.label} auswählen oder ziehen`}
          aria-pressed={isSelected}
          onClick={() => {
            if (suppressClickRef.current) { suppressClickRef.current = false; return; }
            edit.onSelect(item.id);
          }}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); edit.onSelect(item.id); }
          }}
          onPointerDown={e => {
            if (e.pointerType !== "mouse") return;
            const svg = e.currentTarget.ownerSVGElement;
            if (!svg) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const origin = anchorOf(item, def);
            const p = svgPoint(svg, e.clientX, e.clientY);
            dragMovedRef.current = false;
            edit.onGrab(item.id);
            setDrag({ id: item.id, dx: p.x - origin.x, dy: p.y - origin.y, x: item.x, y: item.y, valid: true });
          }}
          onPointerMove={e => {
            if (e.pointerType !== "mouse") return;
            const svg = e.currentTarget.ownerSVGElement;
            if (!svg) return;
            setDrag(current => {
              if (!current || current.id !== item.id) return current;
              const p = svgPoint(svg, e.clientX, e.clientY);
              const grid = ISO_GRID[item.zone];
              const { a, b } = screenToCell(item.zone, p.x - current.dx, p.y - current.dy);
              let cellX = Math.round(a), cellY = Math.round(b);
              cellX = Math.max(0, Math.min(grid.cols - def.w, cellX));
              cellY = Math.max(0, Math.min(grid.rows - def.h, cellY));
              if (cellX !== current.x || cellY !== current.y) dragMovedRef.current = true;
              const isOriginal = cellX === item.x && cellY === item.y;
              const valid = isOriginal || edit.legal.some(c => c.zone === item.zone && c.x === cellX && c.y === cellY);
              return { ...current, x: cellX, y: cellY, valid };
            });
          }}
          onPointerUp={e => {
            if (e.pointerType !== "mouse") return;
            setDrag(current => {
              if (current?.id === item.id && dragMovedRef.current && current.valid) {
                edit.onDrop(item.zone, current.x, current.y);
              }
              return null;
            });
            suppressClickRef.current = dragMovedRef.current;
          }}
        >
          <title>{def.label}</title>
          <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} className="room-item-photo" />
          {(isSelected || isDragging) && (
            <rect
              x={x - 2} y={y - 2} width={w + 4} height={h + 4}
              rx={4} fill="none"
              stroke={isDragging && !drag!.valid ? "#ef4444" : "var(--room-screen-on)"}
              strokeWidth={3} strokeDasharray="7 5"
            />
          )}
        </g>
      );
    }

    const anchor = anchorOf(item, def);
    const x = anchor.x - w / 2, y = anchor.y - h;
    const shadow = item.zone === "floor" && def.mustStandOn !== "desk" ? (
      <ellipse
        cx={anchor.x} cy={anchor.y}
        rx={w * 0.44} ry={Math.min(9, h * 0.09)}
        fill="#000000" opacity={0.4}
        filter="url(#room-blur-md)"
      />
    ) : null;

    if (!def.interactive) {
      return (
        <g key={item.id}>
          {shadow}
          <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} className="room-item-photo" />
        </g>
      );
    }

    const target = def.interactive;
    const label =
      target === "crt"     ? `Profil von ${ownerName} anzeigen`
    : target === "vitrine" ? `Sammlung von ${ownerName} anzeigen`
    :                        "Jobbörse öffnen";

    return (
      <g
        key={item.id}
        className="room-hit"
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={e => {
          if (target === "crt") zoomIntoScreen(e);
          onInteract(target, item.key);
        }}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (target === "crt") zoomIntoScreen(e);
            onInteract(target, item.key);
          }
        }}
      >
        <title>{label}</title>
        {shadow}
        {/* Atmender Rahmen: einziger Hinweis, dass dieses Möbelstück anklickbar
            ist und nicht nur Deko. */}
        <rect
          x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={6}
          className="room-interactive-glow" fill="none" stroke="var(--room-screen-on)" strokeWidth={2}
          pointerEvents="none"
        />
        <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} className="room-item-photo" />
        {/* Bildschirminhalt statt Deko-Leuchtschein: der alte Radial-Halo HINTER
            dem Gerät sagte nur "hier ist ein Monitor", nicht "der läuft gerade".
            Diese Attrappe liegt VOR dem Foto (screen-blend, hellt nur dunkle
            Bildschirm-Pixel merklich auf, der helle Gehäuserand bleibt fast
            unangetastet) und suggeriert echten UI-Inhalt statt nur Glühen. */}
        {target === "crt" && <CrtScreenContent x={x} y={y} w={w} h={h} screenRect={def.screenRect} itemId={item.id} />}
      </g>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vitrine + Raum: ab sm nebeneinander, gleich hoch (Vitrine links,
          über die volle Bühnenhöhe — siehe VitrinePanel). Auf Mobilgeräten
          ist dafür kein Platz: dort quetschte die feste Vitrinen-Breite das
          eigentliche Zimmer auf einen schmalen Streifen zusammen, deshalb
          wird unterhalb von sm gestapelt (Vitrine oben, volle Breite, eigene
          Höhe über ihr Seitenverhältnis) statt nebeneinander gepresst. */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        <VitrinePanel
          ownerName={ownerName} vitrine={vitrine} onInteract={onInteract} editing={!!edit}
          measuredHeight={stageHeight}
        />

        <div ref={stageWrapRef} className="glass card-shine rounded-2xl p-2 sm:p-3 room-stage-scroll scrollbar-none min-w-0 flex-1">
          <svg
            ref={svgRef}
          className={cn("room-stage rounded-xl", screenZoom && "room-stage-zoom")}
          style={screenZoom ? { transformOrigin: `${screenZoom.x}% ${screenZoom.y}%` } : undefined}
          viewBox={`0 0 ${ISO_STAGE.width} ${ISO_STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Gaming-Zimmer von ${ownerName}`}
        >
          <defs>
            <SurfacePatterns wallpaperKey={state.wallpaperKey} floorKey={state.floorKey} />
          </defs>

          <RoomShell />

          {/* Kontaktschatten liegen direkt bei ihrem Item (siehe renderItem),
              nicht mehr als eigener Rendering-Pass — in der Eck-Ansicht steht
              nicht mehr jedes Bodenobjekt zwingend in derselben Zeile. */}
          {items.map(renderItem)}

          <RoomWindow level={level} />
          <CeilingLamp level={level} />

          {/* ── Erlaubte Zielplätze ──────────────────────────────────
              Liegen über den Möbeln, damit sie immer treffbar sind.
              Berechnet mit derselben validatePlacement() wie der Server. */}
          {edit && edit.legal.map(cell => {
            const isHover = hover?.zone === cell.zone && hover.x === cell.x && hover.y === cell.y;
            const cellQuad = surfaceQuad(cell.zone, cell.x, cell.y, 1, 1);
            const ghostQuad = isHover && edit.ghost
              ? surfaceQuad(cell.zone, cell.x, cell.y, edit.ghost.w, edit.ghost.h)
              : null;
            return (
              <g key={`${cell.zone}-${cell.x}-${cell.y}`}>
                {ghostQuad && (
                  <polygon points={quadToPoints(ghostQuad)} fill="var(--room-screen-on)" opacity={0.22} pointerEvents="none" />
                )}
                <polygon
                  className="room-cell-ok"
                  points={quadToPoints(cellQuad)}
                  role="button" tabIndex={0}
                  aria-label={`Hier absetzen (${cell.zone === "floor" ? "Boden" : cell.zone === "wall_back" ? "Rückwand" : "Seitenwand"}, Spalte ${cell.x + 1}, Reihe ${cell.y + 1})`}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => { setHover(null); edit.onDrop(cell.zone, cell.x, cell.y); }}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); edit.onDrop(cell.zone, cell.x, cell.y); }
                  }}
                />
              </g>
            );
          })}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Monitor-Inhalt: "läuft gerade" statt "kann geklickt werden" ─────────────

/**
 * Attrappe eines aktiven Bildschirminhalts, über das Möbel-Foto gelegt.
 * Nutzt `def.screenRect` (room-items.ts) — die am jeweiligen Foto ausgemessenen
 * Bildschirmgrenzen, als Brüche der Rasterbox — um den Glow per `clipPath` HART
 * auf die tatsächliche Anzeigefläche zu begrenzen: `mix-blend-mode:screen`
 * hellt zwar nur dunkle Pixel spürbar auf, ohne Clip bleicht ein heller
 * Gehäuserand darunter aber trotzdem sichtbar mit. Fehlt `screenRect` (z.B.
 * für einen frisch gekauften Monitor-Typ ohne Kalibrierung), fällt die
 * Funktion auf eine grobzügige, ungeclippte Standardzone zurück statt gar
 * nichts zu zeigen.
 */
function CrtScreenContent({
  x, y, w, h, screenRect, itemId,
}: {
  x: number; y: number; w: number; h: number;
  screenRect?: { x0: number; y0: number; x1: number; y1: number };
  itemId: string;
}) {
  const rect = screenRect
    ? { x: x + w * screenRect.x0, y: y + h * screenRect.y0, w: w * (screenRect.x1 - screenRect.x0), h: h * (screenRect.y1 - screenRect.y0) }
    : { x: x + w * 0.15, y: y + h * 0.06, w: w * 0.7, h: h * 0.6 };
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const clipId = `crt-clip-${itemId}`;
  return (
    <g pointerEvents="none" style={{ mixBlendMode: "screen" }} clipPath={`url(#${clipId})`}>
      <clipPath id={clipId}>
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
      </clipPath>
      <ellipse cx={cx} cy={cy} rx={rect.w * 0.65} ry={rect.h * 0.75}
        fill="var(--room-screen-on)" opacity={0.8} filter="url(#room-blur-sm)" />
      <rect x={cx - rect.w * 0.32} y={cy - rect.h * 0.3} width={rect.w * 0.5} height={rect.h * 0.14} rx={2}
        fill="#ffffff" opacity={0.65} />
      <rect x={cx - rect.w * 0.32} y={cy - rect.h * 0.06} width={rect.w * 0.32} height={rect.h * 0.14} rx={2}
        fill="#ffffff" opacity={0.5} />
      <rect x={cx - rect.w * 0.32} y={cy + rect.h * 0.18} width={rect.w * 0.6} height={rect.h * 0.14} rx={2}
        fill="#ffffff" opacity={0.4} />
    </g>
  );
}

// ── Raum-Hülle: Rückwand, Seitenwand, Boden als echte Flächen ────────────────

/**
 * Zeichnet die drei Flächen der Eck-Ansicht als Polygone (siehe
 * room-iso.ts, surfaceQuad). Die Fototexturen werden über `patternTransform`
 * (siehe room-iso.ts, `surfacePatternTransform`) exakt so geschert wie die
 * Fläche selbst projiziert wird — dieselbe lineare Abbildung, einmal als
 * Punktformel (für Möbel-Anker) und einmal als SVG-Matrix (für die Textur).
 * Der `clipPath` schneidet danach nur noch sauber auf die Polygon-Silhouette
 * zu, verzerrt aber nichts mehr selbst.
 */
function RoomShell() {
  const floorQuad    = surfaceQuad("floor",     0, 0, ISO_GRID.floor.cols,     ISO_GRID.floor.rows);
  const wallBackQuad = surfaceQuad("wall_back", 0, 0, ISO_GRID.wall_back.cols, ISO_GRID.wall_back.rows);
  const wallSideQuad = surfaceQuad("wall_side", 0, 0, ISO_GRID.wall_side.cols, ISO_GRID.wall_side.rows);

  return (
    <g>
      <g clipPath="url(#clip-wall-back)">
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-wallback-photo)" />
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-wall-vignette)" />
      </g>
      <g clipPath="url(#clip-wall-side)">
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-wallside-photo)" />
        {/* Etwas dunkler als die Rückwand: liest sich als von der Lichtquelle
            abgewandte Seitenfläche, nicht als exakt dieselbe Wand zweimal. */}
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="#000000" opacity={0.28} />
      </g>
      <g clipPath="url(#clip-floor)">
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-floor-photo)" />
        <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-wall-vignette)" opacity={0.5} />
      </g>

      {/* Kanten zwischen den Flächen — sonst verschwimmen Rückwand/Seitenwand/
          Boden ohne jede Kontur ineinander. */}
      <polyline points={quadToPoints([wallBackQuad[0], wallBackQuad[3], floorQuad[0]])}
        fill="none" stroke="var(--room-outline)" strokeWidth={1.5} opacity={0.5} />
      <polyline points={quadToPoints([wallSideQuad[0], wallSideQuad[1], floorQuad[0]])}
        fill="none" stroke="var(--room-outline)" strokeWidth={1.5} opacity={0.5} />

      <rect x={0} y={0} width={ISO_STAGE.width} height={ISO_STAGE.height} fill="url(#room-corner-vignette)" pointerEvents="none" />
    </g>
  );
}

// ── Vitrine: eigenständiges Panel, losgelöst vom Raster ─────────────────────

/** Eigene Koordinatenbreite der Vitrine, an den 281×655-Bildausschnitt von
 *  public/room-items/vitrine.png angenähert, bei fester Höhe = volle
 *  Raumhöhe der Bühne. */
const VITRINE_PANEL_W = 240;
const VITRINE_PANEL_H = 576;

/**
 * Die Vitrine ist bewusst KEIN Katalog-Möbelstück im Raster mehr, sondern ein
 * eigenständiges Panel links neben dem Zimmer, über dessen komplette Höhe.
 * Zwei Gründe: (1) wer die Vitrine eines fremden Zimmers ansehen will, soll
 * sie nicht erst zwischen anderen Möbeln suchen müssen — sie steht immer am
 * selben Fleck, außerhalb jeder Umgestaltung. (2) losgelöst von einer
 * Bodenzelle darf sie so groß sein, wie sie für lesbare Namensplaketten
 * unter jedem Pokal/Sammelstück/Abzeichen tatsächlich sein muss.
 */
function VitrinePanel({
  ownerName, vitrine, onInteract, editing, measuredHeight,
}: {
  ownerName: string;
  vitrine:   Props["vitrine"];
  onInteract: (target: InteractTarget, itemKey?: string) => void;
  editing:   boolean;
  /**
   * Per ResizeObserver gemessene Pixel-Höhe der Bühne nebenan (siehe
   * RoomStage). `null` nur im allerersten Render, bevor der erste Messwert
   * eintrifft — bis dahin greift `self-stretch` als CSS-Fallback.
   */
  measuredHeight: number | null;
}) {
  const vw = VITRINE_PANEL_W;
  const vh = VITRINE_PANEL_H;
  const label = `Sammlung von ${ownerName} anzeigen`;
  const isEmpty = vitrine.trophies.length === 0 && vitrine.pokale.length === 0 && vitrine.badges.length === 0;

  return (
    <div
      className={cn(
        "glass card-shine rounded-2xl p-2 sm:p-3 shrink-0",
        // Mobil: volle Breite, Höhe folgt dem Seitenverhältnis der SVG (kein
        // erzwungener Wert). Ab sm: feste Breite, Höhe = gemessene Bühnenhöhe
        // (siehe measuredHeight-Kommentar oben) — oder self-stretch, bis der
        // erste Messwert eintrifft.
        "w-full sm:w-auto",
        measuredHeight == null && "sm:self-stretch",
      )}
      style={measuredHeight != null ? { ["--vitrine-h" as string]: `${measuredHeight}px` } : undefined}
    >
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className={cn(
          "block w-full h-auto max-h-[40vh] rounded-xl",
          measuredHeight != null && "sm:h-[var(--vitrine-h)] sm:w-auto sm:max-h-none",
          measuredHeight == null && "sm:h-full sm:w-auto",
        )}
        role="img"
        aria-label={label}
      >
        {/* Im Bearbeiten-Modus nur sichtbar, nicht anklickbar — sie lässt
            sich ohnehin nicht verschieben, ein Klick soll dort nicht mitten
            in der Möbel-Auswahl ein Modal aufreißen. */}
        {editing ? (
          <image href="/room-items/vitrine.png" x={0} y={0} width={vw} height={vh}
            preserveAspectRatio="xMidYMax meet" className="room-item-photo" />
        ) : (
          <g
            className="room-hit"
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={() => onInteract("vitrine")}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onInteract("vitrine"); }
            }}
          >
            <title>{label}</title>
            <rect
              x={2} y={2} width={vw - 4} height={vh - 4} rx={10}
              className="room-interactive-glow" fill="none" stroke="var(--room-screen-on)" strokeWidth={2}
              pointerEvents="none"
            />
            <image href="/room-items/vitrine.png" x={0} y={0} width={vw} height={vh}
              preserveAspectRatio="xMidYMax meet" className="room-item-photo" />
            {isEmpty ? (
              <text x={vw / 2} y={vh / 2} textAnchor="middle" dominantBaseline="central"
                fontSize={11} fill="var(--room-plastic)" opacity={0.55}>
                Noch nichts gesammelt
              </text>
            ) : (
              <VitrineContent x={0} y={0} vitrine={vitrine} />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

function VitrineContent({
  x, y, vitrine,
}: {
  x: number; y: number;
  vitrine: Props["vitrine"];
}) {
  const trophyOverflow = vitrine.trophies.length - VITRINE_SLOTS.trophies.length;
  const pokaleOverflow = vitrine.pokaleTotal - vitrine.pokale.length;
  const badgeOverflow  = vitrine.badges.length - VITRINE_SLOTS.badges.length;

  return (
    <g pointerEvents="none" transform={`translate(${x},${y})`}>
      {/* Pokale im oberen Fach */}
      {vitrine.trophies.slice(0, VITRINE_SLOTS.trophies.length).map((t, i) => {
        const slot = VITRINE_SLOTS.trophies[i];
        const title = t.scopeType === "genre"
          ? GENRE_CONFIG[t.scopeValue]?.title ?? t.scopeValue
          : CATEGORY_CONFIG[t.scopeValue]?.title ?? t.scopeValue;
        return (
          <g key={`${t.scopeType}:${t.scopeValue}`}>
            <TrophySlot trophy={t} {...slot} />
            <PlaqueLabel x={slot.x + slot.s / 2} y={slot.plaqueY} text={title} />
          </g>
        );
      })}
      {trophyOverflow > 0 && (
        <OverflowMarker slot={VITRINE_SLOTS.trophies[VITRINE_SLOTS.trophies.length - 1]} count={trophyOverflow} />
      )}

      {/* Pokale in den mittleren Fächern — Eventreihen-Pokale (isSeries) mit
          goldenem Ring hervorgehoben, analog zum Rahmen in EventPokalWinners. */}
      {vitrine.pokale.slice(0, VITRINE_SLOTS.pokale.length).map((p, i) => {
        const slot = VITRINE_SLOTS.pokale[i];
        return (
          <g key={p.id}>
            <circle
              cx={slot.x + slot.s / 2} cy={slot.y + slot.s / 2} r={slot.s * (p.isSeries ? 0.62 : 0.5)}
              fill={p.isSeries ? "rgba(251,191,36,0.35)" : "rgba(148,163,184,0.25)"}
              stroke={p.isSeries ? "rgba(251,191,36,0.75)" : "none"}
              strokeWidth={p.isSeries ? 1.5 : 0}
            />
            <image href={POKAL_CATEGORY_IMAGE[p.category]} x={slot.x} y={slot.y} width={slot.s} height={slot.s}
              preserveAspectRatio="xMidYMid meet" />
            <PlaqueLabel x={slot.x + slot.s / 2} y={slot.plaqueY} text={p.title} />
          </g>
        );
      })}
      {pokaleOverflow > 0 && (
        <OverflowMarker slot={VITRINE_SLOTS.pokale[VITRINE_SLOTS.pokale.length - 1]} count={pokaleOverflow} />
      )}

      {/* Abzeichen auf der Sockelleiste */}
      {vitrine.badges.slice(0, VITRINE_SLOTS.badges.length).map((b, i) => {
        const slot = VITRINE_SLOTS.badges[i];
        return (
          <g key={b.key}>
            <text
              x={slot.x + slot.s / 2} y={slot.y + slot.s / 2}
              textAnchor="middle" dominantBaseline="central" fontSize={slot.s}
            >
              {b.icon}
            </text>
            <PlaqueLabel x={slot.x + slot.s / 2} y={slot.plaqueY} text={b.name} />
          </g>
        );
      })}
      {badgeOverflow > 0 && (
        <OverflowMarker slot={VITRINE_SLOTS.badges[VITRINE_SLOTS.badges.length - 1]} count={badgeOverflow} />
      )}
    </g>
  );
}

/**
 * "+N"-Hinweis oben rechts über dem letzten Fach einer Kategorie — sichtbar,
 * sobald mehr Stücke existieren als Vitrinen-Fächer auf der Bühne (siehe
 * VITRINE_SLOTS). Ohne ihn wirkte ein Abschneiden wie Datenverlust statt wie
 * eine bewusste Vorschau; der volle Bestand bleibt im VitrineModal einsehbar.
 */
function OverflowMarker({ slot, count }: { slot: { x: number; y: number; s: number }; count: number }) {
  const cx = slot.x + slot.s - 2;
  const cy = slot.y + 2;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <title>{`+${count} weitere in der Vitrine`}</title>
      <circle r={8} fill="var(--room-metal-hi)" stroke="var(--room-shade)" strokeWidth={0.75} />
      <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={8.5} fontWeight={700}
        fill="var(--room-plastic)">
        +{count}
      </text>
    </g>
  );
}

function TrophySlot({ trophy, x, y, s }: { trophy: VitrineTrophy; x: number; y: number; s: number }) {
  const genre = trophy.scopeType === "genre" ? GENRE_CONFIG[trophy.scopeValue] : null;
  if (genre) {
    return <image href={genre.icon} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
  }
  const emoji = CATEGORY_CONFIG[trophy.scopeValue]?.emoji ?? "🏆";
  return (
    <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.82}>
      {emoji}
    </text>
  );
}

/**
 * Kleine gravierte Plakette unter jedem Ausstellungsstück — bei der winzigen
 * Größe auf der Bühne eher Textur als Fließtext lesbar, der volle Name steckt
 * deshalb zusätzlich in einem `<title>`-Tooltip. Der Tooltip greift aber nur
 * bei Maus-Hover — auf Touch ist er unerreichbar. Der eigentliche Lesetext
 * bleibt deshalb bewusst VitrineModal vorbehalten: ein Tap irgendwo in der
 * Vitrine (auch auf der Plakette) öffnet es, siehe onInteract in
 * VitrinePanel — Touch-Nutzer verlieren also nichts, sie überspringen nur
 * den Hover-Zwischenschritt.
 */
function PlaqueLabel({ x, y, text }: { x: number; y: number; text: string }) {
  const short = text.length > 16 ? `${text.slice(0, 15)}…` : text;
  const plaqueW = Math.min(104, Math.max(44, short.length * 8.3));
  return (
    <g transform={`translate(${x},${y})`}>
      <title>{text}</title>
      <rect x={-plaqueW / 2} y={0} width={plaqueW} height={16} rx={2.5}
        fill="var(--room-metal-hi)" stroke="var(--room-shade)" strokeWidth={0.75} opacity={0.9} />
      <text x={0} y={8} textAnchor="middle" dominantBaseline="central"
        fontSize={10} fill="var(--room-plastic)" opacity={0.85}>
        {short}
      </text>
    </g>
  );
}

// ── Fenster, Deckenlampe ─────────────────────────────────────────────────────

/** Deutsche Namen der vier Investitions-Stufen — als `<title>`-Tooltip auf
 *  Fenster und Lampe, damit der Aufstieg nachvollziehbar bleibt statt wie ein
 *  zufälliger Grafikwechsel zu wirken. */
const ROOM_LEVEL_LABEL = ["Abgewohnt", "Frisch renoviert", "Modern eingerichtet", "Luxuriös ausgestattet"];

const WINDOW_FRAME: { base: string; hi: string; accent?: string }[] = [
  { base: "var(--room-wood)",  hi: "var(--room-wood-hi)" },                                    // 0: Abgewohnt
  { base: "var(--room-paint)", hi: "var(--room-paint-hi)" },                                    // 1: Renoviert
  { base: "var(--room-metal)", hi: "var(--room-metal-hi)" },                                    // 2: Modern
  { base: "var(--room-metal)", hi: "var(--room-gold-hi)", accent: "var(--room-gold)" },         // 3: Luxus
];

/**
 * Fenster-Geometrie, komplett in Wand-Rasterzellen (lokale Einheiten der
 * Rückwand-Scherung — siehe `surfacePatternTransform` in room-iso.ts): `x0`
 * ist die linke Kante ab der Raumecke, `y0` die Sims-Höhe ab Boden, `w`/`h`
 * Breite/Höhe des Rahmens. Der ganze Baum wird über EIN `transform` auf die
 * Rückwand geschert (siehe RoomWindow) — dieselbe lineare Abbildung, die auch
 * die Wandtextur selbst scherz. Anders als in Phase 1 (Fenster als
 * unverzerrtes Billboard) sitzt das Fenster dadurch WIRKLICH auf der
 * schrägen Fläche, statt wie ein aufgeklebter Frontal-Screenshot dagegen zu
 * stehen. Ränder: y0+h = 5.5 bleibt unter wall_back.rows (6) → kein
 * Überstand über die Decke; x0+Vorhang-Überstand bleibt unter
 * wall_back.cols (12).
 */
const WINDOW_GEOM = { x0: 2, y0: 2.6, w: 2.6, h: 2.9 } as const;

/**
 * Ein Fenster, fest auf der Rückwand verankert und in deren Scherung
 * eingebettet (siehe WINDOW_GEOM-Kommentar) — Rahmen UND Ausblick werten sich
 * mit `level` automatisch auf (siehe room-layout.ts, roomLevel): abgewohntes
 * Holz mit Dämmerungsblick → frisch gestrichener Rahmen → Alu-Rahmen mit
 * Skyline → Alu/Gold-Rahmen mit Strand-Sonnenuntergang.
 */
function RoomWindow({ level }: { level: number }) {
  const { x0, y0, w, h } = WINDOW_GEOM;
  // Lokale Einheiten: Rahmenrand 0.1 Zellen, Vorhangüberstand seitlich 0.2,
  // Vorhangstange/-fall 0.15 über/unter dem Rahmen.
  const frame = WINDOW_FRAME[level] ?? WINDOW_FRAME[0];
  const skyFill = level >= 3 ? "url(#room-window-sky-beach)" : level === 2 ? "url(#room-window-sky-skyline)" : "url(#room-window-sky)";
  const paneX = x0 + 0.1, paneW = w - 0.2;
  const paneYTop = y0 + h - 0.1, paneYBot = y0 + 0.1; // lokal wächst Y nach oben
  const paneH = paneYTop - paneYBot;
  return (
    <g transform={surfacePatternTransform("wall_back")}>
      <title>{`Fenster — ${ROOM_LEVEL_LABEL[level] ?? ROOM_LEVEL_LABEL[0]}`}</title>
      <rect x={x0} y={y0} width={w} height={h} rx={0.06} fill={frame.base} />
      <rect x={paneX} y={paneYBot} width={paneW} height={paneH} fill={skyFill} />

      {level <= 1 && (
        /* Ferne, erleuchtete Fenster — deuten Nachbarhäuser an. Auf Stufe 1
           zwei zusätzliche Lichter: ein bisschen mehr Leben im Viertel. */
        <g opacity={0.85}>
          <rect x={paneX + paneW * 0.14} y={paneYBot + paneH * 0.4} width={paneW * 0.08} height={paneH * 0.16} fill="var(--room-window-light)" filter="url(#room-blur-sm)" />
          <rect x={paneX + paneW * 0.14} y={paneYBot + paneH * 0.4} width={paneW * 0.08} height={paneH * 0.16} fill="var(--room-window-light)" />
          <rect x={paneX + paneW * 0.3} y={paneYBot + paneH * 0.15} width={paneW * 0.07} height={paneH * 0.14} fill="var(--room-window-light)" opacity={0.7} />
          <rect x={paneX + paneW * 0.75} y={paneYBot + paneH * 0.5} width={paneW * 0.07} height={paneH * 0.14} fill="var(--room-window-light)" opacity={0.75} />
          {level === 1 && (
            <>
              <rect x={paneX + paneW * 0.58} y={paneYBot + paneH * 0.3} width={paneW * 0.06} height={paneH * 0.12} fill="var(--room-window-light)" opacity={0.65} />
              <rect x={paneX + paneW * 0.44} y={paneYBot + paneH * 0.1} width={paneW * 0.07} height={paneH * 0.14} fill="var(--room-window-light)" opacity={0.6} />
            </>
          )}
        </g>
      )}
      {level === 2 && <WindowSkyline x={paneX} y={paneYBot} w={paneW} h={paneH} />}
      {level >= 3 && <WindowBeach x={paneX} y={paneYBot} w={paneW} h={paneH} />}

      {/* Sprossen */}
      <rect x={paneX + paneW / 2 - 0.03} y={paneYBot} width={0.06} height={paneH} fill={frame.base} opacity={0.9} />
      <rect x={paneX} y={paneYBot + paneH / 2 - 0.03} width={paneW} height={0.06} fill={frame.base} opacity={0.9} />
      <rect x={x0} y={y0} width={w} height={h} rx={0.06} fill="none" stroke={frame.accent ?? frame.hi} strokeWidth={0.03} opacity={0.5} />

      {/* Fensterbank — knapp unterhalb des Rahmens, seitlich leicht überstehend. */}
      <rect x={x0 - 0.15} y={y0 - 0.18} width={w + 0.3} height={0.14} rx={0.02} fill={frame.hi} />

      {/* Vorhänge — gerafft an beiden Seiten, damit das Fenster nach echtem
          Zimmer aussieht statt nach eingebautem Bildschirm. */}
      <path d={`M${x0 - 0.16},${y0 + h + 0.12} Q${x0 + 0.1},${y0 + h * 0.5} ${x0 - 0.06},${y0 - 0.1} L${x0 - 0.35},${y0 - 0.03} Q${x0 - 0.26},${y0 + h * 0.5} ${x0 - 0.32},${y0 + h + 0.16} Z`}
        fill="var(--room-fabric)" opacity={0.92} />
      <path d={`M${x0 + w + 0.16},${y0 + h + 0.12} Q${x0 + w - 0.1},${y0 + h * 0.5} ${x0 + w + 0.06},${y0 - 0.1} L${x0 + w + 0.35},${y0 - 0.03} Q${x0 + w + 0.26},${y0 + h * 0.5} ${x0 + w + 0.32},${y0 + h + 0.16} Z`}
        fill="var(--room-fabric)" opacity={0.92} />
      <rect x={x0 - 0.42} y={y0 + h + 0.08} width={w + 0.84} height={0.1} rx={0.04} fill={frame.accent ?? "var(--room-metal)"} />
    </g>
  );
}

/** Stufe 2: Stadt-Silhouette statt einzelner Nachbarhäuser — deutlich mehr
 *  "Ausblick" als eine Handvoll ferner Fenster. */
function WindowSkyline({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const base = y + h;
  const buildings = [
    { bx: 0.02, bw: 0.14, bh: 0.42 }, { bx: 0.17, bw: 0.10, bh: 0.62 }, { bx: 0.28, bw: 0.16, bh: 0.34 },
    { bx: 0.46, bw: 0.11, bh: 0.72 }, { bx: 0.58, bw: 0.13, bh: 0.5 },  { bx: 0.72, bw: 0.10, bh: 0.6 },
    { bx: 0.83, bw: 0.15, bh: 0.4 },
  ];
  return (
    <g>
      {buildings.map((b, i) => {
        const bx = x + w * b.bx, bw = w * b.bw, bh = h * b.bh, by = base - bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw} height={bh} fill="var(--room-skyline)" />
            {/* Erleuchtete Fenster-Raster: wenige, feste Punkte statt Zufall,
                damit das Bild bei jedem Rerender identisch aussieht. */}
            {[0.2, 0.45, 0.7].map(fy => [0.25, 0.6].map(fx => (
              <rect key={`${fx}-${fy}`} x={bx + bw * fx} y={by + bh * fy} width={Math.max(2, bw * 0.12)} height={Math.max(2, bh * 0.06)}
                fill="var(--room-window-light)" opacity={0.75} />
            )))}
          </g>
        );
      })}
    </g>
  );
}

/** Stufe 3: Strand-Sonnenuntergang — Sonne, Horizont, Wellen. Der Himmel-
 *  Farbverlauf (inkl. Ozean-Anteil unten) kommt bereits aus der Pane-Füllung
 *  (`room-window-sky-beach`), hier kommen nur die Silhouetten-Details dazu. */
function WindowBeach({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const sunCx = x + w * 0.62, sunCy = y + h * 0.36, horizonY = y + h * 0.58;
  return (
    <g>
      <circle cx={sunCx} cy={sunCy} r={h * 0.16} fill="var(--room-sky-beach-2)" filter="url(#room-blur-sm)" opacity={0.9} />
      <circle cx={sunCx} cy={sunCy} r={h * 0.11} fill="var(--room-sky-beach-2)" />
      <rect x={x} y={horizonY} width={w} height={1.5} fill="var(--room-ocean-hi)" opacity={0.6} />
      {[0.68, 0.8, 0.92].map((fy, i) => (
        <path key={i} d={`M${x + w * 0.08},${y + h * fy} Q${x + w * 0.3},${y + h * (fy - 0.025)} ${x + w * 0.5},${y + h * fy} T${x + w * 0.92},${y + h * fy}`}
          stroke="var(--room-ocean-hi)" strokeWidth={1.5} fill="none" opacity={0.5 - i * 0.1} />
      ))}
      {[[0.18, 0.22], [0.24, 0.19], [0.7, 0.24]].map(([gx, gy], i) => (
        <path key={i} d={`M${x + w * gx - 4},${y + h * gy} Q${x + w * gx},${y + h * gy - 3} ${x + w * gx + 4},${y + h * gy}`}
          stroke="var(--room-skyline)" strokeWidth={1.2} fill="none" opacity={0.55} />
      ))}
    </g>
  );
}

/** Anker der Deckenlampe auf der Rückwand — bewusst nahe der Decke (großes y). */
const LAMP_ANCHOR = { x: 8, y: 6 } as const;

/** Deckenleuchte. Wertet sich mit `level` parallel zum Fenster auf: nackte
 *  Glühbirne → Stoffschirm → flaches LED-Rondell → kleiner Kronleuchter. */
function CeilingLamp({ level }: { level: number }) {
  const anchor = wallBackToScreen(LAMP_ANCHOR.x, LAMP_ANCHOR.y);
  const cx = anchor.x, bulbY = anchor.y;
  return (
    <g pointerEvents="none">
      <title>{`Deckenlampe — ${ROOM_LEVEL_LABEL[level] ?? ROOM_LEVEL_LABEL[0]}`}</title>
      {level >= 3 ? <ChandelierLamp cx={cx} bulbY={bulbY} />
        : level === 2 ? <DiscLamp cx={cx} bulbY={bulbY} />
        : level === 1 ? <DrumShadeLamp cx={cx} bulbY={bulbY} />
        : <BareBulbLamp cx={cx} bulbY={bulbY} />}
    </g>
  );
}

function BareBulbLamp({ cx, bulbY }: { cx: number; bulbY: number }) {
  return (
    <>
      <ellipse cx={cx} cy={bulbY + 6} rx={70} ry={40} fill="var(--room-lamp-glow)" filter="url(#room-blur-md)" />
      <line x1={cx} y1={bulbY - 60} x2={cx} y2={bulbY - 8} stroke="var(--room-metal)" strokeWidth={2} />
      <path d={`M${cx - 20},${bulbY - 8} L${cx + 20},${bulbY - 8} L${cx + 12},${bulbY + 10} L${cx - 12},${bulbY + 10} Z`}
        fill="var(--room-metal)" stroke="var(--room-metal-hi)" strokeWidth={1} />
      <circle cx={cx} cy={bulbY + 16} r={7} fill="var(--room-neon-amber)" filter="url(#room-blur-sm)" opacity={0.9} />
      <circle cx={cx} cy={bulbY + 16} r={4} fill="var(--room-neon-amber)" />
    </>
  );
}

function DrumShadeLamp({ cx, bulbY }: { cx: number; bulbY: number }) {
  return (
    <>
      <ellipse cx={cx} cy={bulbY + 14} rx={62} ry={36} fill="var(--room-lamp-glow)" filter="url(#room-blur-md)" />
      <line x1={cx} y1={bulbY - 60} x2={cx} y2={bulbY - 14} stroke="var(--room-metal)" strokeWidth={2} />
      <path d={`M${cx - 22},${bulbY - 14} L${cx + 22},${bulbY - 14} L${cx + 16},${bulbY + 16} L${cx - 16},${bulbY + 16} Z`}
        fill="var(--room-fabric)" stroke="var(--room-outline)" strokeWidth={1} opacity={0.95} />
      <ellipse cx={cx} cy={bulbY + 17} rx={15} ry={3} fill="var(--room-neon-amber)" opacity={0.55} filter="url(#room-blur-sm)" />
    </>
  );
}

function DiscLamp({ cx, bulbY }: { cx: number; bulbY: number }) {
  return (
    <>
      <ellipse cx={cx} cy={bulbY + 4} rx={80} ry={42} fill="var(--room-lamp-glow)" filter="url(#room-blur-md)" />
      <rect x={cx - 2.5} y={bulbY - 60} width={5} height={44} fill="var(--room-metal)" />
      <ellipse cx={cx} cy={bulbY - 14} rx={36} ry={8} fill="var(--room-metal)" stroke="var(--room-metal-hi)" strokeWidth={1} />
      <ellipse cx={cx} cy={bulbY - 13} rx={27} ry={5} fill="var(--room-neon-amber)" opacity={0.85} filter="url(#room-blur-sm)" />
      <ellipse cx={cx} cy={bulbY - 13} rx={27} ry={5} fill="var(--room-neon-amber)" opacity={0.6} />
    </>
  );
}

function ChandelierLamp({ cx, bulbY }: { cx: number; bulbY: number }) {
  const arms = [-30, 0, 30];
  return (
    <>
      <ellipse cx={cx} cy={bulbY + 10} rx={94} ry={46} fill="var(--room-lamp-glow)" filter="url(#room-blur-md)" />
      <line x1={cx} y1={bulbY - 70} x2={cx} y2={bulbY - 20} stroke="var(--room-gold)" strokeWidth={2} />
      <rect x={cx - 42} y={bulbY - 22} width={84} height={4} rx={2} fill="var(--room-gold)" stroke="var(--room-gold-hi)" strokeWidth={0.5} />
      {arms.map(dx => (
        <g key={dx}>
          <line x1={cx + dx} y1={bulbY - 20} x2={cx + dx} y2={bulbY - 2} stroke="var(--room-gold)" strokeWidth={1.5} />
          <circle cx={cx + dx} cy={bulbY + 4} r={6.5} fill="var(--room-neon-amber)" filter="url(#room-blur-sm)" opacity={0.9} />
          <circle cx={cx + dx} cy={bulbY + 4} r={3.5} fill="var(--room-neon-amber)" />
        </g>
      ))}
    </>
  );
}

// ── Wand- und Bodenmuster ────────────────────────────────────────────────────

/**
 * Tapeten, Böden und die Raum-Beleuchtung als SVG-Muster/-Gradienten/Clip-Pfade.
 * Alles zeichnet auf den --room-* Tokens, damit der Theme-Wechsel die Flächen
 * mitnimmt.
 */
function SurfacePatterns({ wallpaperKey, floorKey }: { wallpaperKey: string; floorKey: string }) {
  const floorQuad    = surfaceQuad("floor",     0, 0, ISO_GRID.floor.cols,     ISO_GRID.floor.rows);
  const wallBackQuad = surfaceQuad("wall_back", 0, 0, ISO_GRID.wall_back.cols, ISO_GRID.wall_back.rows);
  const wallSideQuad = surfaceQuad("wall_side", 0, 0, ISO_GRID.wall_side.cols, ISO_GRID.wall_side.rows);

  return (
    <>
      <filter id="room-blur-sm" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={4} />
      </filter>
      <filter id="room-blur-md" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={7} />
      </filter>

      {/* Zuschnitt der drei Raumflächen — siehe RoomShell-Kommentar. */}
      <clipPath id="clip-wall-back"><polygon points={quadToPoints(wallBackQuad)} /></clipPath>
      <clipPath id="clip-wall-side"><polygon points={quadToPoints(wallSideQuad)} /></clipPath>
      <clipPath id="clip-floor"><polygon points={quadToPoints(floorQuad)} /></clipPath>

      {/* ── Dämmerungshimmel hinterm Fenster (Investitions-Stufe 0/1) ── */}
      <linearGradient id="room-window-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--room-window-sky-1)" />
        <stop offset="100%" stopColor="var(--room-window-sky-2)" />
      </linearGradient>
      {/* ── Skyline-Dämmerung hinterm Fenster (Stufe 2, siehe WindowSkyline) ── */}
      <linearGradient id="room-window-sky-skyline" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--room-sky-skyline-1)" />
        <stop offset="100%" stopColor="var(--room-sky-skyline-2)" />
      </linearGradient>
      {/* ── Strand-Sonnenuntergang hinterm Fenster (Stufe 3, siehe WindowBeach) —
          der untere Streifen ist bereits der Ozean, WindowBeach setzt nur noch
          Sonne/Horizont/Wellen obendrauf. ── */}
      <linearGradient id="room-window-sky-beach" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--room-sky-beach-1)" />
        <stop offset="52%"  stopColor="var(--room-sky-beach-2)" />
        <stop offset="58%"  stopColor="var(--room-ocean-hi)" />
        <stop offset="100%" stopColor="var(--room-ocean)" />
      </linearGradient>

      {/* ── Umgebungslicht: dunklere Ecken, dezenter warmer Lichtkegel oben ── */}
      <radialGradient id="room-wall-vignette" cx="50%" cy="8%" r="85%">
        <stop offset="0%"  stopColor="var(--room-neon-amber)" stopOpacity={0.05} />
        <stop offset="35%" stopColor="#000000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0.32} />
      </radialGradient>
      {/* ── Ecken-Tiefe: dunklere Bänder an den seitlichen Rändern, damit die
          Bühne wie eine geschlossene Box statt einer endlosen Fläche wirkt. ── */}
      <linearGradient id="room-corner-vignette" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor="#000000" stopOpacity={0.35} />
        <stop offset="10%"  stopColor="#000000" stopOpacity={0} />
        <stop offset="90%"  stopColor="#000000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0.35} />
      </linearGradient>

      {/* Fotografische Wand-/Bodentexturen, je Fläche EXAKT so geschert wie
          die Fläche selbst (siehe room-iso.ts, surfacePatternTransform) —
          die Kachel ist in Flächen-lokalen Rasterzellen definiert (nicht
          Pixeln) und deckt die Fläche einmal komplett ab, ohne Wiederholung;
          `patternTransform` biegt sie danach exakt auf die Wand-/Boden-Ebene. */}
      <pattern id="room-wallback-photo" patternUnits="userSpaceOnUse"
        width={ISO_GRID.wall_back.cols} height={ISO_GRID.wall_back.rows}
        patternTransform={surfacePatternTransform("wall_back")}>
        <image href={WALL_PHOTOS[wallpaperKey] ?? WALL_PHOTOS.tapete_raufaser}
          x={0} y={0} width={ISO_GRID.wall_back.cols} height={ISO_GRID.wall_back.rows} preserveAspectRatio="none" />
        <rect width={ISO_GRID.wall_back.cols} height={ISO_GRID.wall_back.rows} fill="var(--room-shade)" opacity={0.1} />
      </pattern>
      <pattern id="room-wallside-photo" patternUnits="userSpaceOnUse"
        width={ISO_GRID.wall_side.cols} height={ISO_GRID.wall_side.rows}
        patternTransform={surfacePatternTransform("wall_side")}>
        <image href={WALL_PHOTOS[wallpaperKey] ?? WALL_PHOTOS.tapete_raufaser}
          x={0} y={0} width={ISO_GRID.wall_side.cols} height={ISO_GRID.wall_side.rows} preserveAspectRatio="none" />
        <rect width={ISO_GRID.wall_side.cols} height={ISO_GRID.wall_side.rows} fill="var(--room-shade)" opacity={0.1} />
      </pattern>
      <pattern id="room-floor-photo" patternUnits="userSpaceOnUse"
        width={ISO_GRID.floor.cols} height={ISO_GRID.floor.rows}
        patternTransform={surfacePatternTransform("floor")}>
        <image href={FLOOR_PHOTOS[floorKey] ?? FLOOR_PHOTOS.boden_linoleum}
          x={0} y={0} width={ISO_GRID.floor.cols} height={ISO_GRID.floor.rows} preserveAspectRatio="none" />
        <rect width={ISO_GRID.floor.cols} height={ISO_GRID.floor.rows} fill="var(--room-shade)" opacity={0.15} />
      </pattern>
    </>
  );
}

const WALL_PHOTOS: Record<string, string> = {
  tapete_raufaser: "/room-surfaces/wall-raufaser.png",
  tapete_pixel:    "/room-surfaces/wall-pixel.png",
  tapete_scifi:    "/room-surfaces/wall-scifi.png",
};

const FLOOR_PHOTOS: Record<string, string> = {
  boden_linoleum: "/room-surfaces/floor-linoleum.png",
  boden_holz:     "/room-surfaces/floor-holz.png",
  boden_scifi:    "/room-surfaces/floor-scifi.png",
};

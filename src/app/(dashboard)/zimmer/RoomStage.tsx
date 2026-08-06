"use client";

import { useRef, useState } from "react";
import { getRoomItem, type RoomZone } from "@/lib/room-items";
import { CELL, GRID, STAGE, cellToSvg, type PlacedItem, type RoomState } from "@/lib/room-layout";
import { CATEGORY_CONFIG, GENRE_CONFIG } from "@/lib/wanderpocal";
import type { VitrineBadge, VitrineCollectible, VitrineTrophy } from "@/lib/room-profile-data";
import RoomItemSprite from "./RoomItemSprite";
import { VITRINE_SLOTS } from "./sprites";
import { cn } from "@/lib/utils";

export type InteractTarget = "crt" | "vitrine" | "jobboard";
type ZoneView = "all" | "wall" | "floor";

export interface EditHooks {
  /** Aktuell angehobenes Möbelstück (aus dem Raum oder aus dem Lager). */
  selectedId: string | null;
  /** Erlaubte Ankerzellen für das angehobene Möbelstück. */
  legal: { zone: RoomZone; x: number; y: number }[];
  /** Vorschau-Größe des angehobenen Stücks in Zellen. */
  ghost: { w: number; h: number; key: string } | null;
  /** Antippen: wählt an, ein zweites Antippen wählt wieder ab. */
  onSelect: (id: string) => void;
  /** Ziehen mit der Maus: wählt an, ohne je abzuwählen. */
  onGrab:   (id: string) => void;
  onDrop:   (zone: RoomZone, x: number, y: number) => void;
}

/** Laufende Maus-Ziehbewegung. Auf Touch bewusst nicht aktiv. */
interface DragState {
  id: string;
  /** Greifpunkt innerhalb des Möbelstücks, in SVG-Einheiten. */
  dx: number;
  dy: number;
  /** Aktuell angepeilte Ankerzelle. */
  x: number;
  y: number;
  valid: boolean;
}

interface Props {
  state:     RoomState;
  ownerName: string;
  vitrine: {
    collectibles: VitrineCollectible[];
    badges:       VitrineBadge[];
    trophies:     VitrineTrophy[];
  };
  onInteract: (target: InteractTarget) => void;
  /** Gesetzt = Bearbeiten-Modus: jedes Möbelstück ist anwählbar statt interaktiv. */
  edit?: EditHooks;
}

const VIEWBOX: Record<ZoneView, string> = {
  all:   `0 0 ${STAGE.width} ${STAGE.height}`,
  wall:  `0 0 ${STAGE.width} ${STAGE.wallHeight}`,
  floor: `0 ${STAGE.floorTop} ${STAGE.width} ${GRID.floor.rows * CELL}`,
};

const ZONE_TABS: { key: ZoneView; label: string }[] = [
  { key: "all",   label: "Ganzer Raum" },
  { key: "wall",  label: "Wand" },
  { key: "floor", label: "Boden" },
];

/** Seltenheits-Glow der Vitrine — SVG braucht echte Farben, keine Tailwind-Klassen. */
const RARITY_GLOW: Record<string, string> = {
  common:    "rgba(148,163,184,0.30)",
  rare:      "rgba(59,130,246,0.45)",
  epic:      "rgba(139,92,246,0.50)",
  legendary: "rgba(251,191,36,0.60)",
};

export default function RoomStage({ state, ownerName, vitrine, onInteract, edit }: Props) {
  const [view, setView] = useState<ZoneView>("all");
  const [hover, setHover] = useState<{ zone: RoomZone; x: number; y: number } | null>(null);

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

  const wallItems  = state.placed.filter(p => p.zone === "wall");
  // Von hinten nach vorn zeichnen, damit tiefer stehende Möbel oben liegen.
  const floorItems = [...state.placed.filter(p => p.zone === "floor")].sort((a, b) => a.y - b.y);
  const vitrineItem = state.placed.find(p => p.key === "vitrine");

  function renderItem(item: PlacedItem) {
    const def = getRoomItem(item.key);
    if (!def) return null;

    // ── Bearbeiten: jedes Möbelstück ist anwählbar (Tap) oder ziehbar (Maus) ──
    if (edit) {
      const isSelected  = edit.selectedId === item.id;
      const isDragging  = drag?.id === item.id;
      const { x, y } = cellToSvg(item.zone, isDragging ? drag!.x : item.x, isDragging ? drag!.y : item.y);

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
            const origin = cellToSvg(item.zone, item.x, item.y);
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
              const wallOffsetY = item.zone === "floor" ? STAGE.floorTop : 0;
              const grid = GRID[item.zone];
              let cellX = Math.round((p.x - current.dx) / CELL);
              let cellY = Math.round((p.y - current.dy - wallOffsetY) / CELL);
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
          <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} />
          {(isSelected || isDragging) && (
            <rect
              x={x - 2} y={y - 2} width={def.w * CELL + 4} height={def.h * CELL + 4}
              rx={4} fill="none"
              stroke={isDragging && !drag!.valid ? "#ef4444" : "var(--room-screen-on)"}
              strokeWidth={3} strokeDasharray="7 5"
            />
          )}
        </g>
      );
    }

    const { x, y } = cellToSvg(item.zone, item.x, item.y);

    if (!def.interactive) {
      return <RoomItemSprite key={item.id} itemKey={item.key} x={x} y={y} flipped={item.flipped} />;
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
        onClick={() => onInteract(target)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onInteract(target); }
        }}
      >
        <title>{label}</title>
        <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} />
      </g>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Zonen-Umschalter ──────────────────────────────────────────
          Auf schmalen Displays verdoppelt eine Zonenansicht die effektive
          Zellgröße — damit werden auch 1×1-Möbel bequem antippbar. */}
      <div className="flex items-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 w-fit">
        {ZONE_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setView(tab.key)}
            aria-pressed={view === tab.key}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
              view === tab.key
                ? "bg-teal-500/15 text-teal-300 border border-teal-500/25"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass card-shine rounded-2xl p-2 sm:p-3 room-stage-scroll scrollbar-none">
        <svg
          className="room-stage rounded-xl"
          viewBox={VIEWBOX[view]}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Gaming-Zimmer von ${ownerName}`}
        >
          <defs>
            <SurfacePatterns wallpaperKey={state.wallpaperKey} floorKey={state.floorKey} />
          </defs>

          {/* Wand */}
          <rect x={0} y={0} width={STAGE.width} height={STAGE.wallHeight} fill="url(#room-wallpaper)" />
          {/* Boden */}
          <rect x={0} y={STAGE.floorTop} width={STAGE.width} height={GRID.floor.rows * CELL} fill="url(#room-floor)" />
          {/* Sockelleiste als Trennkante zwischen Wand und Boden */}
          <rect x={0} y={STAGE.floorTop - 6} width={STAGE.width} height={10} fill="var(--room-skirting)" />
          <rect x={0} y={STAGE.floorTop - 6} width={STAGE.width} height={2} fill="var(--room-outline)" />

          {wallItems.map(renderItem)}
          {floorItems.map(renderItem)}

          {vitrineItem && !edit && (
            <VitrineContent item={vitrineItem} vitrine={vitrine} />
          )}

          {/* ── Erlaubte Zielplätze ──────────────────────────────────
              Liegen über den Möbeln, damit sie immer treffbar sind.
              Berechnet mit derselben validatePlacement() wie der Server. */}
          {edit && edit.legal.map(cell => {
            const { x, y } = cellToSvg(cell.zone, cell.x, cell.y);
            const isHover = hover?.zone === cell.zone && hover.x === cell.x && hover.y === cell.y;
            return (
              <g key={`${cell.zone}-${cell.x}-${cell.y}`}>
                {isHover && edit.ghost && (
                  <rect
                    x={x} y={y} width={edit.ghost.w * CELL} height={edit.ghost.h * CELL}
                    rx={4} fill="var(--room-screen-on)" opacity={0.22} pointerEvents="none"
                  />
                )}
                <rect
                  className="room-cell-ok"
                  x={x + 6} y={y + 6} width={CELL - 12} height={CELL - 12} rx={5}
                  role="button" tabIndex={0}
                  aria-label={`Hier absetzen (${cell.zone === "wall" ? "Wand" : "Boden"}, Spalte ${cell.x + 1}, Reihe ${cell.y + 1})`}
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
  );
}

// ── Vitrinen-Inhalt ──────────────────────────────────────────────────────────

function VitrineContent({
  item, vitrine,
}: {
  item: PlacedItem;
  vitrine: Props["vitrine"];
}) {
  const { x: ox, y: oy } = cellToSvg(item.zone, item.x, item.y);

  return (
    <g pointerEvents="none" transform={`translate(${ox},${oy})`}>
      {/* Pokale im oberen Fach */}
      {vitrine.trophies.slice(0, VITRINE_SLOTS.trophies.length).map((t, i) => {
        const slot = VITRINE_SLOTS.trophies[i];
        return <TrophySlot key={`${t.scopeType}:${t.scopeValue}`} trophy={t} {...slot} />;
      })}

      {/* Sammlerstücke in den mittleren Fächern */}
      {vitrine.collectibles.slice(0, VITRINE_SLOTS.collectibles.length).map((c, i) => {
        const slot = VITRINE_SLOTS.collectibles[i];
        return (
          <g key={c.id}>
            <circle
              cx={slot.x + slot.s / 2} cy={slot.y + slot.s / 2} r={slot.s * 0.55}
              fill={RARITY_GLOW[c.rarity] ?? RARITY_GLOW.common}
            />
            {c.imageUrl
              ? <image href={c.imageUrl} x={slot.x} y={slot.y} width={slot.s} height={slot.s}
                  preserveAspectRatio="xMidYMid meet" />
              : <rect x={slot.x + 4} y={slot.y + 4} width={slot.s - 8} height={slot.s - 8} rx={3}
                  fill="var(--room-plastic-hi)" />}
          </g>
        );
      })}

      {/* Abzeichen auf der Sockelleiste */}
      {vitrine.badges.slice(0, VITRINE_SLOTS.badges.length).map((b, i) => {
        const slot = VITRINE_SLOTS.badges[i];
        return (
          <text
            key={b.key} x={slot.x + slot.s / 2} y={slot.y + slot.s / 2}
            textAnchor="middle" dominantBaseline="central" fontSize={slot.s}
          >
            {b.icon}
          </text>
        );
      })}
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

// ── Wand- und Bodenmuster ────────────────────────────────────────────────────

/**
 * Tapeten und Böden als SVG-Muster. Beide zeichnen auf den --room-* Tokens,
 * damit der Theme-Wechsel auch die Flächen mitnimmt.
 */
function SurfacePatterns({ wallpaperKey, floorKey }: { wallpaperKey: string; floorKey: string }) {
  return (
    <>
      <pattern id="room-wallpaper" width={64} height={64} patternUnits="userSpaceOnUse">
        <rect width={64} height={64} fill="var(--room-wall)" />
        {wallpaperKey === "tapete_pixel" && (
          <g fill="var(--room-neon-violet)" opacity={0.16}>
            {[0, 16, 32, 48].map(a => [0, 16, 32, 48].map(b => (
              <rect key={`${a}-${b}`} x={a + ((b / 16) % 2) * 8} y={b} width={8} height={8} />
            )))}
          </g>
        )}
        {wallpaperKey === "tapete_scifi" && (
          <g stroke="var(--room-neon-teal)" strokeWidth={1.5} opacity={0.22} fill="none">
            <rect x={4} y={4} width={56} height={26} rx={3} />
            <rect x={4} y={34} width={56} height={26} rx={3} />
            <line x1={32} y1={4} x2={32} y2={30} />
          </g>
        )}
        {wallpaperKey === "tapete_raufaser" && (
          <g fill="var(--room-wall-line)">
            {[[9, 14], [27, 8], [46, 22], [17, 39], [38, 47], [55, 33], [6, 55], [50, 58]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={1.6} />
            ))}
          </g>
        )}
      </pattern>

      <pattern id="room-floor" width={64} height={64} patternUnits="userSpaceOnUse">
        <rect width={64} height={64} fill="var(--room-floor)" />
        {floorKey === "boden_holz" && (
          <g>
            <rect y={0}  width={64} height={31} fill="var(--room-wood)" opacity={0.55} />
            <rect y={33} width={64} height={31} fill="var(--room-wood)" opacity={0.42} />
            <line x1={0} y1={32} x2={64} y2={32} stroke="var(--room-outline)" strokeWidth={1} />
            <line x1={22} y1={0} x2={22} y2={31} stroke="var(--room-outline)" strokeWidth={1} />
            <line x1={44} y1={33} x2={44} y2={64} stroke="var(--room-outline)" strokeWidth={1} />
          </g>
        )}
        {floorKey === "boden_scifi" && (
          <g stroke="var(--room-neon-teal)" strokeWidth={1} opacity={0.25} fill="none">
            <rect x={2} y={2} width={60} height={60} />
            <line x1={2} y1={32} x2={62} y2={32} />
            <line x1={32} y1={2} x2={32} y2={62} />
          </g>
        )}
        {floorKey === "boden_linoleum" && (
          <g fill="var(--room-shade)" opacity={0.5}>
            <ellipse cx={20} cy={24} rx={7} ry={4} />
            <ellipse cx={48} cy={46} rx={5} ry={3} />
          </g>
        )}
      </pattern>
    </>
  );
}

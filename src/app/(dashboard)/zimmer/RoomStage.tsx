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

/** Seltenheits-Glow der Vitrine — SVG braucht echte Farben, keine Tailwind-Klassen. */
const RARITY_GLOW: Record<string, string> = {
  common:    "rgba(148,163,184,0.30)",
  rare:      "rgba(59,130,246,0.45)",
  epic:      "rgba(139,92,246,0.50)",
  legendary: "rgba(251,191,36,0.60)",
};

export default function RoomStage({ state, ownerName, vitrine, onInteract, edit }: Props) {
  const [hover, setHover] = useState<{ zone: RoomZone; x: number; y: number } | null>(null);

  // ── Bildschirm-Zoom: "in den Monitor reinzoomen" beim Anklicken ───────
  // Ein kurzer Punch-in auf den Klickpunkt, bevor sich das Profil-Popup
  // darüberlegt — rein kosmetisch, läuft unabhängig vom Modal-Zustand und
  // setzt sich nach der Animation von selbst zurück.
  const [screenZoom, setScreenZoom] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  // Die Vitrine ist kein Katalog-Platzierungsobjekt mehr, sondern ein festes
  // Bühnenelement (siehe VitrinePanel unten) — ältere `placed`-Zeilen aus der
  // Zeit davor (schon materialisierte Zimmer) werden hier defensiv
  // rausgefiltert, damit sie nicht doppelt gerendert werden.
  //
  // Wand und Boden teilen sich seit der Zusammenlegung dieselbe Fläche —
  // EINE Liste, von hinten nach vorn nach y sortiert, damit weiter vorn
  // (weiter unten) stehende Möbel näher an der Wand hängende Deko überdecken.
  const items = [...state.placed.filter(p => p.key !== "vitrine")].sort((a, b) => a.y - b.y);

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
              const grid = GRID[item.zone];
              let cellX = Math.round((p.x - current.dx) / CELL);
              let cellY = Math.round((p.y - current.dy) / CELL);
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
      return <RoomItemSprite key={item.id} itemKey={item.key} x={x} y={y} flipped={item.flipped} className="room-item-photo" />;
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
        {/* Atmender Rahmen: einziger Hinweis, dass dieses Möbelstück anklickbar
            ist und nicht nur Deko — ohne ihn sehen Jobbrett und Monitore
            identisch zu jedem anderen Möbelstück aus. */}
        <rect
          x={x - 4} y={y - 4} width={def.w * CELL + 8} height={def.h * CELL + 8} rx={6}
          className="room-interactive-glow" fill="none" stroke="var(--room-screen-on)" strokeWidth={2}
          pointerEvents="none"
        />
        {/* Zusätzlicher Bildschirm-Leuchtschein NUR bei Monitoren — der
            atmende Rahmen allein sagt "anklickbar", aber nicht "hier läuft
            gerade etwas". Ein pulsierender Lichtschein hinter dem Gerät liest
            sich eindeutig als eingeschalteter, aktiver Bildschirm. */}
        {target === "crt" && (
          <ellipse
            cx={x + (def.w * CELL) / 2} cy={y + def.h * CELL * 0.42}
            rx={def.w * CELL * 0.6} ry={def.h * CELL * 0.45}
            className="room-screen-glow" fill="var(--room-screen-on)"
            filter="url(#room-blur-md)" pointerEvents="none"
          />
        )}
        <RoomItemSprite itemKey={item.key} x={x} y={y} flipped={item.flipped} className="room-item-photo" />
      </g>
    );
  }

  return (
    <div className="space-y-3">
      {/* Vitrine + Raum nebeneinander, gleich hoch: die Vitrine ist bewusst
          KEIN Rasterelement mehr (siehe VitrinePanel) — links neben dem
          eigentlichen Zimmer, über dessen volle Höhe, damit die
          Ausstellungsstücke deutlich größer und lesbarer sind, als es eine
          einzelne Rasterzelle je erlauben würde. */}
      <div className="flex items-stretch gap-3">
        <VitrinePanel ownerName={ownerName} vitrine={vitrine} onInteract={onInteract} editing={!!edit} />

        <div className="glass card-shine rounded-2xl p-2 sm:p-3 room-stage-scroll scrollbar-none min-w-0 flex-1">
          <svg
            ref={svgRef}
          className={cn("room-stage rounded-xl", screenZoom && "room-stage-zoom")}
          style={screenZoom ? { transformOrigin: `${screenZoom.x}% ${screenZoom.y}%` } : undefined}
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Gaming-Zimmer von ${ownerName}`}
        >
          <defs>
            <SurfacePatterns wallpaperKey={state.wallpaperKey} />
          </defs>

          {/* Eine durchgehende Wandfläche über die volle Bühnenhöhe — kein
              separates Bodenstück mehr. In dieser reinen Frontalansicht gibt
              es ohnehin keine sichtbare Bodenfläche, nur Möbel, die vor der
              Wand stehen oder daran hängen; zwei optisch getrennte Flächen
              hätten fälschlich suggeriert, Möbel LÄGEN auf einem Boden statt
              STÜNDEN im Raum. */}
          <rect x={0} y={0} width={STAGE.width} height={STAGE.height} fill="url(#room-wallpaper-photo)" />

          <RoomWindow />
          <CeilingLamp />

          <rect x={0} y={0} width={STAGE.width} height={STAGE.height} fill="url(#room-wall-vignette)" />

          {/* Kontaktschatten: verankert jedes Möbelstück mit mustStandOn:"floor"
              optisch am Boden statt es auf der Textur schweben zu lassen — der
              Unterschied zwischen einem Foto-Ausschnitt und einem Objekt, das
              wirklich im Raum steht. */}
          {items.map(item => {
            const def = getRoomItem(item.key);
            // Nur Möbel, deren Unterkante wirklich die unterste Rasterzeile
            // berührt — Monitore & Co. auf einem Tisch bekommen sonst einen
            // Schatten, der mitten in der Luft schwebt.
            if (!def || item.y + def.h !== GRID.floor.rows) return null;
            const { x, y } = cellToSvg(item.zone, item.x, item.y);
            const cx = x + (def.w * CELL) / 2;
            const cy = y + def.h * CELL;
            return (
              <ellipse
                key={`shadow-${item.id}`}
                cx={cx} cy={cy}
                rx={def.w * CELL * 0.44} ry={Math.min(9, def.h * CELL * 0.09)}
                fill="#000000" opacity={0.4}
                filter="url(#room-blur-md)"
              />
            );
          })}

          {/* Ecken-Tiefe: die Bühne ist eine Frontalansicht ohne Seitenwände —
              ohne diese Verdunklung an den Rändern wirkt der Raum wie eine
              endlos breite Fläche statt wie eine geschlossene Box. */}
          <rect x={0} y={0} width={STAGE.width} height={STAGE.height} fill="url(#room-corner-vignette)" pointerEvents="none" />

          {items.map(renderItem)}

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
    </div>
  );
}

// ── Vitrine: eigenständiges Panel, losgelöst vom Raster ─────────────────────

/** Eigene Koordinatenbreite der Vitrine, an den 281×655-Bildausschnitt von
 *  public/room-items/vitrine.png angenähert, bei fester Höhe = volle
 *  Raumhöhe (Wand + Boden zusammen). */
const VITRINE_PANEL_W = 240;

/**
 * Die Vitrine ist bewusst KEIN Katalog-Möbelstück im Raster mehr, sondern ein
 * eigenständiges Panel links neben dem Zimmer, über dessen komplette Höhe.
 * Zwei Gründe: (1) wer die Vitrine eines fremden Zimmers ansehen will, soll
 * sie nicht erst zwischen anderen Möbeln suchen müssen — sie steht immer am
 * selben Fleck, außerhalb jeder Umgestaltung. (2) losgelöst von einer
 * Bodenzelle darf sie so groß sein, wie sie für lesbare Namensplaketten
 * unter jedem Pokal/Sammelstück/Abzeichen tatsächlich sein muss, statt sich
 * dem 64px-Raster unterzuordnen.
 */
function VitrinePanel({
  ownerName, vitrine, onInteract, editing,
}: {
  ownerName: string;
  vitrine:   Props["vitrine"];
  onInteract: (target: InteractTarget, itemKey?: string) => void;
  editing:   boolean;
}) {
  const vw = VITRINE_PANEL_W;
  const vh = STAGE.height;
  const label = `Sammlung von ${ownerName} anzeigen`;

  return (
    <div className="glass card-shine rounded-2xl p-2 sm:p-3 shrink-0 self-stretch">
      {/* `block` ist Pflicht, kein Stil-Detail: SVGs sind standardmäßig
          `display:inline`, und ein `height:100%` auf einem INLINE Replaced
          Element in einem höhenauto-Flex-Geschwister ist zirkulär — der
          Browser lässt die Höhe dabei bis zu mehreren tausend Pixeln
          hochlaufen, statt sie sauber an das gestreckte Wand-Nachbarelement
          anzugleichen (die Vitrine wirkte dadurch "kaum sichtbar", weil sie
          weit über den Bildschirmrand hinausragte). `.room-stage` daneben
          funktioniert nur, weil es in globals.css explizit `display:block`
          bekommt. */}
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        className="block h-full w-auto rounded-xl"
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
            <VitrineContent x={0} y={0} vitrine={vitrine} />
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
            <PlaqueLabel x={slot.x + slot.s / 2} y={slot.plaqueY} text={c.name} />
          </g>
        );
      })}

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
 * deshalb zusätzlich in einem `<title>`-Tooltip. Der eigentliche Lesetext
 * bleibt ohnehin VitrineModal vorbehalten, das beim Klick aufgeht.
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

/**
 * Ein Fenster mit Dämmerungs-Ausblick, fest links in der Wandzone verankert.
 * Der Grund für ein einzelnes, unbewegliches Fenster statt eines Katalog-Items:
 * es ist der stärkste einzelne Hinweis "hier ist drinnen", den eine reine
 * Frontalansicht ohne Seitenwände oder Decke geben kann — ein Raum ohne jede
 * Öffnung nach draußen liest sich als Lagerhalle, nicht als Zuhause.
 */
function RoomWindow() {
  const x = 64, y = 10, w = 192, h = 180;
  const paneX = x + 10, paneY = y + 10, paneW = w - 20, paneH = h - 20;
  return (
    <g>
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={4} fill="var(--room-wood)" />
      <rect x={paneX} y={paneY} width={paneW} height={paneH} fill="url(#room-window-sky)" />

      {/* Ferne, erleuchtete Fenster — deuten Nachbarhäuser an */}
      <g opacity={0.85}>
        <rect x={paneX + 14} y={paneY + paneH * 0.4} width={8} height={10} fill="var(--room-window-light)" filter="url(#room-blur-sm)" />
        <rect x={paneX + 14} y={paneY + paneH * 0.4} width={8} height={10} fill="var(--room-window-light)" />
        <rect x={paneX + 30} y={paneY + paneH * 0.55} width={7} height={9} fill="var(--room-window-light)" opacity={0.7} />
        <rect x={paneX + paneW - 24} y={paneY + paneH * 0.3} width={7} height={9} fill="var(--room-window-light)" opacity={0.75} />
      </g>

      {/* Sprossen */}
      <rect x={paneX + paneW / 2 - 2} y={paneY} width={4} height={paneH} fill="var(--room-wood)" opacity={0.9} />
      <rect x={paneX} y={paneY + paneH / 2 - 2} width={paneW} height={4} fill="var(--room-wood)" opacity={0.9} />
      <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={4} fill="none" stroke="var(--room-wood-hi)" strokeWidth={2} opacity={0.5} />

      {/* Fensterbank */}
      <rect x={x - 16} y={y + h + 4} width={w + 32} height={9} rx={2} fill="var(--room-wood-hi)" />

      {/* Vorhänge — gerafft an beiden Seiten, damit das Fenster nach echtem
          Zimmer aussieht statt nach eingebautem Bildschirm. */}
      <path d={`M${x - 10},${y - 8} Q${x + 6},${y + h * 0.5} ${x - 4},${y + h + 6} L${x - 22},${y + h + 2} Q${x - 16},${y + h * 0.5} ${x - 20},${y - 10} Z`}
        fill="var(--room-fabric)" opacity={0.92} />
      <path d={`M${x + w + 10},${y - 8} Q${x + w - 6},${y + h * 0.5} ${x + w + 4},${y + h + 6} L${x + w + 22},${y + h + 2} Q${x + w + 16},${y + h * 0.5} ${x + w + 20},${y - 10} Z`}
        fill="var(--room-fabric)" opacity={0.92} />
      <rect x={x - 26} y={y - 12} width={w + 52} height={6} rx={3} fill="var(--room-metal)" />
    </g>
  );
}

/** Pendelleuchte an der Decke, weit rechts vom Fenster — warmer Lichtfleck
 *  gegen die kühlen Bildschirm-Töne der Peripherie-Möbel. */
function CeilingLamp() {
  const cx = STAGE.width * 0.62;
  const bulbY = 46;
  return (
    <g pointerEvents="none">
      <ellipse cx={cx} cy={bulbY + 6} rx={70} ry={40} fill="var(--room-lamp-glow)" filter="url(#room-blur-md)" />
      <line x1={cx} y1={0} x2={cx} y2={bulbY - 8} stroke="var(--room-metal)" strokeWidth={2} />
      <path d={`M${cx - 20},${bulbY - 8} L${cx + 20},${bulbY - 8} L${cx + 12},${bulbY + 10} L${cx - 12},${bulbY + 10} Z`}
        fill="var(--room-metal)" stroke="var(--room-metal-hi)" strokeWidth={1} />
      <circle cx={cx} cy={bulbY + 16} r={7} fill="var(--room-neon-amber)" filter="url(#room-blur-sm)" opacity={0.9} />
      <circle cx={cx} cy={bulbY + 16} r={4} fill="var(--room-neon-amber)" />
    </g>
  );
}

// ── Wand- und Bodenmuster ────────────────────────────────────────────────────

/**
 * Tapeten, Böden und die Raum-Beleuchtung als SVG-Muster/-Gradienten. Alles
 * zeichnet auf den --room-* Tokens, damit der Theme-Wechsel die Flächen
 * mitnimmt.
 *
 * Die Vignetten existieren, weil die Möbel seit dem Umstieg auf Canva-Fotos
 * jedes für sich in seinem eigenen Studio-Licht aufgenommen wurden — ohne
 * eine gemeinsame Lichtstimmung im Hintergrund würden 30 unabhängig
 * beleuchtete Fotos nebeneinander nie wie ein einziger Raum wirken. Die
 * Gradienten sind bewusst objectBoundingBox-relativ (SVG-Standard) statt an
 * absoluten Bühnen-Koordinaten verankert, damit sie unabhängig von der
 * tatsächlichen Bühnengröße sauber zentriert bleiben.
 */
function SurfacePatterns({ wallpaperKey }: { wallpaperKey: string }) {
  return (
    <>
      <filter id="room-blur-sm" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={4} />
      </filter>
      <filter id="room-blur-md" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation={7} />
      </filter>

      {/* ── Dämmerungshimmel hinterm Fenster ── */}
      <linearGradient id="room-window-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="var(--room-window-sky-1)" />
        <stop offset="100%" stopColor="var(--room-window-sky-2)" />
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
        <stop offset="0%"   stopColor="#000000" stopOpacity={0.4} />
        <stop offset="7%"   stopColor="#000000" stopOpacity={0} />
        <stop offset="93%"  stopColor="#000000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000000" stopOpacity={0.4} />
      </linearGradient>

      {/* Fotografische Wandtextur über die volle Bühnenhöhe — dieselbe
          Bildhaftigkeit wie die Canva-Möbelfotos, statt einer flach
          gezeichneten Fläche. Die Kachel wiederholt sich nur seitlich; jede
          Datei enthält bereits Bild + gespiegeltes Bild nebeneinander, damit
          beim Wiederholen keine Kante sichtbar wird. */}
      <pattern id="room-wallpaper-photo" width={512} height={STAGE.height} patternUnits="userSpaceOnUse">
        <image href={WALL_PHOTOS[wallpaperKey] ?? WALL_PHOTOS.tapete_raufaser}
          x={0} y={0} width={512} height={STAGE.height} preserveAspectRatio="none" />
        <rect width={512} height={STAGE.height} fill="var(--room-shade)" opacity={0.1} />
      </pattern>
    </>
  );
}

const WALL_PHOTOS: Record<string, string> = {
  tapete_raufaser: "/room-surfaces/wall-raufaser.png",
  tapete_pixel:    "/room-surfaces/wall-pixel.png",
  tapete_scifi:    "/room-surfaces/wall-scifi.png",
};

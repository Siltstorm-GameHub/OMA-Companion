"use client";

/**
 * Vitrine: eigenständiges Panel, losgelöst vom Raster — geteilt zwischen der
 * SVG-Bühne (RoomStage.tsx) und der 3D-Bühne (RoomStage3D.tsx). Reines SVG,
 * unabhängig von der jeweiligen Zimmer-Rendering-Technik: die Vitrine zeigt
 * Trophäen/Pokale/Abzeichen als flache Icons mit Plakette, kein isometrisches
 * oder 3D-Element, darum lohnt sich hier kein Rewrite — nur ein Umzug in eine
 * gemeinsam importierbare Datei.
 *
 * Die Vitrine ist bewusst KEIN Katalog-Möbelstück im Raster, sondern ein
 * eigenständiges Panel neben dem Zimmer, über dessen komplette Höhe. Zwei
 * Gründe: (1) wer die Vitrine eines fremden Zimmers ansehen will, soll sie
 * nicht erst zwischen anderen Möbeln suchen müssen — sie steht immer am
 * selben Fleck, außerhalb jeder Umgestaltung. (2) losgelöst von einer
 * Bodenzelle darf sie so groß sein, wie sie für lesbare Namensplaketten unter
 * jedem Pokal/Sammelstück/Abzeichen tatsächlich sein muss.
 */

import { CATEGORY_CONFIG, GENRE_CONFIG } from "@/lib/wanderpocal";
import { POKAL_CATEGORY_IMAGE } from "@/lib/pokal";
import type { VitrineItem } from "@/lib/room-vitrine";
import { VITRINE_SLOTS } from "./sprites";
import { cn } from "@/lib/utils";

export type VitrineInteractTarget = "crt" | "vitrine" | "jobboard";

interface VitrineData {
  slots:       (VitrineItem | null)[];
  hiddenCount: number;
}

/** Eigene Koordinatenbreite der Vitrine, an den 281×655-Bildausschnitt von
 *  public/room-items/vitrine.png angenähert, bei fester Höhe = volle
 *  Raumhöhe der Bühne. */
const VITRINE_PANEL_W = 240;
const VITRINE_PANEL_H = 576;

export function VitrinePanel({
  ownerName, vitrine, readOnly, onInteract, editing, measuredHeight,
}: {
  ownerName: string;
  vitrine:   VitrineData;
  readOnly:  boolean;
  onInteract: (target: VitrineInteractTarget, itemKey?: string, slotIndex?: number) => void;
  editing:   boolean;
  /**
   * Per ResizeObserver gemessene Pixel-Höhe der Bühne nebenan. `null` nur im
   * allerersten Render, bevor der erste Messwert eintrifft — bis dahin greift
   * `self-stretch` als CSS-Fallback.
   */
  measuredHeight: number | null;
}) {
  const vw = VITRINE_PANEL_W;
  const vh = VITRINE_PANEL_H;
  const label = `Sammlung von ${ownerName} anzeigen`;

  return (
    <div
      className={cn(
        "glass card-shine rounded-2xl p-2 sm:p-3 shrink-0",
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
        {/* Im Bearbeiten-Modus nur sichtbar, nicht anklickbar — sie lässt sich
            ohnehin nicht verschieben, ein Klick soll dort nicht mitten in der
            Möbel-Auswahl ein Modal aufreißen. */}
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
            <VitrineContent x={0} y={0} vitrine={vitrine} readOnly={readOnly} onSlotClick={idx => onInteract("vitrine", undefined, idx)} />
          </g>
        )}
      </svg>
    </div>
  );
}

/**
 * Größter Plakettentext, der zwischen zwei benachbarten Fächern derselben
 * Reihe noch Platz hat, ohne die Nachbarplakette zu berühren — abgeleitet aus
 * dem tatsächlichen Fächerabstand in VITRINE_SLOTS statt einer festen Breite,
 * die bei enger stehenden Fächern (Abzeichen-Sockelleiste) längst überlappte.
 */
function slotMaxPlaqueWidth(slots: readonly { x: number; y: number; s: number }[]): number {
  const xsByRow = new Map<number, number[]>();
  for (const s of slots) xsByRow.set(s.y, [...(xsByRow.get(s.y) ?? []), s.x]);
  let gap = Infinity;
  for (const xs of xsByRow.values()) {
    xs.sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
  }
  // 6px Luft zwischen zwei Plaketten derselben Reihe.
  return Number.isFinite(gap) ? gap - 6 : 104;
}

const TROPHY_PLAQUE_MAX_W = slotMaxPlaqueWidth(VITRINE_SLOTS.trophies);
const POKAL_PLAQUE_MAX_W  = slotMaxPlaqueWidth(VITRINE_SLOTS.pokale);
const BADGE_PLAQUE_MAX_W  = slotMaxPlaqueWidth(VITRINE_SLOTS.badges);

/**
 * Flache Fach-Liste (Index 0..14), Reihenfolge Trophäen→Pokale→Abzeichen —
 * muss mit VITRINE_SLOT_RANGES in room-vitrine.ts übereinstimmen, das den
 * Server bestimmt, welcher Fach-Index welchen Standard-Inhalt bekommt.
 */
const ALL_SLOTS: { x: number; y: number; s: number; plaqueY: number; maxW: number }[] = [
  ...VITRINE_SLOTS.trophies.map(s => ({ ...s, maxW: TROPHY_PLAQUE_MAX_W })),
  ...VITRINE_SLOTS.pokale.map(s => ({ ...s, maxW: POKAL_PLAQUE_MAX_W })),
  ...VITRINE_SLOTS.badges.map(s => ({ ...s, maxW: BADGE_PLAQUE_MAX_W })),
];

function itemLabel(item: VitrineItem): string {
  if (item.kind === "trophy") {
    return item.scopeType === "genre"
      ? GENRE_CONFIG[item.scopeValue]?.title ?? item.scopeValue
      : CATEGORY_CONFIG[item.scopeValue]?.title ?? item.scopeValue;
  }
  if (item.kind === "pokal") return item.title;
  return item.name;
}

function VitrineContent({
  x, y, vitrine, readOnly, onSlotClick,
}: {
  x: number; y: number;
  vitrine: VitrineData;
  readOnly: boolean;
  onSlotClick: (index: number) => void;
}) {
  return (
    <g transform={`translate(${x},${y})`}>
      {ALL_SLOTS.map((slot, i) => {
        const item = vitrine.slots[i] ?? null;
        // Ein leeres Fach in einem fremden Zimmer ist nicht interaktiv — es
        // gibt dort nichts zu sehen und nichts zu bearbeiten.
        const clickable = !!item || !readOnly;
        const label = item
          ? itemLabel(item)
          : readOnly ? "Leeres Fach" : "Fach frei — anklicken, um etwas auszustellen";
        return (
          <g
            key={i}
            className={clickable ? "room-hit" : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={label}
            onClick={clickable ? e => { e.stopPropagation(); onSlotClick(i); } : undefined}
            onKeyDown={clickable ? e => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSlotClick(i); }
            } : undefined}
          >
            <title>{label}</title>
            <Pedestal x={slot.x} y={slot.y} s={slot.s} />
            {item ? (
              <>
                <VitrineItemVisual item={item} x={slot.x} y={slot.y} s={slot.s} />
                <PlaqueLabel x={slot.x + slot.s / 2} y={slot.plaqueY} text={label} maxWidth={slot.maxW} />
              </>
            ) : !readOnly && (
              <EmptySlotAddButton x={slot.x} y={slot.y} s={slot.s} />
            )}
          </g>
        );
      })}
      {vitrine.hiddenCount > 0 && (
        <g transform={`translate(${VITRINE_PANEL_W - 22},${16})`}>
          <title>{`+${vitrine.hiddenCount} weitere in der Sammlung — insgesamt einsehbar per Klick auf ein Fach`}</title>
          <circle r={9} fill="var(--room-metal-hi)" stroke="var(--room-shade)" strokeWidth={0.75} />
          <text x={0} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}
            fill="var(--room-plastic)" pointerEvents="none">
            +{vitrine.hiddenCount}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Kleine silberne Ausstellungsplattform — steht IMMER an jedem Fach, auch
 * wenn (noch) nichts darauf ausgestellt ist. Ohne sie wirkte ein leeres Fach
 * wie eine kaputte Stelle in der Vitrine statt wie eine Einladung, etwas
 * hineinzustellen.
 */
function Pedestal({ x, y, s }: { x: number; y: number; s: number }) {
  const w = s * 0.82;
  const cx = x + s / 2;
  const baseY = y + s * 0.98;
  const capH = s * 0.1;
  return (
    <g pointerEvents="none">
      <ellipse cx={cx} cy={baseY} rx={w / 2} ry={capH * 0.6} fill="var(--room-shade)" opacity={0.35} />
      <rect x={cx - w / 2} y={baseY - capH} width={w} height={capH} rx={capH * 0.3}
        fill="var(--room-metal)" stroke="var(--room-shade)" strokeWidth={0.6} />
      <ellipse cx={cx} cy={baseY - capH} rx={w / 2} ry={capH * 0.55}
        fill="var(--room-metal-hi)" stroke="var(--room-shade)" strokeWidth={0.6} />
    </g>
  );
}

/**
 * Sichtbarer "+"-Knopf über einem leeren Fach der eigenen Vitrine — ohne ihn
 * ist das leere Fach nur eine unauffällige Plattform, bei der niemand ahnt,
 * dass ein Klick den Auswahl-Dialog öffnet. Nur im eigenen Zimmer gerendert
 * (siehe `!readOnly` am Aufrufer), fremde Vitrinen zeigen nur die Plattform.
 */
function EmptySlotAddButton({ x, y, s }: { x: number; y: number; s: number }) {
  const cx = x + s / 2;
  const cy = y + s * 0.42;
  const r  = Math.max(8, s * 0.24);
  return (
    <g pointerEvents="none" opacity={0.85}>
      <circle cx={cx} cy={cy} r={r} fill="var(--room-metal)" stroke="var(--room-shade)" strokeWidth={0.75} />
      <line x1={cx - r * 0.45} y1={cy} x2={cx + r * 0.45} y2={cy} stroke="var(--room-plastic)" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={cx} y1={cy - r * 0.45} x2={cx} y2={cy + r * 0.45} stroke="var(--room-plastic)" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function VitrineItemVisual({ item, x, y, s }: { item: VitrineItem; x: number; y: number; s: number }) {
  if (item.kind === "trophy") {
    const genre = item.scopeType === "genre" ? GENRE_CONFIG[item.scopeValue] : null;
    if (genre) return <image href={genre.icon} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
    const emoji = CATEGORY_CONFIG[item.scopeValue]?.emoji ?? "🏆";
    return (
      <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.82}>
        {emoji}
      </text>
    );
  }
  if (item.kind === "pokal") {
    return (
      <>
        <circle
          cx={x + s / 2} cy={y + s / 2} r={s * (item.isSeries ? 0.62 : 0.5)}
          fill={item.isSeries ? "rgba(251,191,36,0.35)" : "rgba(148,163,184,0.25)"}
          stroke={item.isSeries ? "rgba(251,191,36,0.75)" : "none"}
          strokeWidth={item.isSeries ? 1.5 : 0}
        />
        <image href={POKAL_CATEGORY_IMAGE[item.category as keyof typeof POKAL_CATEGORY_IMAGE]}
          x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" />
      </>
    );
  }
  return (
    <text x={x + s / 2} y={y + s / 2} textAnchor="middle" dominantBaseline="central" fontSize={s}>
      {item.icon}
    </text>
  );
}

/**
 * Kleine gravierte Plakette unter jedem Ausstellungsstück — bei der winzigen
 * Größe auf der Bühne eher Textur als Fließtext lesbar, der volle Name steckt
 * deshalb zusätzlich in einem `<title>`-Tooltip. Der Tooltip greift aber nur
 * bei Maus-Hover — auf Touch ist er unerreichbar. Der eigentliche Lesetext
 * bleibt deshalb bewusst VitrineModal vorbehalten: ein Tap irgendwo in der
 * Vitrine (auch auf der Plakette) öffnet es — Touch-Nutzer verlieren also
 * nichts, sie überspringen nur den Hover-Zwischenschritt.
 */
function PlaqueLabel({ x, y, text, maxWidth }: { x: number; y: number; text: string; maxWidth: number }) {
  // Zeichenbudget aus der verfügbaren Breite ableiten, statt der Breite einen
  // festen Zeichentext aufzuzwingen — sonst ragt die Plakette bei eng
  // stehenden Fächern (z. B. Abzeichen-Sockelleiste) in die Nachbarin.
  const maxChars = Math.max(3, Math.floor(maxWidth / 8.3));
  const short = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  const plaqueW = Math.min(maxWidth, Math.max(24, short.length * 8.3));
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

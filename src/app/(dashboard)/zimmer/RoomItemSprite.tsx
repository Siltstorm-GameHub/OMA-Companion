"use client";

import { getRoomItem } from "@/lib/room-items";
import { CELL } from "@/lib/room-layout";
import { SPRITES } from "./sprites";

interface Props {
  itemKey:  string;
  /** Position in SVG-Einheiten (bereits mit CELL multipliziert). */
  x:        number;
  y:        number;
  flipped?: boolean;
  className?: string;
}

/**
 * Verteiler zwischen echtem Sprite-Bild und handgebautem SVG.
 *
 * Sobald am Katalog-Eintrag ein `imageUrl` hinterlegt ist (z.B. Pixelart aus
 * dem Supabase Storage), wird das Bild gerendert. Bis dahin zeichnet das
 * Inline-SVG aus ./sprites — Item für Item austauschbar, ohne Code-Umbau.
 */
export default function RoomItemSprite({ itemKey, x, y, flipped, className }: Props) {
  const def = getRoomItem(itemKey);
  if (!def) return null;

  const w = def.w * CELL;
  const h = def.h * CELL;

  if (def.imageUrl) {
    return (
      <image
        href={def.imageUrl} x={x} y={y} width={w} height={h}
        preserveAspectRatio="xMidYMax meet" className={className}
      />
    );
  }

  const Sprite = SPRITES[itemKey] ?? SPRITES.__fallback;
  const flip   = flipped ? ` translate(${w},0) scale(-1,1)` : "";

  return (
    <g transform={`translate(${x},${y})${flip}`} className={className}>
      <Sprite w={w} h={h} />
    </g>
  );
}

/**
 * Einzelnes Möbelstück in einer eigenen kleinen SVG-Box — für Shop-Kacheln
 * und die Lager-Liste, wo kein Bühnen-Koordinatensystem existiert.
 */
export function RoomItemPreview({ itemKey, size = 72 }: { itemKey: string; size?: number }) {
  const def = getRoomItem(itemKey);
  if (!def) return null;

  // Flächen (Tapeten/Böden) haben keine Rastergröße — sie bekommen eine
  // quadratische Materialprobe statt eines Möbel-Sprites.
  if (def.w === 0 || def.h === 0) {
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={def.label}>
        <rect x={2} y={2} width={60} height={60} rx={4}
          fill={def.category === "tapete" ? "var(--room-wall)" : "var(--room-floor)"}
          stroke="var(--room-outline)" strokeWidth={2} />
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={i} x1={2} y1={12 + i * 10} x2={62} y2={12 + i * 10}
            stroke="var(--room-wall-line)" strokeWidth={2} />
        ))}
      </svg>
    );
  }

  const w = def.w * CELL;
  const h = def.h * CELL;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={size * (w >= h ? 1 : w / h)} height={size * (h >= w ? 1 : h / w)}
      role="img" aria-label={def.label} style={{ maxWidth: "100%", height: "auto" }}>
      <RoomItemSprite itemKey={itemKey} x={0} y={0} />
    </svg>
  );
}

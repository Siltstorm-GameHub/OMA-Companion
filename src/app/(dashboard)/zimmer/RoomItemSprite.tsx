"use client";

import { useState } from "react";
import { getRoomItem, type RoomItemDef } from "@/lib/room-items";
import { CELL } from "@/lib/room-layout";
import { SPRITES } from "./sprites";

interface Props {
  itemKey:  string;
  /** Position in SVG-Einheiten (bereits mit CELL multipliziert). */
  x:        number;
  y:        number;
  flipped?: boolean;
  className?: string;
  /**
   * Ob `def.renderScale` angewendet wird. Auf der Bühne gewollt (Möbel darf
   * sichtbar über seine Rasterzelle hinausragen); in der kleinen Shop-/Lager-
   * Vorschau dagegen aus, weil deren `<svg viewBox>` exakt auf die Zellgröße
   * zugeschnitten ist und ein größer gerenderter Bildausschnitt dort oben
   * abgeschnitten würde.
   */
  applyRenderScale?: boolean;
}

/**
 * Verteiler zwischen echtem Sprite-Bild und handgebautem SVG.
 *
 * Sobald am Katalog-Eintrag ein `imageUrl` hinterlegt ist (z.B. Pixelart aus
 * dem Supabase Storage), wird das Bild gerendert. Bis dahin zeichnet das
 * Inline-SVG aus ./sprites — Item für Item austauschbar, ohne Code-Umbau.
 */
export default function RoomItemSprite({ itemKey, x, y, flipped, className, applyRenderScale = true }: Props) {
  const def = getRoomItem(itemKey);
  if (!def) return null;

  const w = def.w * CELL;
  const h = def.h * CELL;

  if (def.imageUrl) {
    return (
      <RoomItemPhoto def={def} x={x} y={y} w={w} h={h} className={className}
        scale={applyRenderScale ? (def.renderScale ?? 1) : 1} />
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
 * Rendert das Canva-Foto eines Möbelstücks — mit sanftem Einblenden statt
 * hartem Pop-in (34 Fotos laden nicht alle gleich schnell) und optionalem
 * `renderScale`-Boost für Items, die ihre Rasterzelle schlecht ausfüllen.
 * Der Boost vergrößert gleichmäßig um den unteren Mittelpunkt (dieselbe
 * Verankerung, die `preserveAspectRatio="xMidYMax meet"` ohnehin nutzt) —
 * das Möbelstück wächst dadurch leicht über seine Zelle hinaus, statt seine
 * Position zu verschieben.
 */
function RoomItemPhoto({
  def, x, y, w, h, scale, className,
}: {
  def: RoomItemDef; x: number; y: number; w: number; h: number; scale: number; className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const rw = w * scale;
  const rh = h * scale;
  const rx = x - (rw - w) / 2;
  const ry = y - (rh - h);

  return (
    <image
      href={def.imageUrl} x={rx} y={ry} width={rw} height={rh}
      preserveAspectRatio="xMidYMax meet" className={className}
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.35s ease" }}
    />
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
      <RoomItemSprite itemKey={itemKey} x={0} y={0} applyRenderScale={false} />
    </svg>
  );
}

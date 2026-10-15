"use client";

import { combinedElementStyle, elementPositionStyle, useVisibilityCycles } from "./motion";
import type { ElementCycle, OverlayLayout } from "./types";

/**
 * Rendert die Bausteine einer Vollbild-Szene (Pause, Intro/Clips/Outro) an den Positionen aus dem
 * Layout des Streamers: Position, Größe und optionaler Sichtbarkeits-Zyklus wie in der
 * Spiel-Szene, aber ohne Stapeln. `render` liefert null für Bausteine ohne Inhalt.
 */
export default function SceneLayout<K extends string>({
  layout, order, render,
}: {
  layout: OverlayLayout<K>;
  /** Zeichenreihenfolge (spätere liegen oben). */
  order: readonly K[];
  render: (key: K) => React.ReactNode;
}) {
  const cycles = Object.fromEntries(
    order.flatMap(k => (layout.elements[k]?.cycle ? [[k, layout.elements[k]!.cycle]] : [])),
  ) as Partial<Record<K, ElementCycle>>;
  const visible = useVisibilityCycles(cycles);

  return (
    <>
      {order.map(key => {
        const entry = layout.elements[key];
        if (!entry) return null;
        const content = render(key);
        if (content == null) return null;
        return (
          <div key={key} style={elementPositionStyle(entry)}>
            <div style={combinedElementStyle({}, entry.scale, visible[key] ?? true)}>{content}</div>
          </div>
        );
      })}
    </>
  );
}

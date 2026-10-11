"use client";

import type { ReactNode } from "react";
import type { ElementCycle, LayoutPositions } from "./types";
import {
  elementPositionStyle, panelMotionStyle, combinedElementStyle, useVisibilityCycles, useStackedElements,
  type StackBuckets,
} from "./motion";

/**
 * Rendert ein frei positioniertes Overlay-Layout — gemeinsam für Event- und Profil-Overlay.
 *
 * - `fixedKey` (das Marken-Element) steht immer allein an seiner Position.
 * - Alle übrigen aktiven Elemente mit identischer Position (auf 0.1% gerundet, die
 *   Einstellungsseite rastet beim Übereinanderziehen exakt ein) bilden einen Stapel, der im
 *   `rotateSeconds`-Takt durchrotiert. Einzelne Elemente sind einfach Stapel der Größe 1.
 * - `available` = hat das Element überhaupt Inhalt. Nicht verfügbare Elemente werden nicht Teil
 *   eines Stapels.
 * - `hidden` = per Live-Steuerung ausgeblendet. Solche Elemente bleiben bewusst im Stapel (sonst
 *   ändert sich dessen Zusammensetzung und die Rotation springt hart ohne Animation), werden aber
 *   weich unsichtbar geschaltet.
 */
export default function StackedLayout<K extends string>({
  elements, fixedKey, stackable, rotateSeconds, available, hidden, widthOf, render,
}: {
  elements: LayoutPositions<K>;
  fixedKey: K;
  stackable: readonly K[];
  rotateSeconds: number;
  available: (key: K) => boolean;
  hidden?: (key: K) => boolean;
  widthOf: (key: K) => number;
  render: (key: K, info: { visible: boolean; hasCycle: boolean }) => ReactNode;
}) {
  const stacks: StackBuckets<K> = {};
  for (const key of stackable) {
    const pos = elements[key];
    if (!pos || !available(key)) continue;
    const posKey = `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
    (stacks[posKey] ??= { pos, keys: [] }).keys.push(key);
  }
  const rotator = useStackedElements(stacks, rotateSeconds);

  // Sichtbarkeits-Zyklen gelten je Element (auch fürs fixe Marken-Element) — welches Element in
  // einem Stapel gerade aktiv ist, bestimmt, wessen Zyklus greift.
  const cycles: Partial<Record<K, ElementCycle>> = {};
  for (const key of Object.keys(elements) as K[]) {
    const cycle = elements[key]?.cycle;
    if (cycle) cycles[key] = cycle;
  }
  const cycleVisible = useVisibilityCycles<K>(cycles);
  const isShown = (key: K) => (cycleVisible[key] ?? true) && !hidden?.(key);
  const info = (key: K) => ({ visible: cycleVisible[key] ?? true, hasCycle: !!elements[key]?.cycle });

  const fixed = elements[fixedKey];

  return (
    <>
      {fixed && available(fixedKey) && (
        <div style={elementPositionStyle(fixed)}>
          <div style={combinedElementStyle({}, fixed.scale, isShown(fixedKey))}>
            {render(fixedKey, info(fixedKey))}
          </div>
        </div>
      )}

      {Object.entries(stacks).map(([posKey, stack]) => {
        const slot = rotator.active[posKey] ?? null;
        const prevSlot = rotator.previous[posKey] ?? null;
        if (!slot && !prevSlot) return null;
        const width = Math.max(...stack.keys.map(widthOf));
        return (
          <div key={posKey} style={{ ...elementPositionStyle(stack.pos), width }}>
            {/* Alte und neue Kachel überlappen sich für PANEL_FADE_MS — die alte blendet aus,
               während die neue schon einblendet, statt einer sichtbaren Lücke dazwischen. */}
            {prevSlot && (
              <div
                style={combinedElementStyle(
                  { position: slot ? "absolute" : "static", inset: 0, ...panelMotionStyle(prevSlot.phase) },
                  elements[prevSlot.key]?.scale,
                  isShown(prevSlot.key),
                )}
              >
                {render(prevSlot.key, info(prevSlot.key))}
              </div>
            )}
            {slot && (
              <div
                style={combinedElementStyle(
                  { position: prevSlot ? "absolute" : "static", inset: 0, ...panelMotionStyle(slot.phase) },
                  elements[slot.key]?.scale,
                  isShown(slot.key),
                )}
              >
                {render(slot.key, info(slot.key))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

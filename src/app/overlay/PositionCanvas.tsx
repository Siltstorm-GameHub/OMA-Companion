"use client";

import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type Pos = { x: number; y: number }; // Prozent von 1920×1080, oben links des Elements

export type CanvasElementOption<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
  /** Elemente ohne fixe=true dürfen sich stapeln (identische Position = eine rotierende
   *  Gruppe); "fixe" Elemente (z.B. die Marken-Kachel) blocken jede Überlappung. */
  fixed?: boolean;
};

const SNAP_THRESHOLD_PCT = 1.2; // wie nah zwei Kanten sein müssen, um einzurasten

/** 16:9-Vorschau des OBS-Canvas mit ziehbaren Boxen je aktivem Element — von beiden
 *  Overlay-Typen (Event, Profil) genutzt, daher generisch über den Element-Schlüsseltyp.
 *  - Fixe Elemente blocken jede Überlappung — die Box bleibt an der Kante des anderen
 *    Elements stehen.
 *  - Stapelbare Elemente rasten beim Überlappen eines anderen stapelbaren Elements exakt auf
 *    dessen Position ein (das IST die Stapelbildung), bleiben aber von fixen Elementen fern.
 *  - Beim Ziehen rasten linke/obere Kanten zusätzlich an denen anderer Elemente ein (Ausrichtungs-
 *    Hilfslinien-Gefühl ohne die Linien selbst zu zeichnen), unabhängig je Achse. */
export default function PositionCanvas<K extends string>({
  options, elementSize, activeElements, positions, onChange,
}: {
  options: CanvasElementOption<K>[];
  elementSize: Record<K, { width: number; height: number }>;
  activeElements: K[];
  positions: Record<K, Pos>;
  onChange: (key: K, pos: Pos) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ key: K; grabDx: number; grabDy: number } | null>(null);
  const [dragging, setDragging] = useState<K | null>(null);

  const optionByKey = new Map(options.map(o => [o.key, o]));
  const isFixed = (key: K) => optionByKey.get(key)?.fixed ?? false;

  function pctSize(key: K): { w: number; h: number } {
    return { w: (elementSize[key].width / 1920) * 100, h: (elementSize[key].height / 1080) * 100 };
  }
  function overlaps(a: Pos, aKey: K, b: Pos, bKey: K): boolean {
    const sa = pctSize(aKey);
    const sb = pctSize(bKey);
    return a.x < b.x + sb.w && a.x + sa.w > b.x && a.y < b.y + sb.h && a.y + sa.h > b.y;
  }

  function startDrag(key: K, e: React.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pos = positions[key];
    const pointerXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const pointerYPct = ((e.clientY - rect.top) / rect.height) * 100;
    dragState.current = { key, grabDx: pointerXPct - pos.x, grabDy: pointerYPct - pos.y };
    setDragging(key);

    const handleMove = (ev: PointerEvent) => {
      const drag = dragState.current;
      const canvasEl = canvasRef.current;
      if (!drag || !canvasEl) return;
      const r = canvasEl.getBoundingClientRect();
      const size = pctSize(drag.key);
      const rawX = ((ev.clientX - r.left) / r.width) * 100 - drag.grabDx;
      const rawY = ((ev.clientY - r.top) / r.height) * 100 - drag.grabDy;
      const others = activeElements.filter(k => k !== drag.key);

      // Ausrichtung: liegt die linke bzw. obere Kante nah an der eines anderen Elements,
      // rastet sie exakt darauf ein — unabhängig je Achse, damit sich Elemente sauber in
      // einer Reihe oder Spalte anordnen lassen, ohne aufeinander zu stapeln.
      let snappedX = rawX;
      let bestDx = SNAP_THRESHOLD_PCT;
      let snappedY = rawY;
      let bestDy = SNAP_THRESHOLD_PCT;
      for (const k of others) {
        const dx = Math.abs(positions[k].x - rawX);
        if (dx < bestDx) { bestDx = dx; snappedX = positions[k].x; }
        const dy = Math.abs(positions[k].y - rawY);
        if (dy < bestDy) { bestDy = dy; snappedY = positions[k].y; }
      }

      const candidate: Pos = {
        x: Math.min(100 - size.w, Math.max(0, snappedX)),
        y: Math.min(100 - size.h, Math.max(0, snappedY)),
      };

      const fixedOthers = others.filter(isFixed);
      const hitsFixed = fixedOthers.some(k => overlaps(candidate, drag.key, positions[k], k));
      if (hitsFixed) return; // fixe Elemente blocken immer — Bewegung verwerfen

      if (isFixed(drag.key)) {
        const collides = others.some(k => overlaps(candidate, drag.key, positions[k], k));
        if (collides) return;
        onChange(drag.key, candidate);
        return;
      }

      const stackable = others.filter(k => !isFixed(k));
      const stackPartner = stackable.find(k => overlaps(candidate, drag.key, positions[k], k));
      onChange(drag.key, stackPartner ? positions[stackPartner] : candidate);
    };
    const handleUp = () => {
      dragState.current = null;
      setDragging(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  // Stapel-Gruppen bilden: alle aktiven Elemente mit identischer Position (auf 0.1% gerundet)
  // gehören zusammen. Statt sie deckungsgleich zu übereinanderzulegen (unlesbar, siehe Feedback),
  // teilen sie sich die eine Box in gleich hohen, nicht überlappenden Bändern auf — jedes Band
  // bleibt einzeln per Pointer-Down greifbar, um wieder herausgezogen zu werden.
  const groups = new Map<string, K[]>();
  for (const key of activeElements) {
    const p = positions[key];
    const posKey = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    (groups.get(posKey) ?? groups.set(posKey, []).get(posKey)!).push(key);
  }

  return (
    <div
      ref={canvasRef}
      className="relative w-full rounded-xl overflow-hidden select-none"
      style={{
        aspectRatio: "16 / 9",
        background: "linear-gradient(135deg, #0d1420 0%, #131a26 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundImage:
          "linear-gradient(rgba(20,184,166,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.06) 1px, transparent 1px)",
        backgroundSize: "5% 5%",
      }}
    >
      {[...groups.entries()].map(([posKey, keys]) => {
        const pos = positions[keys[0]];
        const boxSize = keys.reduce(
          (acc, k) => { const s = pctSize(k); return { w: Math.max(acc.w, s.w), h: Math.max(acc.h, s.h) }; },
          { w: 0, h: 0 }
        );
        const groupDragging = dragging != null && keys.includes(dragging);
        return (
          <div
            key={posKey}
            className="absolute rounded-lg overflow-hidden flex flex-col"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`,
              width: `${boxSize.w}%`, height: `${boxSize.h}%`,
              zIndex: groupDragging ? 20 : 10,
              boxShadow: keys.length > 1 ? "0 0 0 1px rgba(20,184,166,0.25)" : undefined,
            }}
          >
            {keys.map(key => {
              const option = optionByKey.get(key)!;
              const Icon = option.icon;
              return (
                <div
                  key={key}
                  onPointerDown={e => startDrag(key, e)}
                  className={`flex items-center gap-1.5 border px-2 text-[11px] font-medium cursor-grab active:cursor-grabbing transition-shadow ${
                    dragging === key
                      ? "bg-teal-500/25 border-teal-400/60 text-teal-100 shadow-lg shadow-teal-500/20"
                      : option.fixed
                        ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                        : "bg-teal-500/10 border-teal-500/30 text-teal-300"
                  }`}
                  style={{ flex: 1, minHeight: 0, touchAction: "none" }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{option.label}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

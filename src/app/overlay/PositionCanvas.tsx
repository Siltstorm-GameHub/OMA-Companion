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

/** 16:9-Vorschau des OBS-Canvas mit ziehbaren Boxen je aktivem Element — von beiden
 *  Overlay-Typen (Event, Profil) genutzt, daher generisch über den Element-Schlüsseltyp.
 *  - Fixe Elemente blocken jede Überlappung — die Box bleibt an der Kante des anderen
 *    Elements stehen.
 *  - Stapelbare Elemente rasten beim Überlappen eines anderen stapelbaren Elements exakt auf
 *    dessen Position ein (das IST die Stapelbildung), bleiben aber von fixen Elementen fern. */
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
      const candidate: Pos = {
        x: Math.min(100 - size.w, Math.max(0, rawX)),
        y: Math.min(100 - size.h, Math.max(0, rawY)),
      };
      const others = activeElements.filter(k => k !== drag.key);
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

  // Stapel-Mitglieder an derselben Position bekommen einen kleinen Versatz in der Vorschau,
  // sonst läge nur die zuletzt gerenderte Box sichtbar da — im echten Overlay rotieren sie
  // stattdessen durch, hier reicht ein Fächer-Effekt zur Anzeige "hier stapelt sich was".
  const stackOffset = new Map<string, number>();

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
      {activeElements.map(key => {
        const pos = positions[key];
        const size = pctSize(key);
        const option = optionByKey.get(key)!;
        const Icon = option.icon;
        const posKey = `${pos.x.toFixed(1)},${pos.y.toFixed(1)}`;
        const fanIndex = stackOffset.get(posKey) ?? 0;
        stackOffset.set(posKey, fanIndex + 1);
        return (
          <div
            key={key}
            onPointerDown={e => startDrag(key, e)}
            className={`absolute flex items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium cursor-grab active:cursor-grabbing transition-shadow ${
              dragging === key
                ? "bg-teal-500/25 border-teal-400/60 text-teal-100 shadow-lg shadow-teal-500/20 z-20"
                : option.fixed
                  ? "bg-violet-500/10 border-violet-500/30 text-violet-300 z-10"
                  : "bg-teal-500/10 border-teal-500/30 text-teal-300"
            }`}
            style={{
              left: `calc(${pos.x}% + ${fanIndex * 4}px)`, top: `calc(${pos.y}% + ${fanIndex * 4}px)`,
              width: `${size.w}%`, height: `${size.h}%`,
              zIndex: dragging === key ? 20 : 10 + fanIndex,
              touchAction: "none",
            }}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{option.label}</span>
          </div>
        );
      })}
    </div>
  );
}

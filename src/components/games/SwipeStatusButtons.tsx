"use client";

import { Check, Heart, X } from "@/components/icons";
import { SWIPE_LABELS, type SwipeStatus } from "@/lib/games/swipe";

const STYLE: Record<SwipeStatus, { icon: typeof Check; on: string; off: string; iconOn: string }> = {
  in:   { icon: Check, on: "bg-emerald-500/15 border-emerald-400/50 text-emerald-100", off: "hover:border-emerald-400/40 hover:bg-emerald-500/10", iconOn: "text-emerald-300" },
  wish: { icon: Heart, on: "bg-rose-500/15 border-rose-400/50 text-rose-100", off: "hover:border-rose-400/40 hover:bg-rose-500/10", iconOn: "text-rose-300" },
  out:  { icon: X, on: "bg-white/[0.08] border-white/25 text-gray-200", off: "hover:border-white/20 hover:bg-white/[0.05]", iconOn: "text-gray-300" },
};

/** Die drei Entscheidungen als Knöpfe (Detailseite) — gleiche Bedeutung wie die Swipe-Richtungen.
 *  Erneuter Klick auf die aktive Entscheidung nimmt sie zurück. "Nicht meins" ist privat (ohne Zähler). */
export default function SwipeStatusButtons({
  value, onChange, counts, disabled,
}: {
  value: SwipeStatus | null;
  onChange: (next: SwipeStatus | null) => void;
  counts?: { in: number; wish: number };
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["in", "wish", "out"] as const).map(s => {
        const st = STYLE[s];
        const Icon = st.icon;
        const on = value === s;
        const count = s === "in" ? counts?.in : s === "wish" ? counts?.wish : undefined;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(on ? null : s)}
            disabled={disabled}
            aria-pressed={on}
            title={s === "in" ? "Hab ich und würde spielen — für alle sichtbar" : s === "wish" ? "Hab ich noch nicht, würde ich holen — du bekommst Angebots-Hinweise" : "Nur für dich sichtbar"}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium border transition-colors disabled:opacity-60 ${
              on ? st.on : `border-white/10 text-gray-300 ${st.off}`
            }`}
          >
            <Icon className={`w-4 h-4 ${on ? st.iconOn : "text-gray-500"}`} />
            {SWIPE_LABELS[s]}
            {count !== undefined && <span className="text-xs text-gray-500 tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

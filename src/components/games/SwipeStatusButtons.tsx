"use client";

import { Check, Heart, X } from "@/components/icons";
import { SWIPE_LABELS, type SwipeStatus } from "@/lib/games/swipe";

const STYLE: Record<SwipeStatus, { icon: typeof Check; on: string; off: string; iconOn: string }> = {
  in:   { icon: Check, on: "bg-success-soft border-success/50 text-emerald-100", off: "hover:border-success/40 hover:bg-success-soft", iconOn: "text-success" },
  wish: { icon: Heart, on: "bg-rose-500/15 border-rose-400/50 text-rose-100", off: "hover:border-rose-400/40 hover:bg-rose-500/10", iconOn: "text-rose-300" },
  out:  { icon: X, on: "bg-line border-line-strong text-fg/90", off: "hover:border-line-strong hover:bg-line", iconOn: "text-fg/85" },
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
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold border transition-colors disabled:opacity-60 ${
              on ? st.on : `border-line-strong text-fg/85 ${st.off}`
            }`}
          >
            <Icon className={`w-4 h-4 ${on ? st.iconOn : "text-subtle"}`} />
            {SWIPE_LABELS[s]}
            {count !== undefined && <span className="text-xs text-subtle tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

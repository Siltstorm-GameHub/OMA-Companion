"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check } from "@/components/icons";
import { SERVER_INTEREST_LABELS, type ServerInterestLevel } from "@/lib/games/server-candidates";

export interface InterestState { level: ServerInterestLevel | null; regular: number; casual: number }

/** "Ich wäre dabei" für einen möglichen OMA-Server: gelegentlich oder regelmäßig. Erneuter Klick zieht
 *  die Zusage zurück. Speichert sofort (PUT /api/games/[slug]/server-interest). */
export default function ServerInterestButtons({
  slug, initial, onChange, size = "md",
}: {
  slug: string;
  initial: InterestState;
  onChange?: (next: InterestState) => void;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save(level: ServerInterestLevel | null) {
    const prev = state;
    const optimistic: InterestState = {
      level,
      regular: state.regular - (prev.level === "regular" ? 1 : 0) + (level === "regular" ? 1 : 0),
      casual: state.casual - (prev.level === "casual" ? 1 : 0) + (level === "casual" ? 1 : 0),
    };
    setState(optimistic);
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/server-interest`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      const next: InterestState = { level: data.level, regular: data.regular, casual: data.casual };
      setState(next);
      onChange?.(next);
      toast.success(level ? "Zusage gespeichert — du hörst von uns, wenn der Server kommt" : "Zusage zurückgezogen");
    } catch (err) {
      setState(prev);
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const h = size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-4 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ich wäre dabei">
      {(["casual", "regular"] as const).map(level => {
        const on = state.level === level;
        const count = level === "regular" ? state.regular : state.casual;
        return (
          <button
            key={level}
            type="button"
            onClick={() => save(on ? null : level)}
            disabled={busy}
            aria-pressed={on}
            title={level === "regular" ? "Ich würde regelmäßig auf dem Server spielen" : "Ich würde ab und zu vorbeischauen"}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors disabled:opacity-60 ${h} ${
              on ? "bg-primary/15 border-primary/50 text-primary-fg" : "border-line-strong text-fg/85 hover:border-primary/40 hover:bg-primary/10"
            }`}
          >
            {on && <Check className="w-3.5 h-3.5" />}
            {SERVER_INTEREST_LABELS[level]}
            <span className="text-xs text-subtle tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

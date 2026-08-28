"use client";

// Wählt bis zu 5 der eigenen Karten als aktive Startaufstellung.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import type { BattleCardData } from "./BattleCardView";
import BattleCardView from "./BattleCardView";

const LINEUP_SIZE = 5;

export interface LineupCard {
  cardId: string;
  card: BattleCardData;
  level: number;
}

export default function LineupEditor({
  cards,
  initialLineup,
}: {
  cards: LineupCard[];
  initialLineup: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialLineup);
  const [submitting, setSubmitting] = useState(false);

  function toggle(cardId: string) {
    setSelected((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= LINEUP_SIZE) return prev;
      return [...prev, cardId];
    });
  }

  async function submit() {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/battle-cards/lineup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Speichern");
        return;
      }
      toast.success("Startaufstellung gespeichert!");
      router.push("/battle-cards");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        {selected.length}/{LINEUP_SIZE} gewählt — antippen zum Auswählen/Abwählen.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cards.map(({ cardId, card, level }) => {
          const isSelected = selected.includes(cardId);
          const isDisabled = !isSelected && selected.length >= LINEUP_SIZE;
          return (
            <div key={cardId} className="relative">
              <button
                type="button"
                onClick={() => toggle(cardId)}
                disabled={isDisabled}
                className="block w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div
                  className="rounded-xl transition-shadow"
                  style={{ boxShadow: isSelected ? "0 0 0 3px #8b5cf6, 0 0 20px rgba(139,92,246,0.5)" : undefined }}
                >
                  <BattleCardView card={{ ...card, level }} />
                </div>
              </button>
              {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center pointer-events-none">
                  <Check className="w-3 h-3 text-black" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={selected.length === 0 || submitting}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-black disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Startaufstellung speichern"}
      </button>
    </div>
  );
}

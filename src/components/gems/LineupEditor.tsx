"use client";

// Wählt bis zu 5 der eigenen Karten als aktive Startaufstellung.

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "@/components/icons";
import type { BattleCardData } from "./BattleCardView";
import { RankBadge } from "./CardRank";
import BattleCardView from "./BattleCardView";

const LINEUP_SIZE = 5;

export interface LineupCard {
  cardId: string;
  card: BattleCardData;
  winsInLineup: number;
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
      const res = await fetch("/api/gems/lineup", {
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
      router.push("/gems");
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
        {cards.map(({ cardId, card, winsInLineup }) => {
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
                  style={{ boxShadow: isSelected ? "0 0 0 3px #14b8a6, 0 0 20px rgba(20,184,166,0.45)" : undefined }}
                >
                  <BattleCardView card={card} />
                </div>
                <RankBadge wins={winsInLineup} className="top-2 left-2" />
              </button>
              {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center pointer-events-none">
                  <Check className="w-3 h-3 text-black" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={submit} disabled={selected.length === 0} loading={submitting} className="w-full">
        Startaufstellung speichern
      </Button>
    </div>
  );
}

"use client";

// Wählt bis zu 5 der eigenen Karten als aktive Startaufstellung.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "@/components/icons";
import { Check, Loader2 } from "@/components/icons";
import type { BattleCardData } from "./BattleCardView";
import BattleCardView from "./BattleCardView";
import { computeSynergies } from "@/lib/battle-cards/synergy";

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

  const cardById = useMemo(() => new Map(cards.map((c) => [c.cardId, c])), [cards]);
  const activeSynergies = useMemo(() => {
    const classes = selected
      .map((id) => cardById.get(id)?.card.class)
      .filter((c): c is BattleCardData["class"] => !!c);
    return computeSynergies(classes);
  }, [selected, cardById]);

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

      {activeSynergies.length > 0 && (
        <div className="moba-panel rounded-xl p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-violet-300 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Aktive Team-Synergien
          </p>
          <div className="space-y-1.5">
            {activeSynergies.map((s) => (
              <p key={s.key} className="text-xs text-gray-400">
                <span className="text-white font-semibold">{s.label}:</span> {s.description}
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={selected.length === 0 || submitting}
        className="moba-hex-button w-full disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ ["--hex-accent" as string]: "#c4b5fd", ["--hex-glow" as string]: "rgba(139,92,246,0.6)" }}
      >
        <div className="moba-hex-fill" style={{ background: "linear-gradient(180deg, #c4b5fd 0%, #8b5cf6 55%, #5b21b6 100%)" }} />
        <div className="moba-hex-lattice" />
        <div className="moba-hex-border" />
        <div className="moba-hex-diamond left" />
        <div className="moba-hex-diamond right" />
        <span className="moba-button-label text-sm font-black">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Startaufstellung speichern"}
        </span>
      </button>
    </div>
  );
}

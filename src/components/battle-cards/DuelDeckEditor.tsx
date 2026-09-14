"use client";

// Wählt genau DUEL_DECK_TOTAL_SIZE Karten (Einheiten- + Taktik-Karten, min.
// DUEL_DECK_MIN_UNIT_CARDS Einheiten) als aktives OMA-Duels-Deck — Pendant zu
// LineupEditor.tsx für den neuen Yu-Gi-Oh-artigen Live-PvP-Modus.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import type { BattleCardData } from "./BattleCardView";
import BattleCardView from "./BattleCardView";
import TacticCardTile from "./TacticCardTile";
import StatBadges from "./StatBadges";
import { DUEL_DECK_MIN_UNIT_CARDS, DUEL_DECK_TOTAL_SIZE } from "@/lib/battle-engine/duel-constants";
import { scaleStatsForLevel } from "@/lib/battle-engine/stats";

export interface DuelDeckUnitCard {
  cardId: string;
  card: BattleCardData;
  level: number;
}

export interface DuelDeckTacticCard {
  tacticCardId: string;
  name: string;
  kind: "INSTANT" | "TRAP";
  flavorText: string;
  description: string;
  imageUrl?: string | null;
}

export default function DuelDeckEditor({
  unitCards,
  tacticCards,
  initialUnitCardIds,
  initialTacticCardIds,
}: {
  unitCards: DuelDeckUnitCard[];
  tacticCards: DuelDeckTacticCard[];
  initialUnitCardIds: string[];
  initialTacticCardIds: string[];
}) {
  const router = useRouter();
  const [selectedUnits, setSelectedUnits] = useState<string[]>(initialUnitCardIds);
  const [selectedTactics, setSelectedTactics] = useState<string[]>(initialTacticCardIds);
  const [submitting, setSubmitting] = useState(false);

  const total = selectedUnits.length + selectedTactics.length;
  const atCap = total >= DUEL_DECK_TOTAL_SIZE;
  const hasEnoughUnits = selectedUnits.length >= DUEL_DECK_MIN_UNIT_CARDS;
  const canSubmit = total === DUEL_DECK_TOTAL_SIZE && hasEnoughUnits;

  function toggleUnit(cardId: string) {
    setSelectedUnits((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (atCap) return prev;
      return [...prev, cardId];
    });
  }

  function toggleTactic(tacticCardId: string) {
    setSelectedTactics((prev) => {
      if (prev.includes(tacticCardId)) return prev.filter((id) => id !== tacticCardId);
      if (atCap) return prev;
      return [...prev, tacticCardId];
    });
  }

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/battle-cards/duel-deck", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitCardIds: selectedUnits, tacticCardIds: selectedTactics }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Fehler beim Speichern");
        return;
      }
      toast.success("Duell-Deck gespeichert!");
      router.push("/battle-cards");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="moba-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className={total === DUEL_DECK_TOTAL_SIZE ? "text-emerald-400 font-semibold" : "text-gray-400"}>
          {total}/{DUEL_DECK_TOTAL_SIZE} Karten gewählt
        </span>
        <span className={hasEnoughUnits ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
          {selectedUnits.length}/{DUEL_DECK_MIN_UNIT_CARDS} Einheiten-Karten (Minimum)
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white">Einheiten-Karten</h2>
        {unitCards.length === 0 ? (
          <p className="text-xs text-gray-500">Du besitzt noch keine Einheiten-Karten.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {unitCards.map(({ cardId, card, level }) => {
              const isSelected = selectedUnits.includes(cardId);
              const isDisabled = !isSelected && atCap;
              const { attack, defense } = scaleStatsForLevel({
                baseHp: card.baseHp,
                baseAttack: card.baseAttack,
                baseDefense: card.baseDefense,
                level,
              });
              return (
                <div key={cardId} className="relative space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleUnit(cardId)}
                    disabled={isDisabled}
                    className="block w-full text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div
                      className="rounded-xl transition-shadow"
                      style={{ boxShadow: isSelected ? "0 0 0 3px #14b8a6, 0 0 20px rgba(20,184,166,0.5)" : undefined }}
                    >
                      {/* Passiv-Fähigkeiten feuern in OMA Duels nie — hidePassives
                          blendet sie hier aus, damit der Deck-Editor nichts
                          verspricht, was im Duell keine Wirkung hat. */}
                      <BattleCardView card={{ ...card, level }} hidePassives />
                    </div>
                  </button>
                  <div className="flex justify-center">
                    <StatBadges attack={attack} defense={defense} />
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center pointer-events-none">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white">Taktik-Karten (Items &amp; Fallen)</h2>
        {tacticCards.length === 0 ? (
          <p className="text-xs text-gray-500">
            Du besitzt noch keine Taktik-Karten — dein Deck lässt sich aktuell nur aus Einheiten-Karten füllen.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {tacticCards.map((tc) => {
              const isSelected = selectedTactics.includes(tc.tacticCardId);
              const isDisabled = !isSelected && atCap;
              return (
                <div key={tc.tacticCardId} className="relative space-y-1.5">
                  <TacticCardTile
                    card={{ id: tc.tacticCardId, name: tc.name, kind: tc.kind, imageUrl: tc.imageUrl }}
                    selected={isSelected}
                    disabled={isDisabled}
                    onClick={() => toggleTactic(tc.tacticCardId)}
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center pointer-events-none">
                      <Check className="w-3 h-3 text-black" />
                    </span>
                  )}
                  <p className="text-[10px] text-gray-500 text-center line-clamp-2">{tc.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="moba-hex-button w-full disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ ["--hex-accent" as string]: "#ffd9a0", ["--hex-glow" as string]: "rgba(232,150,28,0.6)" }}
      >
        <div className="moba-hex-fill" style={{ background: "linear-gradient(180deg, #ffc25c 0%, #e8961c 55%, #b8710a 100%)" }} />
            <div className="moba-hex-lattice" />
        <div className="moba-hex-border" />
        <div className="moba-hex-diamond left" />
        <div className="moba-hex-diamond right" />
        <span className="moba-button-label text-sm font-black">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Duell-Deck speichern"}
        </span>
      </button>
    </div>
  );
}

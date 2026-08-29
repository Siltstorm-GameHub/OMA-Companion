"use client";

// ============================================
// Sammlung-Browser — Klassen-Filter + paginierte "Alle Karten im Spiel"
// ============================================
// Eigene Karten sind bereits vollständig geladen (kleine Menge) und werden
// rein clientseitig gefiltert. "Alle Karten im Spiel" kann groß werden
// (1 Karte pro Community-Mitglied) — die wird über /api/battle-cards/
// other-cards seitenweise nachgeladen, je nach aktuellem Filter neu.

import { useState } from "react";
import { Loader2, Shield, Swords, HeartPulse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import BattleCardView from "./BattleCardView";
import DuplicateProgress from "./DuplicateProgress";
import type { BattleCardData } from "./BattleCardView";

const PAGE_SIZE = 12;

type CardClassFilter = "ALL" | "TANK" | "DAMAGE_DEALER" | "SUPPORT";

const FILTERS: { key: CardClassFilter; label: string; icon?: LucideIcon }[] = [
  { key: "ALL", label: "Alle" },
  { key: "TANK", label: "Tank", icon: Shield },
  { key: "DAMAGE_DEALER", label: "Damage Dealer", icon: Swords },
  { key: "SUPPORT", label: "Support", icon: HeartPulse },
];

export interface OwnedCardEntry {
  id: string;
  level: number;
  duplicates: number;
  card: BattleCardData & { id: string };
}

export default function CardCollectionBrowser({
  ownedCards: initialOwnedCards,
  initialOtherCards,
  initialOtherTotal,
  initialCoins,
}: {
  ownedCards: OwnedCardEntry[];
  initialOtherCards: (BattleCardData & { id: string })[];
  initialOtherTotal: number;
  initialCoins: number;
}) {
  const [filter, setFilter] = useState<CardClassFilter>("ALL");
  const [otherCards, setOtherCards] = useState(initialOtherCards);
  const [otherTotal, setOtherTotal] = useState(initialOtherTotal);
  const [loading, setLoading] = useState(false);
  const [ownedCards, setOwnedCards] = useState(initialOwnedCards);
  const [coins, setCoins] = useState(initialCoins);

  function handleUpgraded(userCardId: string, newLevel: number, newCoins: number) {
    setOwnedCards((prev) =>
      prev.map((oc) =>
        oc.id === userCardId ? { ...oc, level: newLevel, card: { ...oc.card, level: newLevel } } : oc
      )
    );
    setCoins(newCoins);
  }

  const filteredOwned = ownedCards.filter((oc) => filter === "ALL" || oc.card.class === filter);

  async function fetchPage(nextFilter: CardClassFilter, offset: number) {
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (nextFilter !== "ALL") params.set("class", nextFilter);
    const res = await fetch(`/api/battle-cards/other-cards?${params.toString()}`);
    if (!res.ok) return null;
    return res.json() as Promise<{ cards: (BattleCardData & { id: string })[]; total: number }>;
  }

  async function changeFilter(next: CardClassFilter) {
    if (next === filter || loading) return;
    setFilter(next);
    setLoading(true);
    const data = await fetchPage(next, 0);
    if (data) {
      setOtherCards(data.cards);
      setOtherTotal(data.total);
    }
    setLoading(false);
  }

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    const data = await fetchPage(filter, otherCards.length);
    if (data) {
      setOtherCards((prev) => [...prev, ...data.cards]);
      setOtherTotal(data.total);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Klassen-Filter + Münzstand */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              disabled={loading}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 ${
                filter === key
                  ? "bg-violet-500/25 text-violet-200"
                  : "bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-300 tabular-nums px-3 py-1.5 rounded-md bg-amber-500/10">
          <CoinIcon size={16} />
          {coins.toLocaleString("de-DE")}
        </span>
      </div>

      {/* Eigene Karten */}
      {filteredOwned.length === 0 ? (
        <p className="text-sm text-gray-500">Keine eigenen Karten in dieser Klasse.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredOwned.map((oc) => (
            <div key={oc.id}>
              <BattleCardView card={oc.card} />
              <DuplicateProgress
                userCardId={oc.id}
                rarity={oc.card.rarity}
                level={oc.level}
                duplicates={oc.duplicates}
                coins={coins}
                onUpgraded={(newLevel, newCoins) => handleUpgraded(oc.id, newLevel, newCoins)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Alle Karten im Spiel */}
      {otherTotal > 0 && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold shrink-0">
              Alle Karten im Spiel ({otherTotal})
            </p>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {otherCards.map((card) => (
              <BattleCardView key={card.id} card={card} dimmed />
            ))}
          </div>

          {otherCards.length < otherTotal && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Mehr anzeigen ({otherCards.length}/{otherTotal})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

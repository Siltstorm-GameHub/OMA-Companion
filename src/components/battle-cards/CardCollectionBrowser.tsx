"use client";

// ============================================
// Sammlung-Browser — Klassen-Filter + paginierte "Alle Karten im Spiel"
// ============================================
// Eigene Karten sind bereits vollständig geladen (kleine Menge) und werden
// rein clientseitig gefiltert. "Alle Karten im Spiel" kann groß werden
// (1 Karte pro Community-Mitglied) — die wird über /api/battle-cards/
// other-cards seitenweise nachgeladen, je nach aktuellem Filter neu.
//
// Übersicht als dichtes Kachel-Raster (Clash-Royale-artig): Level-Rahmen +
// Duplikat-Zähler direkt auf der Kachel, volle Karte samt Upgrade öffnet
// sich erst im Detail-Modal beim Antippen.

import { useEffect, useState } from "react";
import { Loader2, Shield, Swords, HeartPulse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import CardTile from "./CardTile";
import CardDetailModal, { type CardDetailSelection } from "./CardDetailModal";
import CardUpgradeOverlay from "./CardUpgradeOverlay";
import type { CardUpgradeAnimationState } from "./CardUpgradeOverlay";
import type { BattleCardData } from "./BattleCardView";
import type { UpgradeTable } from "@/lib/battle-cards/upgrade-config";

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
  /** ISO-Zeitstempel, wann die Karte erworben wurde — steuert das "Neu"-Ribbon. */
  acquiredAt: string;
  card: BattleCardData & { id: string };
}

const NEW_CARD_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** Pro Browser gemerkt (nicht serverseitig) — das "Neu"-Ribbon verschwindet
 *  sofort, sobald die eigene Karte einmal im Detail-Modal geöffnet wurde,
 *  unabhängig vom 3-Tage-Fenster. */
const VIEWED_CARDS_STORAGE_KEY = "battleCardsViewedCardIds";

type Selected = { kind: "owned"; userCardId: string } | { kind: "other"; cardId: string } | null;

export default function CardCollectionBrowser({
  ownedCards: initialOwnedCards,
  initialOtherCards,
  initialOtherTotal,
  initialCoins,
  duplicateThresholds,
  upgradeCosts,
}: {
  ownedCards: OwnedCardEntry[];
  initialOtherCards: (BattleCardData & { id: string })[];
  initialOtherTotal: number;
  initialCoins: number;
  duplicateThresholds: UpgradeTable;
  upgradeCosts: UpgradeTable;
}) {
  const [filter, setFilter] = useState<CardClassFilter>("ALL");
  const [otherCards, setOtherCards] = useState(initialOtherCards);
  const [otherTotal, setOtherTotal] = useState(initialOtherTotal);
  const [loading, setLoading] = useState(false);
  const [ownedCards, setOwnedCards] = useState(initialOwnedCards);
  const [coins, setCoins] = useState(initialCoins);
  const [upgradeAnimation, setUpgradeAnimation] = useState<CardUpgradeAnimationState | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  // localStorage kann erst nach dem Mount gelesen werden (SSR hat keinen Zugriff) —
  // das "Neu"-Ribbon blitzt für bereits gesehene Karten also kurz auf, bevor dieser
  // Effekt läuft. Gleichzeitig auf die aktuell besessenen Karten prunen, damit der
  // Eintrag nicht unbegrenzt wächst (alte/nicht mehr besessene IDs raus).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEWED_CARDS_STORAGE_KEY);
      const storedIds: string[] = stored ? JSON.parse(stored) : [];
      const ownedIds = new Set(ownedCards.map((oc) => oc.id));
      const pruned = storedIds.filter((id) => ownedIds.has(id));
      setViewedIds(new Set(pruned));
      if (pruned.length !== storedIds.length) {
        localStorage.setItem(VIEWED_CARDS_STORAGE_KEY, JSON.stringify(pruned));
      }
    } catch {
      // localStorage kann in seltenen Fällen (privater Modus etc.) werfen — Ribbon bleibt dann einfach zeitbasiert
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markCardViewed(userCardId: string) {
    setViewedIds((prev) => {
      if (prev.has(userCardId)) return prev;
      const next = new Set(prev);
      next.add(userCardId);
      try {
        localStorage.setItem(VIEWED_CARDS_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // s.o.
      }
      return next;
    });
  }

  function handleUpgraded(userCardId: string, fromLevel: number, newLevel: number, newCoins: number) {
    setOwnedCards((prev) =>
      prev.map((oc) =>
        oc.id === userCardId ? { ...oc, level: newLevel, card: { ...oc.card, level: newLevel } } : oc
      )
    );
    setCoins(newCoins);
    const upgradedCard = ownedCards.find((oc) => oc.id === userCardId)?.card;
    if (upgradedCard) {
      setUpgradeAnimation({ card: upgradedCard, fromLevel, toLevel: newLevel });
    }
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

  // Aus dem leichten `selected`-Zeiger die volle Detail-Auswahl ableiten — so
  // zeigt das Modal nach einem Upgrade sofort die aktuelle Stufe, statt einen
  // beim Öffnen eingefrorenen Stand zu behalten.
  const selection: CardDetailSelection | null = (() => {
    if (!selected) return null;
    if (selected.kind === "owned") {
      const oc = ownedCards.find((o) => o.id === selected.userCardId);
      if (!oc) return null;
      return {
        card: oc.card,
        owned: {
          userCardId: oc.id,
          duplicates: oc.duplicates,
          coins,
          duplicateThresholds,
          upgradeCosts,
          onUpgraded: (fromLevel, newLevel, newCoins) => handleUpgraded(oc.id, fromLevel, newLevel, newCoins),
        },
      };
    }
    const card = otherCards.find((c) => c.id === selected.cardId);
    return card ? { card } : null;
  })();

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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredOwned.map((oc) => (
            <CardTile
              key={oc.id}
              card={oc.card}
              level={oc.level}
              duplicates={oc.duplicates}
              isNew={Date.now() - new Date(oc.acquiredAt).getTime() < NEW_CARD_WINDOW_MS && !viewedIds.has(oc.id)}
              onClick={() => {
                setSelected({ kind: "owned", userCardId: oc.id });
                markCardViewed(oc.id);
              }}
            />
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

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {otherCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                level={card.level ?? 1}
                locked
                onClick={() => setSelected({ kind: "other", cardId: card.id })}
              />
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

      <CardDetailModal selection={selection} onClose={() => setSelected(null)} />
      <CardUpgradeOverlay state={upgradeAnimation} onClose={() => setUpgradeAnimation(null)} />
    </div>
  );
}

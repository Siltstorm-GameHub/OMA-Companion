"use client";

// ============================================
// Sammlung-Browser — Klassen-Filter + paginierte "Alle Karten im Spiel"
// ============================================
// Eigene Karten sind bereits vollständig geladen (kleine Menge) und werden
// rein clientseitig gefiltert. "Alle Karten im Spiel" kann groß werden
// (1 Karte pro Community-Mitglied) — die wird über /api/gems/
// other-cards seitenweise nachgeladen, je nach aktuellem Filter neu.
//
// Übersicht als dichtes Kachel-Raster (Clash-Royale-artig), die volle Karte
// öffnet sich erst im Detail-Modal beim Antippen.

import { useEffect, useState } from "react";
import { Loader2 } from "@/components/icons";
import { CLASS_CONFIG } from "@/lib/gems/class-config";
import { nextRankProgress, rankForXp } from "@/lib/gems/card-ranks";
import CardTile from "./CardTile";
import CardDetailModal, { type CardDetailSelection } from "./CardDetailModal";
import type { BattleCardData } from "./BattleCardView";

const PAGE_SIZE = 12;

type CardClassFilter = "ALL" | "TANK" | "DAMAGE_DEALER" | "SUPPORT";

const FILTERS: { key: CardClassFilter; label: string; icon?: string }[] = [
  { key: "ALL", label: "Alle" },
  { key: "TANK", label: "Tank", icon: CLASS_CONFIG.TANK.icon },
  { key: "DAMAGE_DEALER", label: "Damage Dealer", icon: CLASS_CONFIG.DAMAGE_DEALER.icon },
  { key: "SUPPORT", label: "Support", icon: CLASS_CONFIG.SUPPORT.icon },
];

export interface OwnedCardEntry {
  id: string;
  /** ISO-Zeitstempel, wann die Karte erworben wurde — steuert das "Neu"-Ribbon. */
  acquiredAt: string;
  /** XP aus der Startaufstellung — bestimmt den Rang (siehe card-ranks.ts, cardXp). */
  xp: number;
  card: BattleCardData & { id: string };
}

type OwnedSort = "DEFAULT" | "RANK" | "NEXT_RANK";

const SORTS: { key: OwnedSort; label: string }[] = [
  { key: "DEFAULT", label: "Standard" },
  { key: "RANK", label: "Höchster Rang" },
  { key: "NEXT_RANK", label: "Nächster Aufstieg" },
];

/** „Fast aufgestiegen“: höchstens so viele XP bis zum nächsten Rang. */
const ALMOST_RANK_UP_XP = 200;

function xpToNextRank(wins: number): number {
  // Karten auf dem höchsten Rang sortieren ans Ende.
  return nextRankProgress(wins)?.xpNeeded ?? Number.POSITIVE_INFINITY;
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
}: {
  ownedCards: OwnedCardEntry[];
  initialOtherCards: (BattleCardData & { id: string })[];
  initialOtherTotal: number;
}) {
  const [filter, setFilter] = useState<CardClassFilter>("ALL");
  const [sort, setSort] = useState<OwnedSort>("DEFAULT");
  const [almostOnly, setAlmostOnly] = useState(false);
  const [otherCards, setOtherCards] = useState(initialOtherCards);
  const [otherTotal, setOtherTotal] = useState(initialOtherTotal);
  const [loading, setLoading] = useState(false);
  const ownedCards = initialOwnedCards;
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

  const classOwned = ownedCards.filter((oc) => filter === "ALL" || oc.card.class === filter);
  const filteredOwned = classOwned.filter((oc) => !almostOnly || xpToNextRank(oc.xp) <= ALMOST_RANK_UP_XP);
  if (sort === "RANK") {
    filteredOwned.sort((a, b) => rankForXp(b.xp) - rankForXp(a.xp) || b.xp - a.xp);
  } else if (sort === "NEXT_RANK") {
    filteredOwned.sort((a, b) => xpToNextRank(a.xp) - xpToNextRank(b.xp));
  }
  // otherTotal ist bereits auf denselben Filter gescoped (siehe fetchPage) —
  // gesammelt+fehlend ergibt so direkt die Gesamtzahl im aktuell sichtbaren Filter.
  const totalInFilter = classOwned.length + otherTotal;
  const collectedPct = totalInFilter > 0 ? Math.round((classOwned.length / totalInFilter) * 100) : 0;

  async function fetchPage(nextFilter: CardClassFilter, offset: number) {
    const params = new URLSearchParams({ offset: String(offset), limit: String(PAGE_SIZE) });
    if (nextFilter !== "ALL") params.set("class", nextFilter);
    const res = await fetch(`/api/gems/other-cards?${params.toString()}`);
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

  // Aus dem leichten `selected`-Zeiger die volle Detail-Auswahl ableiten.
  const selection: CardDetailSelection | null = (() => {
    if (!selected) return null;
    if (selected.kind === "owned") {
      const oc = ownedCards.find((o) => o.id === selected.userCardId);
      if (!oc) return null;
      return { card: oc.card, xp: oc.xp };
    }
    const card = otherCards.find((c) => c.id === selected.cardId);
    return card ? { card } : null;
  })();

  return (
    <div className="space-y-6">
      {/* Klassen-Filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                filter === key ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25" : "hover:bg-white/[0.06]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {icon && <img src={icon} alt="" aria-hidden className="w-3.5 h-3.5 object-contain" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sortierung und „Fast aufgestiegen“ für eigene Karten */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          Sortieren
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as OwnedSort)}
            className="rounded-lg bg-white/[0.06] px-2 py-1.5 text-xs font-semibold text-white"
          >
            {SORTS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={almostOnly}
          onClick={() => setAlmostOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            almostOnly ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25" : "hover:bg-white/[0.06]"
          }`}
        >
          Fast aufgestiegen
        </button>
      </div>

      {/* Sammel-Fortschritt — kontextuell zum aktuellen Klassenfilter */}
      {totalInFilter > 0 && (
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-1.5 rounded-full bg-black/40 border border-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${collectedPct}%`, background: "linear-gradient(90deg, #0d9488, #2dd4bf)" }}
            />
          </div>
          <span className="text-[11px] font-semibold text-gray-400 tabular-nums shrink-0">
            {classOwned.length}/{totalInFilter} gesammelt
          </span>
        </div>
      )}

      {/* Eigene Karten */}
      {filteredOwned.length === 0 ? (
        <p className="text-sm text-gray-500">
          {almostOnly ? "Keine Karte kurz vor dem nächsten Rang." : "Keine eigenen Karten in dieser Klasse."}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredOwned.map((oc) => (
            <CardTile
              key={oc.id}
              card={oc.card}
              xp={oc.xp}
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
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold shrink-0">
              Alle Karten im Spiel ({otherTotal})
            </p>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {otherCards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold px-4 py-2 hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Mehr anzeigen ({otherCards.length}/{otherTotal})
              </button>
            </div>
          )}
        </>
      )}

      <CardDetailModal selection={selection} onClose={() => setSelected(null)} />
    </div>
  );
}

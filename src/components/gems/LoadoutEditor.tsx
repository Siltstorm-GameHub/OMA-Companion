"use client";

// ============================================
// OMA Gems — Startaufstellung und Relikte in einem Bildschirm
// ============================================
// Mobil zuerst: oben die gewählte Aufstellung (immer sichtbar, antippen entfernt eine Karte, dazu die
// Klassen-Verteilung), darunter Tabs „Karten“ und „Relikte“, unten eine feste Speichern-Leiste über der
// Navigation. Karten sind die kompakten Kacheln der Sammlung statt der großen Flip-Karten; Details öffnet
// das (i). Eine Speichern-Aktion sichert Aufstellung und Relikte gemeinsam.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Check, Info, Lock, Plus, Sparkles, X } from "@/components/icons";
import { CLASS_CONFIG, getClassConfig, type UnitClassKey } from "@/lib/gems/class-config";
import { guardianStageForRelic, RELIC_SLOTS, RELICS } from "@/lib/gems/relics";
import { rankForXp } from "@/lib/gems/card-ranks";
import type { BattleCardData } from "./BattleCardView";
import CardTile from "./CardTile";
import CardDetailModal from "./CardDetailModal";
import HeroBackdrop from "./HeroBackdrop";
import HeroFigure from "./HeroFigure";

const LINEUP_SIZE = 5;

export interface LineupCard {
  cardId: string;
  card: BattleCardData;
  xp: number;
}

type Tab = "cards" | "relics";
type ClassFilter = "ALL" | UnitClassKey;
type CardSort = "DEFAULT" | "RANK";

const CLASS_FILTERS: { key: ClassFilter; label: string; icon?: string }[] = [
  { key: "ALL", label: "Alle" },
  { key: "TANK", label: "Tank", icon: CLASS_CONFIG.TANK.icon },
  { key: "DAMAGE_DEALER", label: "Damage", icon: CLASS_CONFIG.DAMAGE_DEALER.icon },
  { key: "SUPPORT", label: "Support", icon: CLASS_CONFIG.SUPPORT.icon },
];

const CLASS_SHORT: Record<UnitClassKey, string> = { TANK: "Tank", DAMAGE_DEALER: "Damage", SUPPORT: "Support" };

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/** Kleine Karte in einem Aufstellungs-Platz — derselbe Held wie in Sammlung und Kampf. */
function SlotCard({ card, onRemove }: { card: BattleCardData; onRemove: () => void }) {
  const classConfig = getClassConfig(card.class);
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`${card.name} aus der Aufstellung entfernen`}
      className="relative block w-full aspect-[3/4] overflow-hidden rounded-lg active:scale-95 transition-transform"
      style={{
        background: `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
        boxShadow: `0 0 0 1.5px ${classConfig.color}`,
      }}
    >
      {card.heroLook && <HeroBackdrop id={card.heroLook.backdrop} />}
      <div className="absolute inset-x-0 top-1 bottom-1 flex items-center justify-center">
        {card.heroLook ? (
          <HeroFigure look={card.heroLook} title={card.name} className="h-full w-auto max-w-full" />
        ) : card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={classConfig.icon} alt="" aria-hidden className="h-5 w-5 object-contain opacity-70" />
        )}
      </div>
      <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-gray-200">
        <X className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

export default function LoadoutEditor({
  cards,
  initialLineup,
  ownedRelics,
  equippedRelics,
}: {
  cards: LineupCard[];
  initialLineup: string[];
  ownedRelics: string[];
  equippedRelics: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cards");
  const [lineup, setLineup] = useState<string[]>(initialLineup);
  const [relicSel, setRelicSel] = useState<string[]>(equippedRelics);
  const [classFilter, setClassFilter] = useState<ClassFilter>("ALL");
  const [sort, setSort] = useState<CardSort>("DEFAULT");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const byId = useMemo(() => new Map(cards.map((c) => [c.cardId, c])), [cards]);
  const ownedSet = useMemo(() => new Set(ownedRelics), [ownedRelics]);

  const lineupChanged = !sameSet(lineup, initialLineup);
  const relicsChanged = !sameSet(relicSel, equippedRelics);
  const changed = lineupChanged || relicsChanged;
  const lineupFull = lineup.length >= LINEUP_SIZE;
  const relicsFull = relicSel.length >= RELIC_SLOTS;

  const classCount = (cls: UnitClassKey) => lineup.filter((id) => byId.get(id)?.card.class === cls).length;

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((c) => classFilter === "ALL" || c.card.class === classFilter);
    if (sort === "RANK") return [...filtered].sort((a, b) => rankForXp(b.xp) - rankForXp(a.xp) || b.xp - a.xp);
    return filtered;
  }, [cards, classFilter, sort]);

  function toggleCard(cardId: string) {
    if (lineup.includes(cardId)) {
      setLineup((prev) => prev.filter((id) => id !== cardId));
    } else if (lineupFull) {
      toast.info(`Aufstellung voll (${LINEUP_SIZE}/${LINEUP_SIZE}) — tippe oben eine Karte an, um sie zu entfernen.`);
    } else {
      setLineup((prev) => [...prev, cardId]);
    }
  }

  function toggleRelic(id: string) {
    if (relicSel.includes(id)) {
      setRelicSel((prev) => prev.filter((x) => x !== id));
    } else if (relicsFull) {
      toast.info(`Alle ${RELIC_SLOTS} Relikt-Plätze belegt — wähle erst eins ab.`);
    } else {
      setRelicSel((prev) => [...prev, id]);
    }
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Fehler beim Speichern");
  }

  async function save() {
    if (!changed || lineup.length === 0 || saving) return;
    setSaving(true);
    try {
      if (lineupChanged) await post("/api/gems/lineup", { cardIds: lineup });
      if (relicsChanged) await post("/api/gems/relics", { relicIds: relicSel });
      toast.success(lineupChanged ? "Startaufstellung gespeichert!" : "Relikte gespeichert!");
      router.push("/gems");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  const ownedRelicDefs = RELICS.filter((r) => ownedSet.has(r.id));
  const lockedRelicDefs = RELICS.filter((r) => !ownedSet.has(r.id));
  const detailCard = detailId ? byId.get(detailId) : null;
  const saveHint = lineup.length === 0 ? "Wähle mindestens eine Karte." : changed ? "Ungespeicherte Änderungen" : "Alles gespeichert";

  return (
    <div className="space-y-3">
      {/* Gewählte Aufstellung — bleibt beim Scrollen unter der Kopfleiste stehen */}
      <section
        aria-label="Gewählte Aufstellung"
        className="sticky top-[calc(var(--top-ticker,2.25rem)+3.5rem)] z-20 -mx-4 border-b border-white/[0.06] bg-[var(--bg-base)]/95 px-4 py-2.5 backdrop-blur-xl lg:static lg:mx-0 lg:rounded-xl lg:border lg:bg-transparent"
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-white tabular-nums">
            Aufstellung <span className={lineupFull ? "text-teal-300" : "text-gray-400"}>{lineup.length}/{LINEUP_SIZE}</span>
          </span>
          <span className="flex items-center gap-2.5 text-gray-400">
            {(Object.keys(CLASS_CONFIG) as UnitClassKey[]).map((cls) => (
              <span key={cls} className="inline-flex items-center gap-1 tabular-nums" title={CLASS_CONFIG[cls].label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={CLASS_CONFIG[cls].icon} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
                <span className="sr-only">{CLASS_CONFIG[cls].label}</span>
                {classCount(cls)}
              </span>
            ))}
          </span>
        </div>
        <ul className="grid grid-cols-5 gap-2">
          {Array.from({ length: LINEUP_SIZE }, (_, i) => {
            const entry = lineup[i] ? byId.get(lineup[i]) : null;
            return (
              <li key={i}>
                {entry ? (
                  <SlotCard card={entry.card} onRemove={() => toggleCard(entry.cardId)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setTab("cards")}
                    aria-label={`Platz ${i + 1} ist frei — Karte wählen`}
                    className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-white/15 text-gray-600"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="Bereich" className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.05] p-1">
        {(
          [
            { key: "cards", label: "Karten", count: `${lineup.length}/${LINEUP_SIZE}` },
            { key: "relics", label: "Relikte", count: `${relicSel.length}/${RELIC_SLOTS}` },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === key ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
            <span className="text-xs font-medium tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {tab === "cards" ? (
        <div className="space-y-3" role="tabpanel">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {CLASS_FILTERS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={classFilter === key}
                onClick={() => setClassFilter(key)}
                className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  classFilter === key ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/25" : "bg-white/[0.04] text-gray-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {icon && <img src={icon} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />}
                {label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={sort === "RANK"}
              onClick={() => setSort((s) => (s === "RANK" ? "DEFAULT" : "RANK"))}
              className={`ml-auto inline-flex min-h-9 shrink-0 items-center rounded-lg px-3 text-xs font-semibold transition-colors ${
                sort === "RANK" ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25" : "bg-white/[0.04] text-gray-300"
              }`}
            >
              Nach Rang
            </button>
          </div>

          {visibleCards.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Keine Karten in dieser Klasse.</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5">
              {visibleCards.map(({ cardId, card, xp }) => {
                const index = lineup.indexOf(cardId);
                const selected = index >= 0;
                return (
                  <div key={cardId} className="relative">
                    <CardTile
                      card={card}
                      xp={xp}
                      selected={selected}
                      selectionIndex={selected ? index + 1 : undefined}
                      dimmed={!selected && lineupFull}
                      ariaLabel={`${card.name} (${CLASS_SHORT[card.class]}) ${selected ? "aus der Aufstellung entfernen" : "in die Aufstellung wählen"}`}
                      onClick={() => toggleCard(cardId)}
                    />
                    <button
                      type="button"
                      onClick={() => setDetailId(cardId)}
                      aria-label={`Details zu ${card.name}`}
                      className="absolute right-1 top-7 z-[13] flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-gray-200 active:scale-90"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3" role="tabpanel">
          <p className="text-xs text-gray-500">
            Bis zu {RELIC_SLOTS} Relikte wirken in Kampagne, Turm und Tages-Herausforderung (nicht im Event-Turnier). Jeder
            Wächter gibt beim ersten Sieg eins — wähle passend zur Wochen-Regel.
          </p>
          <ul className="space-y-2">
            {ownedRelicDefs.map((relic) => {
              const selected = relicSel.includes(relic.id);
              return (
                <li key={relic.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleRelic(relic.id)}
                    className={`glass flex min-h-16 w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                      selected ? "bg-violet-500/10 ring-1 ring-violet-400/60" : relicsFull ? "opacity-60" : "active:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        selected ? "bg-violet-400 text-black" : "bg-white/[0.06] text-gray-500"
                      }`}
                    >
                      {selected ? <Check className="h-4 w-4" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{relic.name}</span>
                      <span className="block text-xs text-gray-400">{relic.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {ownedRelicDefs.length === 0 && (
            <p className="glass rounded-xl px-3.5 py-3 text-sm text-gray-400">
              Du hast noch kein Relikt. Besiege einen Wächter (Aufstieg, ab Stufe 20), um das erste zu bekommen.
            </p>
          )}
          {lockedRelicDefs.length > 0 && (
            <div>
              <button
                type="button"
                aria-expanded={showLocked}
                onClick={() => setShowLocked((v) => !v)}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-1 text-xs font-semibold text-gray-400"
              >
                <span>Noch nicht freigeschaltet ({lockedRelicDefs.length})</span>
                <span aria-hidden>{showLocked ? "−" : "+"}</span>
              </button>
              {showLocked && (
                <ul className="mt-1 space-y-2">
                  {lockedRelicDefs.map((relic) => (
                    <li key={relic.id} className="glass flex items-center gap-3 rounded-xl px-3.5 py-2.5 opacity-60">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-gray-500">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-white">{relic.name}</span>
                        <span className="block text-xs text-gray-400">
                          Wächter auf Stufe {guardianStageForRelic(relic.id)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feste Speichern-Leiste über der mobilen Navigation */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-white/[0.08] bg-[var(--bg-base)]/95 px-4 py-2.5 backdrop-blur-xl lg:bottom-4 lg:mx-0 lg:rounded-xl lg:border">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-gray-400" role="status">
            <span className="block truncate font-semibold text-white tabular-nums">
              {lineup.length}/{LINEUP_SIZE} Karten · {relicSel.length}/{RELIC_SLOTS} Relikte
            </span>
            <span className={`block truncate ${changed && lineup.length > 0 ? "text-amber-300" : ""}`}>{saveHint}</span>
          </p>
          <Button onClick={save} disabled={!changed || lineup.length === 0} loading={saving} className="min-h-11 shrink-0 px-5">
            Speichern
          </Button>
        </div>
      </div>

      <CardDetailModal
        selection={detailCard ? { card: detailCard.card, xp: detailCard.xp } : null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

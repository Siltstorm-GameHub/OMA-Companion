"use client";

import { ChevronRight } from "@/components/icons";
import Link from "next/link";
import { getClassConfig, LEVEL_BORDER, type BattleCardData } from "./BattleCardView";
import { CardPlate, CommunityRibbon, isCommunity, rarityFrame } from "./CardPlate";
import HeroFigure from "./HeroFigure";
import HeroBackdrop from "./HeroBackdrop";
import { RankBadge } from "./CardRank";

const LINEUP_SIZE = 5;

/** Kompakte Deck-Vorschau oben im Kampf-Reiter — zeigt die aktuelle Startaufstellung, immer sichtbar. */
export default function LineupStrip({ cards }: { cards: { card: BattleCardData; xp?: number }[] }) {
  const slots = Array.from({ length: LINEUP_SIZE }, (_, i) => cards[i] ?? null);

  return (
    <Link
      href="/gems/lineup"
      className="flex items-center gap-3 glass rounded-2xl p-3 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex gap-1.5 flex-1 min-w-0">
        {slots.map((entry, i) => {
          if (!entry) {
            return (
              <div
                key={i}
                className="card-cut-sm rounded-lg border border-dashed border-white/10 bg-white/[0.02] flex-1 aspect-[3/4]"
              />
            );
          }
          const classConfig = getClassConfig(entry.card.class);
          const borderColor = LEVEL_BORDER[1];
          return (
            <div
              key={i}
              className="card-cut-sm relative flex-1 aspect-[3/4] overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
                boxShadow: rarityFrame(entry.card.rarity, borderColor, { glow: 6 }),
              }}
            >
              {entry.card.heroLook && <HeroBackdrop id={entry.card.heroLook.backdrop} />}
              <div className={`absolute inset-x-0 bottom-11 flex items-center justify-center ${isCommunity(entry.card.rarity) ? "top-4" : "top-1"}`}>
                {entry.card.heroLook ? (
                  <HeroFigure look={entry.card.heroLook} title={entry.card.name} className="h-full w-auto max-w-full" />
                ) : entry.card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.card.imageUrl} alt={entry.card.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={classConfig.icon} alt="" aria-hidden className="w-4 h-4 object-contain" style={{ opacity: 0.65 }} />
                )}
              </div>
              {isCommunity(entry.card.rarity) && <CommunityRibbon compact />}
              <RankBadge xp={entry.xp ?? 0} className="top-0.5 right-0.5" />
              <CardPlate card={entry.card} compact />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 shrink-0">
        {cards.length}/{LINEUP_SIZE}
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

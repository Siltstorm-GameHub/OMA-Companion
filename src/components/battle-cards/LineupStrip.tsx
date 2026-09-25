"use client";

import Link from "next/link";
import { getClassConfig, LEVEL_BORDER, type BattleCardData } from "./BattleCardView";
import MobaIcon from "./MobaIcon";
import { CardPlate, CommunityRibbon, isCommunity, rarityFrame } from "./CardPlate";
import TeCharacter from "@/components/te-character/TeCharacter";
import { TE_CROP_FIGURE } from "@/lib/te-character";

const LINEUP_SIZE = 5;

/** Kompakte Deck-Vorschau oben im Kampf-Reiter — zeigt die aktuelle Startaufstellung, immer sichtbar. */
export default function LineupStrip({ cards }: { cards: { card: BattleCardData; level: number }[] }) {
  const slots = Array.from({ length: LINEUP_SIZE }, (_, i) => cards[i] ?? null);

  return (
    <Link
      href="/battle-cards/lineup"
      className="flex items-center gap-3 moba-panel rounded-2xl p-3 hover:bg-white/[0.04] transition-colors"
    >
      <div className="flex gap-1.5 flex-1 min-w-0">
        {slots.map((entry, i) => {
          if (!entry) {
            return (
              <div
                key={i}
                className="card-cut-sm moba-slot-empty flex-1 aspect-[3/4]"
              />
            );
          }
          const classConfig = getClassConfig(entry.card.class);
          const borderColor = LEVEL_BORDER[entry.level] ?? LEVEL_BORDER[1];
          return (
            <div
              key={i}
              className="card-cut-sm relative flex-1 aspect-[3/4] overflow-hidden"
              style={{
                background: `linear-gradient(160deg, ${classConfig.color}3a, rgba(12,12,16,0.92))`,
                boxShadow: rarityFrame(entry.card.rarity, borderColor, { glow: 6 }),
              }}
            >
              <div className={`absolute inset-x-0 bottom-11 flex items-center justify-center ${isCommunity(entry.card.rarity) ? "top-4" : "top-1"}`}>
                {entry.card.teCharacter ? (
                  <TeCharacter config={entry.card.teCharacter} anim="idle" dir="down" crop={TE_CROP_FIGURE} scale={8} className="h-full w-auto max-w-full object-contain" title={entry.card.name} />
                ) : entry.card.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.card.imageUrl} alt={entry.card.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={classConfig.icon} alt="" aria-hidden className="w-4 h-4 object-contain" style={{ opacity: 0.65 }} />
                )}
              </div>
              {isCommunity(entry.card.rarity) && <CommunityRibbon compact />}
              <CardPlate card={entry.card} level={entry.level} levelColor={borderColor} compact />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 text-xs font-semibold text-[color:var(--moba-ink-dim)] shrink-0">
        {cards.length}/{LINEUP_SIZE}
        <MobaIcon name="chevronRight" className="w-3.5 h-3.5" />
      </div>
    </Link>
  );
}

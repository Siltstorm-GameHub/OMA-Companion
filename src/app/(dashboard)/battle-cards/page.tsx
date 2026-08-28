// ============================================
// /battle-cards — Karten-Katalog (Standard-Karten)
// ============================================
// Zeigt die 6 Standard-Karten aus der DB. Noch kein Sammel-/Besitz-Flow
// (UserCard) — das ist ein Katalog, keine "meine Karten"-Ansicht.

import { prisma } from "@/lib/prisma";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import BattleCardView from "@/components/battle-cards/BattleCardView";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";
import DemoBattleLauncher from "@/components/battle-cards/DemoBattleLauncher";

export const metadata = {
  title: "Battle Cards | OMA",
};

export default async function BattleCardsPage() {
  const cards = await prisma.card.findMany({
    where: { rarity: "STANDARD" },
    orderBy: { name: "asc" },
  });

  const cardData: (BattleCardData & { id: string })[] = cards.map((card) => ({
    id: card.id,
    name: card.name,
    title: card.title,
    class: card.class,
    rarity: card.rarity,
    flavorText: card.flavorText,
    baseHp: card.baseHp,
    baseAttack: card.baseAttack,
    baseDefense: card.baseDefense,
    speed: card.speed,
    activityTier: card.activityTier,
    imageUrl: card.imageUrl,
    passivePositive: parsePassiveSkill(card.passivePositive, `${card.name}.passivePositive`),
    passiveNegative: parsePassiveSkill(card.passiveNegative, `${card.name}.passiveNegative`),
    activeSkill: parseActiveSkill(card.activeSkill, `${card.name}.activeSkill`),
    ultimateSkill: parseActiveSkill(card.ultimateSkill, `${card.name}.ultimateSkill`),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Battle Cards</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Die 6 Standard-Karten — antippen, um die Skill-Details auf der Rückseite zu sehen.
        </p>
      </div>

      <DemoBattleLauncher />

      {cardData.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Karten in der Datenbank.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cardData.map((card) => (
            <BattleCardView key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

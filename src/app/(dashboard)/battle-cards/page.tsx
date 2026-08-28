// ============================================
// /battle-cards — Hub
// ============================================
// Kein öffentlicher Karten-Katalog mehr. Verzweigt direkt:
//  - Noch kein Start-Pack gewählt → Picker (StarterPickFlow), Standard-Karten
//    sind hier NUR als Auswahlgrundlage sichtbar, nicht als Katalog.
//  - Start-Pack vorhanden → eigene Sammlung + Übungskampf gegen 5 Zufallskarten.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import BattleCardView from "@/components/battle-cards/BattleCardView";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";
import DemoBattleLauncher from "@/components/battle-cards/DemoBattleLauncher";
import StarterPickFlow from "@/components/battle-cards/StarterPickFlow";

export const metadata = {
  title: "Battle Cards | OMA",
};

function toCardData(card: {
  id: string; name: string; title: string; class: BattleCardData["class"]; rarity: BattleCardData["rarity"];
  flavorText: string; baseHp: number; baseAttack: number; baseDefense: number; speed: number;
  activityTier: BattleCardData["activityTier"]; imageUrl: string | null;
  passivePositive: unknown; passiveNegative: unknown; activeSkill: unknown; ultimateSkill: unknown;
}): BattleCardData & { id: string } {
  return {
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
  };
}

export default async function BattleCardsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards");
  }
  const userId = session.user.id;

  const ownsStarterDeck = await hasStarterDeck(userId);

  if (!ownsStarterDeck) {
    const standardCards = await prisma.card.findMany({
      where: { rarity: "STANDARD" },
      orderBy: { name: "asc" },
    });

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-lg font-black text-white">Wähle dein Start-Pack</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Zuerst je 1 Tank, 1 Support und 1 Damage Dealer — danach 2 weitere Karten nach Wahl.
          </p>
        </div>
        <StarterPickFlow cards={standardCards.map(toCardData)} />
      </div>
    );
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Battle Cards</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Deine Karten — antippen, um die Skill-Details auf der Rückseite zu sehen.
        </p>
      </div>

      <DemoBattleLauncher />

      {userCards.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Karten in deiner Sammlung.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {userCards.map((uc) => (
            <BattleCardView key={uc.id} card={{ ...toCardData(uc.card), level: uc.level }} />
          ))}
        </div>
      )}
    </div>
  );
}

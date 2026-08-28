import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";
import StarterPickFlow from "@/components/battle-cards/StarterPickFlow";

export const metadata = {
  title: "Start-Pack | OMA Battle Cards",
};

export default async function StarterPickPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=/battle-cards/starter-pick");

  if (await hasStarterDeck(session.user.id)) {
    redirect("/battle-cards");
  }

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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Wähle dein Start-Pack</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Zuerst je 1 Tank, 1 Support und 1 Damage Dealer — danach 2 weitere Karten nach Wahl.
        </p>
      </div>
      <StarterPickFlow cards={cardData} />
    </div>
  );
}

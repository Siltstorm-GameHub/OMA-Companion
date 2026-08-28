import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseActiveSkill, parsePassiveSkill } from "@/lib/battle-engine/skill-schema";
import { resolveCardImageUrl } from "@/lib/battle-cards/resolve-image";
import LineupEditor from "@/components/battle-cards/LineupEditor";
import type { BattleCardData } from "@/components/battle-cards/BattleCardView";

export const metadata = {
  title: "Startaufstellung | OMA Battle Cards",
};

export default async function LineupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/lineup");
  }

  const userCards = await prisma.userCard.findMany({
    where: { userId: session.user.id },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });

  if (userCards.length === 0) {
    redirect("/battle-cards");
  }

  const linkedDiscordIds = userCards
    .filter((uc) => uc.card.rarity === "COMMUNITY" && uc.card.linkedDiscordId)
    .map((uc) => uc.card.linkedDiscordId!);
  const avatarUsers = linkedDiscordIds.length
    ? await prisma.user.findMany({
        where: { discordId: { in: linkedDiscordIds } },
        select: { discordId: true, image: true },
      })
    : [];
  const avatarByDiscordId = new Map(avatarUsers.map((u) => [u.discordId!, u.image]));

  const cards = userCards.map((uc) => ({
    cardId: uc.cardId,
    level: uc.level,
    card: {
      name: uc.card.name,
      title: uc.card.title,
      class: uc.card.class,
      rarity: uc.card.rarity,
      flavorText: uc.card.flavorText,
      baseHp: uc.card.baseHp,
      baseAttack: uc.card.baseAttack,
      baseDefense: uc.card.baseDefense,
      speed: uc.card.speed,
      activityTier: uc.card.activityTier,
      imageUrl: resolveCardImageUrl(uc.card, avatarByDiscordId),
      passivePositive: parsePassiveSkill(uc.card.passivePositive, `${uc.card.name}.passivePositive`),
      passiveNegative: parsePassiveSkill(uc.card.passiveNegative, `${uc.card.name}.passiveNegative`),
      activeSkill: parseActiveSkill(uc.card.activeSkill, `${uc.card.name}.activeSkill`),
      ultimateSkill: parseActiveSkill(uc.card.ultimateSkill, `${uc.card.name}.ultimateSkill`),
    } satisfies BattleCardData,
  }));

  const initialLineup = userCards.filter((uc) => uc.inLineup).map((uc) => uc.cardId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Startaufstellung ändern</h1>
        <p className="text-xs text-gray-500 mt-0.5">Wähle bis zu 5 Karten, mit denen du kämpfst.</p>
      </div>
      <LineupEditor cards={cards} initialLineup={initialLineup} />
    </div>
  );
}

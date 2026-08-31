import { auth } from "@/auth";
import { openNextPack, PackError, type OpenPackResult } from "@/lib/battle-cards/packs";

function serializeCard(result: OpenPackResult) {
  const { card, isNewCard, duplicates } = result;
  return {
    card: {
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
      passivePositive: card.passivePositive,
      passiveNegative: card.passiveNegative,
      activeSkill: card.activeSkill,
      ultimateSkill: card.ultimateSkill,
    },
    isNewCard,
    duplicates,
  };
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const result = await openNextPack(session.user.id);
    return Response.json({
      cards: result.cards.map(serializeCard),
      remainingUnopened: result.remainingUnopened,
    });
  } catch (error) {
    if (error instanceof PackError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

import { auth } from "@/auth";
import { openNextPack, PackError } from "@/lib/battle-cards/packs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const result = await openNextPack(session.user.id);
    return Response.json({
      card: {
        id: result.card.id,
        name: result.card.name,
        title: result.card.title,
        class: result.card.class,
        rarity: result.card.rarity,
        flavorText: result.card.flavorText,
        baseHp: result.card.baseHp,
        baseAttack: result.card.baseAttack,
        baseDefense: result.card.baseDefense,
        speed: result.card.speed,
        activityTier: result.card.activityTier,
        imageUrl: result.card.imageUrl,
        passivePositive: result.card.passivePositive,
        passiveNegative: result.card.passiveNegative,
        activeSkill: result.card.activeSkill,
        ultimateSkill: result.card.ultimateSkill,
      },
      isNewCard: result.isNewCard,
      duplicates: result.duplicates,
      remainingUnopened: result.remainingUnopened,
    });
  } catch (error) {
    if (error instanceof PackError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

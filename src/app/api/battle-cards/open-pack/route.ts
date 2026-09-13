import { auth } from "@/auth";
import { openNextPack, PackError, type PackDrawResult } from "@/lib/battle-cards/packs";
import { resolveAvatarsForCards, toCardData } from "@/lib/battle-cards/card-view";

function serializeDrawResult(result: PackDrawResult, avatarByDiscordId: Map<string, string | null>) {
  if (result.itemKind === "card") {
    return {
      itemKind: "card" as const,
      card: toCardData(result.card, avatarByDiscordId),
      isNewCard: result.isNewCard,
      duplicates: result.duplicates,
    };
  }
  return {
    itemKind: "tactic" as const,
    tacticCard: {
      id: result.tacticCard.id,
      name: result.tacticCard.name,
      kind: result.tacticCard.kind,
      flavorText: result.tacticCard.flavorText,
      description: result.tacticCard.description,
      imageUrl: result.tacticCard.imageUrl,
    },
    isNewCard: result.isNewCard,
    duplicates: result.duplicates,
  };
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  try {
    const result = await openNextPack(session.user.id);
    const heroCards = result.cards.flatMap((r) => (r.itemKind === "card" ? [r.card] : []));
    const avatarByDiscordId = await resolveAvatarsForCards(heroCards);
    return Response.json({
      cards: result.cards.map((r) => serializeDrawResult(r, avatarByDiscordId)),
      remainingUnopened: result.remainingUnopened,
      kind: result.kind,
      nextKind: result.nextKind,
    });
  } catch (error) {
    if (error instanceof PackError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

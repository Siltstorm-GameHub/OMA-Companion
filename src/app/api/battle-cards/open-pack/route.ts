import { auth } from "@/auth";
import { openNextPack, PackError, type OpenPackResult } from "@/lib/battle-cards/packs";
import { resolveAvatarsForCards, toCardData } from "@/lib/battle-cards/card-view";

function serializeCard(result: OpenPackResult, avatarByDiscordId: Map<string, string | null>) {
  const { card, isNewCard, duplicates } = result;
  return {
    card: toCardData(card, avatarByDiscordId),
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
    const avatarByDiscordId = await resolveAvatarsForCards(result.cards.map((r) => r.card));
    return Response.json({
      cards: result.cards.map((r) => serializeCard(r, avatarByDiscordId)),
      remainingUnopened: result.remainingUnopened,
    });
  } catch (error) {
    if (error instanceof PackError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

import { auth } from "@/auth";
import { openNextPack, PackError, type PackDrawResult } from "@/lib/gems/packs";
import { resolveAvatarsForCards, toCardData } from "@/lib/gems/card-view";

function serializeDrawResult(result: PackDrawResult, avatarByDiscordId: Map<string, string | null>) {
  return {
    itemKind: "card" as const,
    card: toCardData(result.card, avatarByDiscordId),
    isNewCard: result.isNewCard,
    coins: result.coins,
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

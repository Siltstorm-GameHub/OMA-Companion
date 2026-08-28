// ============================================
// GET /api/battle-cards/other-cards
// ============================================
// Paginierte, gefilterte Liste aller Karten, die der Spieler NICHT besitzt
// ("Alle Karten im Spiel" auf /battle-cards) — damit beim Laden/Filtern
// nicht immer der komplette Kartenbestand auf einmal geschickt wird.
//
// Query-Params: class (TANK|SUPPORT|DAMAGE_DEALER, optional), offset, limit
// (max. 48 pro Anfrage).

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isCardClass, sortByQuality, toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }
  const userId = session.user.id;

  const url = new URL(request.url);
  const classParam = url.searchParams.get("class");
  const classFilter = isCardClass(classParam) ? classParam : undefined;
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get("limit") ?? "12", 10) || 12));

  const ownedCardIds = (
    await prisma.userCard.findMany({ where: { userId }, select: { cardId: true } })
  ).map((uc) => uc.cardId);

  const matching = await prisma.card.findMany({
    where: {
      id: { notIn: ownedCardIds },
      ...(classFilter ? { class: classFilter } : {}),
    },
  });

  const sorted = sortByQuality(matching);
  const page = sorted.slice(offset, offset + limit);
  const avatarByDiscordId = await resolveAvatarsForCards(page);

  return Response.json({
    cards: page.map((c) => toCardData(c, avatarByDiscordId)),
    total: sorted.length,
    offset,
    limit,
  });
}

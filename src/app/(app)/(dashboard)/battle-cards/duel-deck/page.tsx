import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { getActiveDuelDeck } from "@/lib/battle-cards/duel-deck";
import { DUEL_DECK_MIN_UNIT_CARDS, DUEL_DECK_TOTAL_SIZE } from "@/lib/battle-engine/duel-constants";
import DuelDeckEditor from "@/components/battle-cards/DuelDeckEditor";

export const metadata = {
  title: "Duell-Deck | OMA Battle Cards",
};

export default async function DuelDeckPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/duel-deck");
  }

  if (!(await hasStarterDeck(session.user.id))) {
    redirect("/battle-cards");
  }

  const userId = session.user.id;

  const [userCards, userTacticCards, activeDeck] = await Promise.all([
    prisma.userCard.findMany({ where: { userId }, include: { card: true }, orderBy: { acquiredAt: "asc" } }),
    prisma.userTacticCard.findMany({ where: { userId }, include: { tacticCard: true } }),
    getActiveDuelDeck(userId),
  ]);

  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));

  const unitCards = userCards.map((uc) => ({
    cardId: uc.cardId,
    level: uc.level,
    card: toCardData(uc.card, avatarByDiscordId),
  }));

  const tacticCards = userTacticCards.map((utc) => ({
    tacticCardId: utc.tacticCardId,
    name: utc.tacticCard.name,
    kind: utc.tacticCard.kind,
    flavorText: utc.tacticCard.flavorText,
    description: utc.tacticCard.description,
    imageUrl: utc.tacticCard.imageUrl,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Duell-Deck zusammenstellen</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Wähle genau {DUEL_DECK_TOTAL_SIZE} Karten für OMA Duels — mindestens {DUEL_DECK_MIN_UNIT_CARDS} davon müssen
          Einheiten-Karten sein, der Rest darf aus Taktik-Karten (Items &amp; Fallen) bestehen.
        </p>
      </div>
      <DuelDeckEditor
        unitCards={unitCards}
        tacticCards={tacticCards}
        initialUnitCardIds={activeDeck?.unitCardIds ?? []}
        initialTacticCardIds={activeDeck?.tacticCardIds ?? []}
      />
    </div>
  );
}

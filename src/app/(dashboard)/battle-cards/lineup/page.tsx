import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import LineupEditor from "@/components/battle-cards/LineupEditor";

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

  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));

  const cards = userCards.map((uc) => ({
    cardId: uc.cardId,
    level: uc.level,
    card: toCardData(uc.card, avatarByDiscordId),
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

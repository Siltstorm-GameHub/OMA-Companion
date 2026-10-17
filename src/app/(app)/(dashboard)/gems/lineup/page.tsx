import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCardData, resolveAvatarsForCards } from "@/lib/gems/card-view";
import { ensureGemsStarter } from "@/lib/gems/auto-starter";
import LineupEditor from "@/components/gems/LineupEditor";

export const metadata = {
  title: "Startaufstellung | OMA Gems",
};

export default async function LineupPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems/lineup");
  }

  await ensureGemsStarter(session.user.id);

  const userCards = await prisma.userCard.findMany({
    where: { userId: session.user.id },
    include: { card: true },
    orderBy: { acquiredAt: "asc" },
  });

  const avatarByDiscordId = await resolveAvatarsForCards(userCards.map((uc) => uc.card));

  const cards = userCards.map((uc) => ({
    cardId: uc.cardId,
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

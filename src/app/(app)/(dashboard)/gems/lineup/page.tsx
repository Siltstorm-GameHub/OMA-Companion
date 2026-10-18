import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCardData, resolveAvatarsForCards } from "@/lib/gems/card-view";
import { ensureGemsStarter } from "@/lib/gems/auto-starter";
import LoadoutEditor from "@/components/gems/LoadoutEditor";
import { getOwnedRelics } from "@/lib/gems/relic-store";
import { cardXp } from "@/lib/gems/card-ranks";

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
    xp: cardXp(uc.winsInLineup, uc.rankBonusHalves, uc.gemXp),
    card: toCardData(uc.card, avatarByDiscordId),
  }));

  const initialLineup = userCards.filter((uc) => uc.inLineup).map((uc) => uc.cardId);
  const relics = await getOwnedRelics(session.user.id);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-3">
      <div>
        <h1 className="text-lg font-black text-white">Aufstellung &amp; Relikte</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Wähle bis zu 5 Karten für den Kampf. Karten in der Aufstellung sammeln XP — je mehr Gems ihrer Klasse du
          zerstörst, desto mehr.
        </p>
      </div>
      <LoadoutEditor
        cards={cards}
        initialLineup={initialLineup}
        ownedRelics={relics.map((r) => r.relicId)}
        equippedRelics={relics.filter((r) => r.equipped).map((r) => r.relicId)}
      />
    </div>
  );
}

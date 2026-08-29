// ============================================
// /battle-cards — Hub
// ============================================
// Kein öffentlicher Karten-Katalog mehr. Verzweigt direkt:
//  - Noch kein Start-Pack gewählt → Picker (StarterPickFlow), Standard-Karten
//    sind hier NUR als Auswahlgrundlage sichtbar, nicht als Katalog.
//  - Start-Pack vorhanden → "Deine Karten": Startaufstellung zuerst, dann
//    restliche eigene Karten, darunter visuell abgetrennt alle Karten, die
//    es im Spiel gibt (inkl. aller Community-Karten), ausgegraut, gefiltert
//    nach Klasse und seitenweise nachgeladen (siehe CardCollectionBrowser).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat, IdCard, Swords } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { countUnopenedPacks } from "@/lib/battle-cards/packs";
import { sortByQuality, toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { hasMinRole } from "@/lib/roles";
import StarterPickFlow from "@/components/battle-cards/StarterPickFlow";
import PackOpener from "@/components/battle-cards/PackOpener";
import CardCollectionBrowser from "@/components/battle-cards/CardCollectionBrowser";
import TestBattleLauncher from "@/components/battle-cards/TestBattleLauncher";

const OTHER_CARDS_PAGE_SIZE = 12;

export const metadata = {
  title: "Battle Cards | OMA",
};

export default async function BattleCardsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards");
  }
  const userId = session.user.id;

  const ownsStarterDeck = await hasStarterDeck(userId);

  if (!ownsStarterDeck) {
    const standardCards = await prisma.card.findMany({
      where: { rarity: "STANDARD" },
      orderBy: { name: "asc" },
    });

    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-lg font-black text-white">Wähle dein Start-Pack</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Zuerst je 1 Tank, 1 Support und 1 Damage Dealer — danach 2 weitere Karten nach Wahl.
          </p>
        </div>
        <StarterPickFlow cards={standardCards.map((c) => toCardData(c))} />
      </div>
    );
  }

  const ownedUserCards = await prisma.userCard.findMany({
    where: { userId },
    include: { card: true },
    orderBy: [{ inLineup: "desc" }, { acquiredAt: "asc" }],
  });
  const ownedCardIds = ownedUserCards.map((uc) => uc.cardId);

  const otherCardsAll = await prisma.card.findMany({
    where: { id: { notIn: ownedCardIds } },
  });
  const otherCardsSorted = sortByQuality(otherCardsAll);
  const otherCardsFirstPage = otherCardsSorted.slice(0, OTHER_CARDS_PAGE_SIZE);

  const avatarByDiscordId = await resolveAvatarsForCards([
    ...ownedUserCards.map((uc) => uc.card),
    ...otherCardsFirstPage,
  ]);
  const unopenedPacks = await countUnopenedPacks(userId);
  const pendingChallenges = await prisma.battleChallenge.count({ where: { opponentId: userId, status: "pending" } });
  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, points: true } });
  const isModOrAdmin = !!currentUser && hasMinRole(currentUser.role, "moderator");

  const ownedCards = ownedUserCards.map((uc) => ({
    id: uc.id,
    level: uc.level,
    duplicates: uc.duplicates,
    card: { ...toCardData(uc.card, avatarByDiscordId), level: uc.level },
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-black text-white">Deine Karten</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Antippen, um die Skill-Details auf der Rückseite zu sehen.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {ownedUserCards.some((uc) => uc.card.rarity === "COMMUNITY") && (
            <Link
              href="/battle-cards/my-card"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors shrink-0"
            >
              <IdCard className="w-3.5 h-3.5" /> Meine Community-Karte
            </Link>
          )}
          <Link
            href="/battle-cards/challenges"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors shrink-0"
          >
            <Swords className="w-3.5 h-3.5" /> Herausforderungen
            {pendingChallenges > 0 && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {pendingChallenges}
              </span>
            )}
          </Link>
          <Link
            href="/battle-cards/lineup"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors shrink-0"
          >
            <Repeat className="w-3.5 h-3.5" /> Startaufstellung ändern
          </Link>
        </div>
      </div>

      <PackOpener initialUnopenedCount={unopenedPacks} />

      {isModOrAdmin && <TestBattleLauncher />}

      <CardCollectionBrowser
        ownedCards={ownedCards}
        initialOtherCards={otherCardsFirstPage.map((c) => toCardData(c, avatarByDiscordId))}
        initialOtherTotal={otherCardsSorted.length}
        initialCoins={currentUser?.points ?? 0}
      />
    </div>
  );
}

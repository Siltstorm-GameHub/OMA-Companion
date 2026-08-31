// ============================================
// /battle-cards — Hub (3 Reiter: Kampf, Karten, Community)
// ============================================
// Kein öffentlicher Karten-Katalog mehr. Verzweigt direkt:
//  - Noch kein Start-Pack gewählt → Picker (StarterPickFlow), Standard-Karten
//    sind hier NUR als Auswahlgrundlage sichtbar, nicht als Katalog.
//  - Start-Pack vorhanden → drei Reiter:
//    "Kampf" (Startbildschirm: Startaufstellung, Packs, Testkampf für Mods),
//    "Karten" (Sammlung — siehe CardCollectionBrowser),
//    "Community" (eigene offene Herausforderungen, Kampfhistorie aller
//    User, Rangliste).

import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat, IdCard, Trophy, Swords } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { countUnopenedPacks } from "@/lib/battle-cards/packs";
import { sortByQuality, toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { getUpgradeEconomyConfig } from "@/lib/battle-cards/upgrade-admin-config";
import { getBattleCardsLeaderboard } from "@/lib/battle-cards/leaderboard";
import { hasMinRole } from "@/lib/roles";
import StarterPickFlow from "@/components/battle-cards/StarterPickFlow";
import PackOpener from "@/components/battle-cards/PackOpener";
import CardCollectionBrowser from "@/components/battle-cards/CardCollectionBrowser";
import TestBattleLauncher from "@/components/battle-cards/TestBattleLauncher";
import BattleCardsTabs from "./BattleCardsTabs";
import ChallengesList from "@/components/battle-cards/ChallengesList";
import ChallengeUserPicker from "@/components/battle-cards/ChallengeUserPicker";
import MatchmakingWidget from "@/components/battle-cards/MatchmakingWidget";
import BattleHistoryFeed from "@/components/battle-cards/BattleHistoryFeed";
import LeaderboardList from "@/components/battle-cards/LeaderboardList";

const OTHER_CARDS_PAGE_SIZE = 12;
const userSelect = { id: true, username: true, name: true, image: true, rankPoints: true } as const;

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
            In 4 Schritten: Tank, Damage Dealer, Support — danach 2 weitere Karten nach Wahl.
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
  const upgradeEconomy = await getUpgradeEconomyConfig();

  const ownedCards = ownedUserCards.map((uc) => ({
    id: uc.id,
    level: uc.level,
    duplicates: uc.duplicates,
    card: { ...toCardData(uc.card, avatarByDiscordId), level: uc.level },
  }));

  // ── Community-Reiter: eigene offene Herausforderungen, Kampfhistorie aller User, Rangliste ──
  const [incoming, outgoing, allResolved, leaderboardRows] = await Promise.all([
    prisma.battleChallenge.findMany({
      where: { opponentId: userId, status: "pending" },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { challengerId: userId, status: "pending" },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.battleChallenge.findMany({
      where: { status: "resolved" },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { respondedAt: "desc" },
      take: 30,
    }),
    getBattleCardsLeaderboard(),
  ]);

  function serialize<T extends { createdAt: Date }>(rows: T[]) {
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  const kampfPanel = (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-black text-white">Kampf</h1>
          <p className="text-xs text-gray-500 mt-0.5">Packs öffnen, Startaufstellung pflegen, loslegen.</p>
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
            href="/battle-cards/lineup"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors shrink-0"
          >
            <Repeat className="w-3.5 h-3.5" /> Startaufstellung ändern
          </Link>
        </div>
      </div>

      {pendingChallenges > 0 && (
        <Link
          href="/battle-cards?tab=community"
          className="flex items-center gap-2.5 glass rounded-xl p-3 hover:bg-white/[0.04] transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0">
            <Swords className="w-4 h-4 text-rose-400" />
          </span>
          <span className="flex-1 text-sm text-white">
            {pendingChallenges} offene {pendingChallenges === 1 ? "Herausforderung wartet" : "Herausforderungen warten"} auf dich
          </span>
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold shrink-0">
            {pendingChallenges}
          </span>
        </Link>
      )}

      <PackOpener initialUnopenedCount={unopenedPacks} />

      {isModOrAdmin && <TestBattleLauncher />}
    </div>
  );

  const kartenPanel = (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Deine Karten</h1>
        <p className="text-xs text-gray-500 mt-0.5">Antippen, um die Skill-Details auf der Rückseite zu sehen.</p>
      </div>
      <CardCollectionBrowser
        ownedCards={ownedCards}
        initialOtherCards={otherCardsFirstPage.map((c) => toCardData(c, avatarByDiscordId))}
        initialOtherTotal={otherCardsSorted.length}
        initialCoins={currentUser?.points ?? 0}
        duplicateThresholds={upgradeEconomy.duplicateThresholds}
        upgradeCosts={upgradeEconomy.upgradeCosts}
      />
    </div>
  );

  const communityPanel = (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-black text-white">Community</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Herausforderungen, Kampfhistorie aller Mitglieder und die Rangliste.
        </p>
      </div>

      <MatchmakingWidget />
      <ChallengeUserPicker />
      <ChallengesList incoming={serialize(incoming)} outgoing={serialize(outgoing)} />

      <div className="space-y-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Kampfhistorie aller Mitglieder
        </h2>
        <BattleHistoryFeed entries={allResolved} />
      </div>

      <div className="space-y-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Rangliste
        </h2>
        <LeaderboardList rows={leaderboardRows} viewerId={userId} />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BattleCardsTabs
        kampfPanel={kampfPanel}
        kartenPanel={kartenPanel}
        communityPanel={communityPanel}
        communityBadge={pendingChallenges}
      />
    </div>
  );
}

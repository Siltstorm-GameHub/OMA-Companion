// ============================================
// /gems — Hub von OMA Gems (3 Reiter: Spielen, Sammlung, Shop)
// ============================================
// Einstieg in der App-Navigation. Wer noch kein Lineup hat, bekommt beim ersten Aufruf automatisch ein
// Startpaket (siehe auto-starter.ts) — es gibt keine vorgeschaltete Helden-Einrichtung mehr.
//    "Spielen"  („Weiter“-Karte mit Tageswerten, Event-Turnier, Kampagne, Rangliste),
//    "Sammlung" (Startaufstellung + Karten),
//    "Shop"     (Glücksrad, Packs öffnen und kaufen).
//  Alte ?tab=-Werte landen über LEGACY_TABS in GemsTabs im passenden Reiter.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureGemsStarter } from "@/lib/gems/auto-starter";
import { countUnopenedPacks, peekNextPackKind, countPacksPurchasedToday, PACK_DAILY_PURCHASE_LIMIT } from "@/lib/gems/packs";
import { sortByQuality, toCardData, resolveAvatarsForCards } from "@/lib/gems/card-view";
import { getShopConfig } from "@/lib/shop-config";
import { getCampaignLeaderboard, getSeasonLeaderboard, toSeasonEntry } from "@/lib/gems/leaderboard";
import { getEquippedRelicIds } from "@/lib/gems/relic-store";
import { relicById } from "@/lib/gems/relics";
import { getPlayStatus } from "@/lib/gems/play-status";
import LeaderboardList, { LEADERBOARD_TEXTS } from "@/components/gems/LeaderboardList";
import GemsPlayCard from "@/components/gems/GemsPlayCard";
import PackOpener from "@/components/gems/PackOpener";
import CardCollectionBrowser from "@/components/gems/CardCollectionBrowser";
import GemsTabs from "./GemsTabs";
import { ChevronRight, Gem } from "@/components/icons";
import LineupStrip from "@/components/gems/LineupStrip";
import CampaignMap from "@/components/gems/CampaignMap";
import GemsTournamentBanner from "@/components/gems/GemsTournamentBanner";
import CoinIcon from "@/components/CoinIcon";
import DailySpin from "@/components/gems/shop/DailySpin";
import BuyPack from "@/components/gems/shop/BuyPack";
import HeroFigure from "@/components/gems/HeroFigure";
import HeroBackdrop from "@/components/gems/HeroBackdrop";
import { getOwnCommunityCard, getOwnedCosmetics } from "@/lib/gems/hero/my-hero";
import { rankPoints } from "@/lib/gems/card-ranks";
import CosmeticShop from "@/components/gems/shop/CosmeticShop";
import { effectiveHeroLook, type HeroClass } from "@/lib/gems/hero/look";

const OTHER_CARDS_PAGE_SIZE = 12;
const LEADERBOARD_PREVIEW = 5;

export const metadata = {
  title: "OMA Gems | OMA",
};

export default async function GemsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems");
  }
  const userId = session.user.id;

  await ensureGemsStarter(userId);

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
  const nextPackKind = unopenedPacks > 0 ? await peekNextPackKind(userId) : null;
  const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  const [shopConfig, purchasedToday, todaySpin, leaderboardRows, seasonRows, equippedRelicIds, ownHeroCard] = await Promise.all([
    getShopConfig(),
    countPacksPurchasedToday(userId),
    prisma.dailySpin.findFirst({ where: { userId, date: new Date().toISOString().slice(0, 10) } }).catch(() => null),
    getCampaignLeaderboard(),
    getSeasonLeaderboard(),
    getEquippedRelicIds(userId),
    getOwnCommunityCard(userId),
  ]);

  const ownedCards = ownedUserCards.map((uc) => ({
    id: uc.id,
    acquiredAt: uc.acquiredAt.toISOString(),
    winsInLineup: rankPoints(uc.winsInLineup, uc.rankBonusHalves),
    card: toCardData(uc.card, avatarByDiscordId),
  }));
  const lineupCards = ownedUserCards
    .filter((uc) => uc.inLineup)
    .map((uc) => ({ card: toCardData(uc.card, avatarByDiscordId), winsInLineup: rankPoints(uc.winsInLineup, uc.rankBonusHalves) }));

  const coins = currentUser?.points ?? 0;
  const playStatus = await getPlayStatus(userId, leaderboardRows, seasonRows);
  const ownedCosmetics = ownHeroCard ? await getOwnedCosmetics(userId) : new Set<string>();
  const seasonEntries = seasonRows.map(toSeasonEntry);
  const isLeader = playStatus.current.isEndless
    ? seasonRows[0]?.userId === userId
    : leaderboardRows[0]?.userId === userId;
  const equippedRelics = equippedRelicIds.map((id) => relicById(id)!).filter(Boolean);

  const spielenPanel = (
    <div className="space-y-8">
      <GemsPlayCard status={playStatus} isLeader={isLeader} />

      <GemsTournamentBanner />

      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white">Kampagne</h2>
        <CampaignMap />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-white">Rangliste · Saison {playStatus.season.label}</h2>
          <Link href="/gems/leaderboard" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors">
            Woche, Heute, alle →
          </Link>
        </div>
        <LeaderboardList rows={seasonEntries} viewerId={userId} limit={LEADERBOARD_PREVIEW} {...LEADERBOARD_TEXTS.saison} />
      </div>
    </div>
  );

  const sammlungPanel = (
    <div className="space-y-4">
      {ownHeroCard && (
        <Link
          href="/gems/held"
          className="glass rounded-2xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors"
        >
          <span className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden">
            <HeroBackdrop id={effectiveHeroLook(ownHeroCard).backdrop} />
            <HeroFigure look={effectiveHeroLook(ownHeroCard)} title={ownHeroCard.name} className="relative w-full h-full" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-display text-base font-bold text-white">Mein Held gestalten</span>
            <span className="block text-xs text-gray-400">
              Gesicht, Frisur, Ausrüstung, Pose und Hintergrund deiner Community-Karte — so sehen dich alle Sammler.
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
        </Link>
      )}
      <div>
        <h2 className="font-display text-lg font-bold text-white">Deine Karten</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Antippen für Details. Karten steigen durch Siege in deiner Startaufstellung im Rang auf und werden stärker.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Startaufstellung</h2>
        <LineupStrip cards={lineupCards} />
        <p className="text-[11px] text-gray-500 px-0.5">
          {equippedRelics.length > 0
            ? `Relikte: ${equippedRelics.map((r) => r.name).join(", ")}`
            : "Noch keine Relikte — die gibt es für Turmwächter (Endlos-Stufe 20, 30, …)."}{" "}
          <Link href="/gems/lineup" className="font-semibold text-gray-400 hover:text-white">
            Ändern →
          </Link>
        </p>
      </div>

      <CardCollectionBrowser
        ownedCards={ownedCards}
        initialOtherCards={otherCardsFirstPage.map((c) => toCardData(c, avatarByDiscordId))}
        initialOtherTotal={otherCardsSorted.length}
      />
    </div>
  );

  const ladenPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-lg font-bold text-white">Shop</h2>
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400 tabular-nums"><CoinIcon size={16} /> {coins} Münzen</span>
      </div>

      <DailySpin
        alreadySpun={!!todaySpin}
        lastResult={todaySpin ? { prizeLabel: todaySpin.prizeLabel, prizeType: todaySpin.prizeType } : null}
        initialPoints={coins}
        prizes={shopConfig.wheelPrizes}
      />

      <PackOpener initialUnopenedCount={unopenedPacks} initialNextPackKind={nextPackKind} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <BuyPack
          packPrices={shopConfig.packPrices}
          initialPoints={coins}
          dailyLimit={PACK_DAILY_PURCHASE_LIMIT}
          purchasedToday={purchasedToday}
        />
      </div>

      {ownHeroCard && (
        <CosmeticShop
          look={effectiveHeroLook(ownHeroCard)}
          heroClass={ownHeroCard.class as HeroClass}
          owned={[...ownedCosmetics]}
          coins={coins}
        />
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", boxShadow: "0 0 20px rgba(20,184,166,0.10)" }}
          >
            <Gem className="w-4.5 h-4.5 text-teal-400" />
          </div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight">OMA Gems</h1>
        </div>
        <p className="text-xs text-gray-500 ml-11">Match-3-Kämpfe mit den Karten der Community · Kampagne, Endlos-Turm und Turniere</p>
      </div>
      <GemsTabs
        spielenPanel={spielenPanel}
        sammlungPanel={sammlungPanel}
        ladenPanel={ladenPanel}
        ladenBadge={unopenedPacks}
      />
    </div>
  );
}

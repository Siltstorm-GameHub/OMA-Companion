// ============================================
// /battle-cards — Hub (5 Reiter: Held, Welt, Arena, Sammlung, Laden)
// ============================================
// Der Hub ist das Menü von OMA Battle Cards und in der App-Navigation der Einstieg. Verzweigt direkt:
//  - Helden-Einrichtung noch offen → zeigt das Layout (HeroSetup) statt dieser Seite.
//  - Einrichtung abgeschlossen → fünf Reiter:
//    "Held" (Startseite: Stufe, Vermögen, was gerade wartet),
//    "Welt" (Einstieg in OMA Quest),
//    "Arena" (alle Kampfmodi: BattleLauncher, Kampagne, Herausforderungen, Rangliste),
//    "Sammlung" (Karten, Aufstellung, Duel-Deck — siehe CardCollectionBrowser),
//    "Laden" (Packs, Glücksrad, Held neu würfeln — vormals /shop).
//  Alte ?tab=-Werte (kampf/kampagne/community/karten) landen über LEGACY_TABS im passenden Reiter.

import Link from "next/link";
import { redirect } from "next/navigation";
import MobaIcon from "@/components/battle-cards/MobaIcon";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasStarterDeck } from "@/lib/battle-cards/starter-pick";
import { countUnopenedPacks, peekNextPackKind, countPacksPurchasedToday, PACK_DAILY_PURCHASE_LIMIT } from "@/lib/battle-cards/packs";
import { sortByQuality, toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import { getUpgradeEconomyConfig } from "@/lib/battle-cards/upgrade-admin-config";
import { getBattleCardsLeaderboard } from "@/lib/battle-cards/leaderboard";
import { getCombinedElo } from "@/lib/battle-cards/elo";
import { getSeasonConfig } from "@/lib/season/season-config";
import { getCurrentSeasonNumber, getSeasonWindow } from "@/lib/battle-cards/ranked-season";
import { getTutorialProgress, getTutorialStep, hasOwnCommunityCard } from "@/lib/battle-cards/tutorial";
import { getActiveDuelDeck } from "@/lib/battle-cards/duel-deck";
import { DUEL_DECK_TOTAL_SIZE } from "@/lib/battle-engine/duel-constants";
import PackOpener from "@/components/battle-cards/PackOpener";
import CardCollectionBrowser from "@/components/battle-cards/CardCollectionBrowser";
import BattleCardsTabs from "./BattleCardsTabs";
import BattleCardsLogo from "@/components/battle-cards/BattleCardsLogo";
import ChallengesList from "@/components/battle-cards/ChallengesList";
import BattleLauncher from "@/components/battle-cards/BattleLauncher";
import LeaderboardTabs from "@/components/battle-cards/LeaderboardTabs";
import LineupStrip from "@/components/battle-cards/LineupStrip";
import CampaignMap from "@/components/battle-cards/CampaignMap";
import TutorialProgressBanner from "@/components/battle-cards/TutorialProgressBanner";
import { formatBerlinDate } from "@/lib/time";
import { getHeroSetup } from "@/lib/battle-cards/hero-setup";
import { getShopConfig } from "@/lib/shop-config";
import { getHeroCockpit, worldEntryLabel } from "@/lib/battle-cards/hub-hero";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import { HubCoinShop, HubProgress, HubQuestLog } from "@/components/battle-cards/HubQuestPanels";
import HeldPanel from "@/components/battle-cards/HeldPanel";
import CoinIcon from "@/components/CoinIcon";
import DailySpin from "@/components/battle-cards/shop/DailySpin";
import BuyPack from "@/components/battle-cards/shop/BuyPack";
import BuyDndReroll from "@/components/battle-cards/shop/BuyDndReroll";

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

  // Die Helden-Einrichtung (Aussehen, Klasse, Start-Pack) zeigt das Layout dieses Bereichs, solange sie
  // offen ist — hier landet nur, wer keinen verknüpften Discord-Account und damit keinen Helden hat.
  if (!ownsStarterDeck) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 space-y-3">
        <BattleCardsLogo />
        <h1 className="text-lg font-black text-white">Dein Held fehlt noch</h1>
        <p className="text-sm text-gray-500">
          Dein Charakter ist die Grundlage von OMA Battle Cards und hängt an deinem verknüpften Discord-Account.
          Melde dich mit Discord an, damit er angelegt werden kann.
        </p>
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
  const nextPackKind = unopenedPacks > 0 ? await peekNextPackKind(userId) : null;
  const pendingChallenges = await prisma.battleChallenge.count({ where: { opponentId: userId, status: "pending" } });
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, eloDuels: true, eloGems: true },
  });
  const heroSetup = await getHeroSetup(userId);
  const cockpit = heroSetup ? await getHeroCockpit(heroSetup.card) : null;
  const hero = cockpit?.card ?? null;
  const [shopConfig, purchasedToday, todaySpin] = await Promise.all([
    getShopConfig(),
    countPacksPurchasedToday(userId),
    prisma.dailySpin.findFirst({ where: { userId, date: new Date().toISOString().slice(0, 10) } }).catch(() => null),
  ]);
  const builder = await getBuilderAccess(userId);
  const upgradeEconomy = await getUpgradeEconomyConfig();
  const activeDuelDeck = await getActiveDuelDeck(userId);
  const duelDeckCount = (activeDuelDeck?.unitCardIds.length ?? 0) + (activeDuelDeck?.tacticCardIds.length ?? 0);

  // ── Tutorial: nur relevant, falls für diesen User überhaupt eine Zeile existiert
  //    (startet erst beim Wählen des Start-Packs, siehe tutorial.ts) ──
  const tutorialProgress = await getTutorialProgress(userId);
  const tutorialStep = tutorialProgress
    ? getTutorialStep(tutorialProgress, await hasOwnCommunityCard(userId))
    : "done";

  const ownedCards = ownedUserCards.map((uc) => ({
    id: uc.id,
    level: uc.level,
    duplicates: uc.duplicates,
    acquiredAt: uc.acquiredAt.toISOString(),
    card: { ...toCardData(uc.card, avatarByDiscordId), level: uc.level },
  }));
  const lineupCards = ownedUserCards
    .filter((uc) => uc.inLineup)
    .map((uc) => ({ card: toCardData(uc.card, avatarByDiscordId), level: uc.level }));

  // ── Ranglisten-Saison: solange Saison 1 noch nicht ausgelöst wurde, zählt die
  //    gesamte Historie (Fallback); danach nur das aktuell laufende 3-Monats-Fenster. ──
  const seasonConfig = await getSeasonConfig();
  const seasonAnchor = seasonConfig.season1RanAt ? new Date(seasonConfig.season1RanAt) : null;
  const currentSeasonWindow = seasonAnchor
    ? getSeasonWindow(seasonAnchor, getCurrentSeasonNumber(seasonAnchor, new Date()))
    : null;

  // ── Community-Reiter: eigene offene/laufende Herausforderungen, Rangliste ──
  // Drei Ranglisten-Varianten (Gesamt + je Modus einzeln) — OMA Duels und OMA Gems PvP zählen
  // serverseitig bereits gemeinsam in "Gesamt" (siehe leaderboard.ts), hier zusätzlich einzeln
  // abrufbar für den Umschalter in LeaderboardTabs.
  const [incoming, outgoing, live, leaderboardRows, duelsLeaderboardRows, gemsLeaderboardRows] = await Promise.all([
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
      where: { status: "live", OR: [{ challengerId: userId }, { opponentId: userId }] },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    }),
    getBattleCardsLeaderboard(currentSeasonWindow ?? undefined),
    getBattleCardsLeaderboard(currentSeasonWindow ?? undefined, "DUELS"),
    getBattleCardsLeaderboard(currentSeasonWindow ?? undefined, "GEMS"),
  ]);

  function serialize<T extends { createdAt: Date }>(rows: T[]) {
    return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  }

  const hasChallenges = incoming.length > 0 || outgoing.length > 0 || live.length > 0;
  const eloDuels = currentUser?.eloDuels ?? 1000;
  const eloGems = currentUser?.eloGems ?? 1000;
  const eloOverall = getCombinedElo(eloDuels, eloGems);

  const rankingBlock = (
    <div className="space-y-8">
      <div className="moba-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[color:var(--moba-accent)]/10 border border-[color:var(--moba-accent-line)] flex items-center justify-center shrink-0">
              <MobaIcon name="trophy" className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--moba-ink)]">Rangliste</p>
              {currentSeasonWindow && (
                <p className="text-[10px] text-[color:var(--moba-ink-dim)]">
                  Saison {currentSeasonWindow.seasonNumber} · endet am {formatBerlinDate(currentSeasonWindow.end)}
                </p>
              )}
            </div>
          </div>
        </div>
        <LeaderboardTabs overall={leaderboardRows} duels={duelsLeaderboardRows} gems={gemsLeaderboardRows} viewerId={userId} />
      </div>
    </div>
  );


  const coins = currentUser?.points ?? 0;
  const openPoints = (hero?.dndAttrPoints ?? 0) + (hero?.dndPerkPicks ?? 0) + (cockpit?.invites.length ?? 0);

  const heldPanel = cockpit && (
    <HeldPanel
      cockpit={cockpit}
      tutorialStep={tutorialStep}
      coins={coins}
      eloOverall={eloOverall}
      unopenedPacks={unopenedPacks}
      pendingChallenges={pendingChallenges}
      spunToday={!!todaySpin}
      lineupCards={lineupCards}
    />
  );

  const worldEntry = hero ? worldEntryLabel(hero, cockpit?.place ?? null) : { title: "Zur Weltkarte", sub: "Reisen, Quests erledigen, Gold verdienen" };
  const weltPanel = (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">OMA Quest</h1>
        <p className="text-xs text-gray-500 mt-0.5">Die Welt deines Helden: Karte, Orte, Quests, Gruppe und Händler.</p>
      </div>
      <Link href="/oma-quest" className="moba-panel rounded-2xl p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 min-w-0">
          <MobaIcon name="map" className="w-10 h-10 shrink-0" />
          <span className="min-w-0"><span className="block text-sm font-bold text-white truncate">{worldEntry.title}</span><span className="block text-xs text-gray-500">{worldEntry.sub}</span></span>
        </span>
        <span className="text-xs font-semibold text-gray-400 shrink-0">Öffnen →</span>
      </Link>
      {cockpit && cockpit.party && cockpit.party.members.length > 1 && (
        <p className="text-xs text-gray-400">
          Gruppe: {cockpit.party.members.filter((m) => m.cardId !== hero?.id).map((m) => `${m.name}${m.here ? " (bei dir)" : ""}`).join(", ")}
        </p>
      )}
      {hero?.dndCreatedAt && <HubQuestLog />}
      {hero?.dndCreatedAt && <HubProgress />}
      {builder.allowed && (
        <Link href="/oma-quest/editor" className="moba-panel rounded-2xl p-4 hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-bold text-white">Eigene Location bauen</span>
            <span className="block text-xs text-gray-500">Karte, NPCs und Quest für die Community gestalten</span>
          </span>
          <span className="text-xs font-semibold text-gray-400 shrink-0">Editor →</span>
        </Link>
      )}
    </div>
  );

  const arenaPanel = (
    <div className="space-y-8">
      <TutorialProgressBanner step={tutorialStep} />

      <BattleLauncher eloOverall={eloOverall} eloDuels={eloDuels} eloGems={eloGems} />

      {hasChallenges && (
        <ChallengesList incoming={serialize(incoming)} outgoing={serialize(outgoing)} live={serialize(live)} />
      )}

      <div className="space-y-4">
        <h1 className="text-lg font-black text-white">Kampagne</h1>
        <CampaignMap />
      </div>

      {rankingBlock}
    </div>
  );

  const sammlungPanel = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-black text-white">Deine Karten</h1>
          <p className="text-xs text-gray-500 mt-0.5">Antippen, um die Skill-Details auf der Rückseite zu sehen.</p>
        </div>
        {ownedUserCards.some((uc) => uc.card.rarity === "COMMUNITY") && (
          <Link
            href="/battle-cards/my-card"
            className="moba-pill normal-case font-semibold px-3 py-2 hover:bg-white/[0.06] transition-colors shrink-0"
          >
            <MobaIcon name="profile" className="w-3.5 h-3.5" /> Meine Community-Karte
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Startaufstellung</h2>
        <LineupStrip cards={lineupCards} />
      </div>

      <div className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">OMA Duels — Deck</h2>
        <Link
          href="/battle-cards/duel-deck"
          className="flex items-center justify-between gap-3 moba-panel rounded-2xl p-3 hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-xs text-gray-300">
            {duelDeckCount === DUEL_DECK_TOTAL_SIZE ? (
              <span className="text-emerald-400 font-semibold">Deck vollständig ({duelDeckCount}/{DUEL_DECK_TOTAL_SIZE})</span>
            ) : (
              <span className="text-amber-400 font-semibold">
                Deck einrichten ({duelDeckCount}/{DUEL_DECK_TOTAL_SIZE})
              </span>
            )}
          </span>
          <span className="text-xs font-semibold text-gray-400">Bearbeiten →</span>
        </Link>
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

  const ladenPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-black text-white">Laden</h1>
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400 tabular-nums"><CoinIcon size={16} /> {coins} Münzen</span>
      </div>

      <PackOpener initialUnopenedCount={unopenedPacks} initialNextPackKind={nextPackKind} />

      {hero?.dndCreatedAt && <HubCoinShop />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <DailySpin
          alreadySpun={!!todaySpin}
          lastResult={todaySpin ? { prizeLabel: todaySpin.prizeLabel, prizeType: todaySpin.prizeType } : null}
          initialPoints={coins}
          prizes={shopConfig.wheelPrizes}
        />
        <BuyPack
          packPrices={shopConfig.packPrices}
          initialPoints={coins}
          dailyLimit={PACK_DAILY_PURCHASE_LIMIT}
          purchasedToday={purchasedToday}
        />
        <BuyDndReroll
          cost={shopConfig.dndRerollCost}
          points={coins}
          currentCredits={hero?.dndRerollCredits ?? 0}
          hasCharacter={!!hero?.dndCreatedAt}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BattleCardsLogo />
      <BattleCardsTabs
        heldPanel={heldPanel}
        weltPanel={weltPanel}
        arenaPanel={arenaPanel}
        sammlungPanel={sammlungPanel}
        ladenPanel={ladenPanel}
        arenaBadge={pendingChallenges}
        heldBadge={openPoints}
        ladenBadge={unopenedPacks}
      />
    </div>
  );
}

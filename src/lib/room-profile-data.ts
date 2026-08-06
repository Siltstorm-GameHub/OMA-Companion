import type { WanderpocalHolder, WanderpocalStat } from "@prisma/client";
import { prisma } from "./prisma";
import { getRankProgress, type RankEntry } from "./ranks";
import { computeBadges, type Badge } from "./badges";
import { parseFavoriteGames, type FavoriteGame } from "./favorite-games";
import { MAX_SHOWCASE } from "./collectibles";
import { QUEST_TYPE_META, type QuestType } from "./quests";
import { getAvailableReviewYears } from "./year-review";

/** Präfix, mit dem BadgesSection Custom-Badges im Showcase markiert. */
const CUSTOM_BADGE_PREFIX = "custom:";

/**
 * Datenlader des Gaming-Zimmers.
 *
 * BEWUSST eigenständig: die alte Profilseite (src/app/(dashboard)/profile) hat
 * ihre eigenen Abfragen und wird nicht angefasst, weil sie später ersatzlos
 * gelöscht wird. Geteilt werden nur reine Lib-Funktionen (getRank,
 * computeBadges, parseFavoriteGames) — kein Seiten-Code.
 *
 * Die Aufteilung Core/Details spiegelt die Bühne wider: Core ist alles, was
 * ohne Interaktion sichtbar ist, Details liegen hinter dem Röhrenmonitor. So
 * lassen sich die Details später ohne Umbau lazy nachladen.
 */

// ── Core ─────────────────────────────────────────────────────────────────────

export interface VitrineCollectible {
  id: string; name: string; imageUrl: string | null; rarity: string;
}
export interface VitrineBadge {
  key: string; icon: string; name: string;
}
export interface VitrineTrophy {
  scopeType: string; scopeValue: string;
}

export interface RoomProfileCore {
  id:              string;
  displayName:     string;
  image:           string | null;
  bio:             string | null;
  createdAt:       Date;
  points:          number;
  rankPoints:      number;
  /** "TT-MM" fürs ProfileEditor-Formular, oder null. Nur für den eigenen User relevant. */
  birthday:        string | null;
  twitchLogin:     string | null;
  bannerUrl:       string | null;
  /** Jahre, für die ein Jahresrückblick existiert (leer = noch kein voller Monat dabei). */
  reviewYears:     number[];
  rank:            RankEntry;
  nextRank:        RankEntry | null;
  rankPct:         number;
  leaderboardRank: number;
  totalUsers:      number;
  eventCount:       number;
  eventWins:        number;
  pollMasterCount:  number;
  collectiblesCount: number;
  badgeCount:        number;
  topGames:          string[];
  favoriteGames:     FavoriteGame[];
  vitrine: {
    collectibles: VitrineCollectible[];
    badges:       VitrineBadge[];
    trophies:     VitrineTrophy[];
  };
}

/** Liest das Showcase-JSON defensiv aus — kaputte Daten dürfen die Seite nie kippen. */
function parseIdList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Siege aus dem finalRankingJson eines beendeten Events ableiten. */
function isWinner(finalRankingJson: string | null, userId: string): boolean {
  try {
    const ranking = JSON.parse(finalRankingJson ?? "[]");
    return Array.isArray(ranking) && ranking[0] === userId;
  } catch {
    return false;
  }
}

function isPollWinner(completionData: string | null, userId: string): boolean {
  try {
    const ids: string[] = (completionData ? JSON.parse(completionData) : {}).pollWinnerIds ?? [];
    return Array.isArray(ids) && ids.includes(userId);
  } catch {
    return false;
  }
}

export async function loadRoomProfileCore(userId: string): Promise<RoomProfileCore | null> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, name: true, username: true, image: true, bio: true, createdAt: true,
      points: true, rankPoints: true, birthday: true, twitchLogin: true, bannerUrl: true,
      showcaseJson: true, showcaseBadgesJson: true, favoriteGamesJson: true,
    },
  });
  if (!user) return null;

  const now = new Date();
  const showcaseIds   = parseIdList(user.showcaseJson).slice(0, MAX_SHOWCASE);
  // Abzeichen-Showcase mischt System-Keys und Custom-Badges — letztere sind
  // mit "custom:" präfixiert (siehe BadgesSection.tsx).
  const showcaseBadge = parseIdList(user.showcaseBadgesJson).slice(0, 3);
  const customBadgeIds = showcaseBadge
    .filter(k => k.startsWith(CUSTOM_BADGE_PREFIX))
    .map(k => k.slice(CUSTOM_BADGE_PREFIX.length));

  const [
    eventCount, startedEvents, higherRanked, totalUsers,
    collectiblesCount, systemBadgeCount, customBadgeCount,
    showcaseItems, showcaseCustomBadges, trophies, lulPollWins,
  ] = await Promise.all([
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.event.findMany({
      where:  { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { game: true, finalRankingJson: true, completionData: true },
    }),
    prisma.user.count({ where: { rankPoints: { gt: user.rankPoints } } }),
    prisma.user.count(),
    prisma.userCollectible.count({ where: { userId } }),
    prisma.userSystemBadge.count({ where: { userId } }),
    prisma.userCustomBadge.count({ where: { userId } }),
    showcaseIds.length > 0
      ? prisma.userCollectible.findMany({
          where:   { userId, collectibleItemId: { in: showcaseIds } },
          include: { collectibleItem: { select: { id: true, name: true, imageUrl: true, rarity: true } } },
        })
      : [],
    customBadgeIds.length > 0
      ? prisma.userCustomBadge.findMany({
          where:   { userId, customBadgeId: { in: customBadgeIds } },
          include: { badge: { select: { id: true, icon: true, name: true } } },
        })
      : [],
    prisma.wanderpocalHolder.findMany({
      where:  { userId },
      select: { scopeType: true, scopeValue: true },
    }).catch(() => []),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }).catch(() => 0),
  ]);

  const eventWins       = startedEvents.filter(e => isWinner(e.finalRankingJson, userId)).length;
  const pollMasterCount = startedEvents.filter(e => isPollWinner(e.completionData, userId)).length + lulPollWins;

  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  const { rank, next, pct } = getRankProgress(user.rankPoints);

  // Vitrine: Reihenfolge des Showcase beibehalten, nicht die der DB-Abfrage.
  const itemById = new Map(showcaseItems.map(uc => [uc.collectibleItem.id, uc.collectibleItem]));
  const vitrineCollectibles: VitrineCollectible[] = showcaseIds
    .map(id => itemById.get(id))
    .filter((i): i is NonNullable<typeof i> => !!i);

  // Abzeichen im Showcase sind entweder System-Keys (Code) oder CustomBadge-IDs.
  const customById = new Map(showcaseCustomBadges.map(uc => [uc.badge.id, uc.badge]));
  const systemBadges = computeBadges(
    { points: user.points, voiceHours: 0, messageCount: 0, eventCount, tournamentCount: 0,
      tournamentWins: 0, eventWins, mvpCount: pollMasterCount },
    new Set<string>(),
  );
  const systemById = new Map(systemBadges.map(b => [b.id, b]));
  const vitrineBadges: VitrineBadge[] = showcaseBadge
    .map(key => {
      if (key.startsWith(CUSTOM_BADGE_PREFIX)) {
        const custom = customById.get(key.slice(CUSTOM_BADGE_PREFIX.length));
        return custom ? { key, icon: custom.icon, name: custom.name } : null;
      }
      const sys = systemById.get(key);
      return sys ? { key, icon: sys.icon, name: sys.name } : null;
    })
    .filter((b): b is VitrineBadge => !!b);

  return {
    id:              user.id,
    displayName:     user.username ?? user.name ?? "Unbekannt",
    image:           user.image,
    bio:             user.bio,
    createdAt:       user.createdAt,
    points:          user.points,
    rankPoints:      user.rankPoints,
    birthday: user.birthday
      ? `${String(user.birthday.getDate()).padStart(2, "0")}-${String(user.birthday.getMonth() + 1).padStart(2, "0")}`
      : null,
    twitchLogin: user.twitchLogin,
    bannerUrl:   user.bannerUrl,
    reviewYears: getAvailableReviewYears(user.createdAt),
    rank,
    nextRank:        next,
    rankPct:         pct,
    leaderboardRank: higherRanked + 1,
    totalUsers,
    eventCount,
    eventWins,
    pollMasterCount,
    collectiblesCount: collectiblesCount,
    badgeCount:        systemBadgeCount + customBadgeCount,
    topGames,
    favoriteGames:     parseFavoriteGames(user.favoriteGamesJson),
    vitrine: {
      collectibles: vitrineCollectibles,
      badges:       vitrineBadges,
      trophies,
    },
  };
}

// ── Details (hinter dem Röhrenmonitor) ───────────────────────────────────────

export interface RoomProfileDetails {
  voiceHours:   number;
  messageCount: number;
  coinsEarned:  number;
  coinsSpent:   number;
  events: {
    id: string; title: string; startAt: Date; game: string | null; placement: number | null;
  }[];
  tournaments: { id: string; title: string; wins: number; losses: number; finalRank: number | null; eliminated: boolean }[];
  /** Quest-Metadaten sind hier bereits aufgelöst, weil src/lib/quests.ts Prisma
   *  importiert und damit nicht in eine Client-Komponente gehört. */
  quests: {
    id: string; title: string; target: number; reward: number;
    current: number; completed: boolean; icon: string; bar: string;
  }[];
  collections: {
    id: string; name: string; coverImageUrl: string | null;
    items: { id: string; name: string; imageUrl: string | null; rarity: string }[];
  }[];
  /** Flache Liste für CollectiblesShowcase (erwartet collectionName je Item). */
  ownedCollectibles: { id: string; name: string; imageUrl: string | null; rarity: string; collectionName: string }[];
  showcaseCollectibles: { id: string; name: string; imageUrl: string | null; rarity: string }[];
  badges:       Badge[];
  customBadges: { id: string; icon: string; name: string; desc: string; category: string; earnedAt: string }[];
  showcaseBadgeKeys: string[];
  /** Volle Prisma-Zeilen, weil WanderpocalSection genau die erwartet. */
  trophies:     WanderpocalHolder[];
  trophyStats:  WanderpocalStat[];
  trophyRanks:  Record<string, number>;
}

export async function loadRoomProfileDetails(userId: string): Promise<RoomProfileDetails> {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [
    user, eventRegs, startedEvents, tournaments, quests, owned,
    systemBadgeKeys, customBadges, trophies, trophyStats,
    coinsEarnedAgg, coinsSpentAgg, eventCount, tournamentCount, lulPollWins, jobRow,
  ] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        points: true, voiceMinutesTotal: true, messagesTotal: true,
        showcaseBadgesJson: true, showcaseJson: true,
      },
    }),
    prisma.eventRegistration.findMany({
      where:   { userId },
      include: { event: { select: { id: true, title: true, startAt: true, game: true, finalRankingJson: true } } },
      orderBy: { joinedAt: "desc" }, take: 5,
    }),
    prisma.event.findMany({
      where:  { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { finalRankingJson: true, completionData: true },
    }),
    prisma.tournamentParticipant.findMany({
      where:   { userId },
      include: { event: { include: { matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } } } } },
      orderBy: { id: "desc" }, take: 10,
    }),
    prisma.quest.findMany({
      where:   { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userCollectible.findMany({
      where:   { userId },
      include: { collectibleItem: { include: { collection: { select: { id: true, name: true, coverImageUrl: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userSystemBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
    prisma.userCustomBadge.findMany({
      where:   { userId },
      include: { badge: { select: { id: true, icon: true, name: true, desc: true, category: true } } },
      orderBy: { earnedAt: "asc" },
    }),
    prisma.wanderpocalHolder.findMany({ where: { userId } }).catch(() => []),
    prisma.wanderpocalStat.findMany({ where: { userId } }).catch(() => []),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.tournamentParticipant.count({ where: { userId } }),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }).catch(() => 0),
    prisma.userJob.findUnique({ where: { userId }, select: { totalEarned: true } }).catch(() => null),
  ]);

  const voiceHours   = Math.floor((user?.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user?.messagesTotal ?? 0;
  const eventWins    = startedEvents.filter(e => isWinner(e.finalRankingJson, userId)).length;
  const pollMaster   = startedEvents.filter(e => isPollWinner(e.completionData, userId)).length + lulPollWins;

  const badges = computeBadges(
    { points: user?.points ?? 0, voiceHours, messageCount, eventCount, tournamentCount,
      tournamentWins: 0, eventWins, mvpCount: pollMaster,
      jobCoinsEarned: jobRow?.totalEarned ?? 0 },
    new Set(systemBadgeKeys.map(b => b.badgeKey)),
  );

  // Rang je Pokal-Scope: eine Abfrage pro Scope, aber parallel.
  const trophyRanks: Record<string, number> = {};
  await Promise.all(trophyStats.map(async stat => {
    const above = await prisma.wanderpocalStat.count({
      where: { scopeType: stat.scopeType, scopeValue: stat.scopeValue, winCount: { gt: stat.winCount } },
    });
    trophyRanks[`${stat.scopeType}:${stat.scopeValue}`] = above + 1;
  }));

  const collectionsMap = new Map<string, RoomProfileDetails["collections"][number]>();
  const ownedCollectibles: RoomProfileDetails["ownedCollectibles"] = [];
  for (const uc of owned) {
    const col  = uc.collectibleItem.collection;
    const item = {
      id:       uc.collectibleItem.id,
      name:     uc.collectibleItem.name,
      imageUrl: uc.collectibleItem.imageUrl,
      rarity:   uc.collectibleItem.rarity,
    };
    if (!collectionsMap.has(col.id)) {
      collectionsMap.set(col.id, { id: col.id, name: col.name, coverImageUrl: col.coverImageUrl, items: [] });
    }
    collectionsMap.get(col.id)!.items.push(item);
    ownedCollectibles.push({ ...item, collectionName: col.name });
  }

  const showcaseIds = parseIdList(user?.showcaseJson).slice(0, MAX_SHOWCASE);
  const showcaseCollectibles = showcaseIds
    .map(id => ownedCollectibles.find(o => o.id === id))
    .filter((i): i is NonNullable<typeof i> => !!i)
    .map(({ id, name, imageUrl, rarity }) => ({ id, name, imageUrl, rarity }));

  return {
    voiceHours,
    messageCount,
    coinsEarned: coinsEarnedAgg._sum.amount ?? 0,
    coinsSpent:  Math.abs(coinsSpentAgg._sum.amount ?? 0),
    events: eventRegs.map(reg => {
      let placement: number | null = null;
      try {
        const ranking: string[] = JSON.parse(reg.event.finalRankingJson ?? "[]");
        const idx = ranking.indexOf(userId);
        if (idx !== -1) placement = idx + 1;
      } catch { /* kaputtes JSON ignorieren */ }
      return {
        id: reg.event.id, title: reg.event.title, startAt: reg.event.startAt,
        game: reg.event.game, placement,
      };
    }),
    tournaments: tournaments.map(p => ({
      id:         p.event.id,
      title:      p.event.title,
      wins:       p.event.matches.filter(m => m.winnerId === userId).length,
      losses:     p.event.matches.filter(m => m.winnerId && m.winnerId !== userId).length,
      finalRank:  p.finalRank,
      eliminated: p.eliminated,
    })),
    quests: quests.map(q => {
      const meta = QUEST_TYPE_META[q.type as QuestType];
      return {
        id: q.id, title: q.title, target: q.target, reward: q.reward,
        current:   Math.min(q.progress[0]?.current ?? 0, q.target),
        completed: q.progress[0]?.completed ?? false,
        icon: meta?.icon ?? "📜",
        bar:  meta?.bar  ?? "from-teal-600 to-teal-400",
      };
    }),
    collections: [...collectionsMap.values()],
    ownedCollectibles,
    showcaseCollectibles,
    badges,
    customBadges: customBadges.map(uc => ({
      id: uc.badge.id, icon: uc.badge.icon, name: uc.badge.name,
      desc: uc.badge.desc, category: uc.badge.category,
      earnedAt: uc.earnedAt.toISOString(),
    })),
    showcaseBadgeKeys: parseIdList(user?.showcaseBadgesJson),
    trophies,
    trophyStats,
    trophyRanks,
  };
}

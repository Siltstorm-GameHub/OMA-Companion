import { prisma } from "./prisma";
import { getBerlinDateParts, formatBerlinDate } from "./time";
import { parseFavoriteGames, steamCoverUrl } from "./favorite-games";
import { IN_WHERE, favoriteMatchesGame } from "./games/service";
import { gameNameKey } from "./games/slug";
import { loadWanderpokalStatus } from "./wanderpokal-status";
import { getAvailableReviewYears } from "./year-review";
import { WANDERPOKAL_MODELS, WANDERPOKAL_MODEL_DEFAULT, eventPokalModelUrl } from "./trophy-models";
import { parseEquipped, resolveLook } from "./cosmetics/catalog";
import type { Trophy3DItem } from "@/components/Trophy3DViewer";
import type { WanderpocalHolderInfo } from "@/components/WanderpocalSection";

/**
 * Gemeinsamer Daten-Loader für die eigene Profilseite (/profile) und fremde Profile
 * (/profile/[id]) — beide zeigen dieselben Abschnitte, das eigene Profil nur zusätzlich
 * Bearbeiten, Profil-Vervollständigung, Jahresrückblick, Community-Jobs und Einstellungen.
 * Alle Abfragen laufen parallel in EINER Runde.
 */
export async function loadProfileData(userId: string) {
  const now = new Date();
  const { month, year } = getBerlinDateParts(now);

  const [
    user, eventRegs, eventCount, startedEvents, questsWithProgress, pokale,
    wanderpocalTrophies, wanderpocalStats, coinsEarnedAgg, coinsSpentAgg, lulPollWins, squadMemberships,
    totalUsers, wanderpokalStatusData, inReactions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, username: true, image: true, points: true, rankPoints: true, createdAt: true, deletedAt: true,
        favoriteGamesJson: true, birthday: true, bio: true, twitchLogin: true, voiceMinutesTotal: true, messagesTotal: true,
        reputationLevel: true, reputationPoints: true, reputationPeakLevel: true, equippedCosmeticsJson: true,
      },
    }),
    prisma.eventRegistration.findMany({
      where: { userId },
      include: { event: { select: { id: true, title: true, startAt: true, game: true, status: true, finalRankingJson: true } } },
      orderBy: { joinedAt: "desc" }, take: 6,
    }),
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.event.findMany({
      where: { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { game: true, finalRankingJson: true, completionData: true },
    }),
    prisma.quest.findMany({
      where: { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pokal.findMany({ where: { userId }, orderBy: { awardedAt: "desc" } }),
    prisma.wanderpocalHolder.findMany({ where: { userId } }),
    prisma.wanderpocalStat.findMany({ where: { userId } }),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }),
    prisma.squadMembership.findMany({
      where: { userId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: { role: true, squad: { select: { id: true, name: true, icon: true } } },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    // Für den 3D-Pokal-Viewer + "wer hält den Rest" — für den PROFILEIGENTÜMER.
    loadWanderpokalStatus(userId),
    // GameSwipe "Am Start" (öffentlich) — Bewertete zuerst, dann zuletzt entschieden
    prisma.gameReaction.findMany({
      where: { userId, ...IN_WHERE, game: { status: "APPROVED" } },
      orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      select: { game: { select: { id: true, slug: true, name: true, coverUrl: true, steamAppId: true, nameKey: true, aliases: true } } },
    }),
  ]);
  if (!user || user.deletedAt) return null;

  // Rang + Wanderpokal-Ränge brauchen die Werte von oben — zweite (kleine) Runde, ebenfalls parallel.
  const [higherRanked, wanderpocalRankEntries] = await Promise.all([
    prisma.user.count({ where: { rankPoints: { gt: user.rankPoints ?? 0 }, deletedAt: null } }),
    Promise.all(wanderpocalStats.map(async stat => {
      const above = await prisma.wanderpocalStat.count({
        where: { scopeType: stat.scopeType, scopeValue: stat.scopeValue, winCount: { gt: stat.winCount } },
      });
      return [`${stat.scopeType}:${stat.scopeValue}`, above + 1] as const;
    })),
  ]);

  const eventWins = startedEvents.filter(e => {
    try { const r = JSON.parse(e.finalRankingJson ?? "[]"); return Array.isArray(r) && r[0] === userId; }
    catch { return false; }
  }).length;
  const pollWinsFromEvents = startedEvents.filter(e => {
    try { const ids: string[] = (e.completionData ? JSON.parse(e.completionData) : {}).pollWinnerIds ?? []; return ids.includes(userId); }
    catch { return false; }
  }).length;
  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  const wanderpocalHolders: Record<string, WanderpocalHolderInfo> = {};
  for (const s of wanderpokalStatusData.wanderpokalStatus) {
    wanderpocalHolders[`${s.scopeType}:${s.scopeValue}`] = {
      holderUserId: s.holderUserId, holderName: s.holderName,
      holderAvatarUrl: s.holderAvatarUrl, holderRankPoints: s.holderRankPoints,
    };
  }
  const wanderpokalItems: Trophy3DItem[] = wanderpokalStatusData.wanderpokale.map(w => {
    const cfg = WANDERPOKAL_MODELS[w.scopeValue] ?? WANDERPOKAL_MODEL_DEFAULT;
    const holder = wanderpocalHolders[`${w.scopeType}:${w.scopeValue}`];
    return {
      id: `${w.scopeType}:${w.scopeValue}`, title: w.title, modelUrl: cfg.url,
      meta: `${w.winCount} ${w.winCount === 1 ? "Sieg" : "Siege"}`,
      holderUserId: holder?.holderUserId, holderName: holder?.holderName,
      holderAvatarUrl: holder?.holderAvatarUrl, holderRankPoints: holder?.holderRankPoints,
    };
  });
  const eventPokalItems: Trophy3DItem[] = pokale.map(p => ({
    id: p.id, title: p.title, modelUrl: eventPokalModelUrl(p.category),
    meta: formatBerlinDate(p.awardedAt, { day: "2-digit", month: "2-digit", year: "numeric" }),
  }));

  const favoriteGames = parseFavoriteGames(user.favoriteGamesJson);
  const inGames = inReactions.map(r => r.game);

  // "Zockt gerade" den Einträgen der Spieleliste zuordnen (Steam-ID oder Name/Alias) → Link + Cover.
  // Spiele, die (noch) nicht in der Liste stehen, bleiben mit Name und Steam-Cover sichtbar.
  const favCandidates = favoriteGames.length
    ? await prisma.game.findMany({
        where: {
          status: { not: "HIDDEN" },
          OR: [
            { steamAppId: { in: favoriteGames.map(g => g.appId).filter((x): x is number => x !== null) } },
            { nameKey: { in: favoriteGames.map(g => gameNameKey(g.name)) } },
            { aliases: { hasSome: favoriteGames.map(g => g.name) } },
          ],
        },
        select: { slug: true, name: true, coverUrl: true, steamAppId: true, nameKey: true, aliases: true },
      })
    : [];
  const currentGames: ProfileGameRef[] = favoriteGames.map(fav => {
    const g = favCandidates.find(c => favoriteMatchesGame(fav, c));
    return {
      name: g?.name ?? fav.name,
      slug: g?.slug ?? null,
      coverUrl: g?.coverUrl ?? (fav.appId ? steamCoverUrl(fav.appId) : null),
      appId: fav.appId,
    };
  });

  return {
    user,
    displayName: user.username ?? user.name ?? "Unbekannt",
    memberSince: formatBerlinDate(user.createdAt, { month: "long", year: "numeric" }),
    totalPoints: user.points,
    rankPoints: user.rankPoints ?? 0,
    leaderboardRank: higherRanked + 1,
    totalUsers,
    reputation: { level: user.reputationLevel, points: user.reputationPoints, peakLevel: user.reputationPeakLevel },
    // Kosmetik-Shop: Rahmen/Aura (Avatar), Hintergrund (Kopfkarte), Namensfarbe, Titel
    look: resolveLook(parseEquipped(user.equippedCosmeticsJson), user.reputationPeakLevel),
    eventRegs, eventCount, eventWins,
    pollMasterCount: pollWinsFromEvents + lulPollWins,
    topGames,
    questsWithProgress, pokale,
    wanderpocalTrophies, wanderpocalStats,
    wanderpocalRankMap: Object.fromEntries(wanderpocalRankEntries) as Record<string, number>,
    wanderpocalHolders, wanderpokalItems, eventPokalItems,
    voiceHours: Math.floor((user.voiceMinutesTotal ?? 0) / 60),
    messageCount: user.messagesTotal ?? 0,
    coinsEarned: coinsEarnedAgg._sum.amount ?? 0,
    coinsSpent: Math.abs(coinsSpentAgg._sum.amount ?? 0),
    squads: squadMemberships.map(m => ({ ...m.squad, role: m.role })),
    favoriteGames,
    /** "Zockt gerade" (max. 5, selbst gewählt), aufgelöst gegen die Spieleliste */
    currentGames,
    /** GameSwipe "Am Start" — öffentlich */
    inGames: inGames.map(g => ({ id: g.id, slug: g.slug, name: g.name, coverUrl: g.coverUrl, appId: g.steamAppId })),
    reviewYears: getAvailableReviewYears(user.createdAt),
    profileCompletionDone: {
      bio: !!user.bio, birthday: !!user.birthday, twitch: !!user.twitchLogin, favoriteGames: favoriteGames.length > 0,
    },
    editorBirthday: user.birthday
      ? (() => { const b = getBerlinDateParts(user.birthday); return `${String(b.day).padStart(2, "0")}-${String(b.month).padStart(2, "0")}`; })()
      : null,
  };
}

export type ProfileGameRef = { name: string; slug: string | null; coverUrl: string | null; appId: number | null };

/**
 * Was Betrachter und Profil-Inhaber verbindet (nur fremde Profile): gemeinsam gespielte Events und
 * Spiele, bei denen beide in GameSwipe "Am Start" sind.
 */
export async function loadProfileRelation(viewerId: string, userId: string, profileInGameIds: string[]) {
  const [sharedEvents, viewerIn] = await Promise.all([
    prisma.event.count({
      where: { AND: [
        { registrations: { some: { userId: viewerId, role: "player" } } },
        { registrations: { some: { userId, role: "player" } } },
      ] },
    }),
    profileInGameIds.length
      ? prisma.gameReaction.findMany({ where: { userId: viewerId, gameId: { in: profileInGameIds }, ...IN_WHERE }, select: { gameId: true } })
      : Promise.resolve([]),
  ]);
  return { sharedEvents, sharedInGameIds: viewerIn.map(r => r.gameId) };
}

export type ProfileRelation = Awaited<ReturnType<typeof loadProfileRelation>>;

export type ProfileData = NonNullable<Awaited<ReturnType<typeof loadProfileData>>>;

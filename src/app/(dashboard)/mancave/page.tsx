import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getRank, getNextRank, getRankFullLabel } from "@/lib/ranks";
import { computeBadges } from "@/lib/badges";
import { getMancaveConfig, mancaveVisibleFor } from "@/lib/mancave-config";
import { loadRoom } from "@/lib/room";
import { getRoomItem } from "@/lib/room-items";
import { parseFavoriteGames } from "@/lib/favorite-games";
import MancaveClient from "./MancaveClient";
import { renderZoneFor, MANCAVE_GADGET_CATEGORIES, type MancaveGadget, type MancaveData } from "./mancave-data";

export default async function MancavePage() {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  // Solange mancave_enabled aus ist, ist die Mancave admin-only — Nicht-Admins
  // landen unauffällig auf der ganz normalen Profilseite, ganz wie /zimmer.
  if (!mancaveVisibleFor(await getMancaveConfig(), me.role)) redirect("/profile");

  const userId = me.id;
  const now = new Date();

  const [
    user, eventCount, startedEvents, tournamentCount, pokale, leaderboardRank,
    userSystemBadges, userCustomBadges, lulPollWins, room,
  ] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true, createdAt: true, favoriteGamesJson: true, voiceMinutesTotal: true, messagesTotal: true },
    }),
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.event.findMany({
      where: { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { game: true, finalRankingJson: true, completionData: true },
    }),
    prisma.tournamentParticipant.count({ where: { userId } }),
    prisma.pokal.findMany({ where: { userId }, orderBy: { awardedAt: "desc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }).then(async (u) => {
      const higher = await prisma.user.count({ where: { rankPoints: { gt: u?.rankPoints ?? 0 } } });
      return higher + 1;
    }),
    prisma.userSystemBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
    prisma.userCustomBadge.findMany({
      where: { userId },
      include: { badge: { select: { id: true, icon: true, name: true, desc: true } } },
      orderBy: { earnedAt: "asc" },
    }),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }),
    loadRoom(userId),
  ]);

  if (!user) redirect("/login");

  const eventWins = startedEvents.filter(e => {
    try { const r = JSON.parse(e.finalRankingJson ?? "[]"); return Array.isArray(r) && r[0] === userId; }
    catch { return false; }
  }).length;
  const pollWinsFromEvents = startedEvents.filter(e => {
    try { const ids: string[] = (e.completionData ? JSON.parse(e.completionData) : {}).pollWinnerIds ?? []; return ids.includes(userId); }
    catch { return false; }
  }).length;
  const pollMasterCount = pollWinsFromEvents + lulPollWins;
  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const favoriteGames = parseFavoriteGames(user.favoriteGamesJson).map(g => g.name);

  const rankPoints  = user.rankPoints;
  const currentRank = getRank(rankPoints);
  const nextRank    = getNextRank(rankPoints);
  const rankPct     = nextRank
    ? Math.min(100, Math.round(((rankPoints - currentRank.min) / (nextRank.min - currentRank.min)) * 100))
    : 100;

  const voiceHours   = Math.floor((user.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user.messagesTotal ?? 0;
  const earnedSystemKeys = new Set(userSystemBadges.map(b => b.badgeKey));
  const badges = computeBadges(
    { points: user.points, voiceHours, messageCount, eventCount, tournamentCount, tournamentWins: 0, eventWins, mvpCount: pollMasterCount },
    earnedSystemKeys,
  ).filter(b => b.earned);

  const totalUsers  = await prisma.user.count();
  const memberSince = new Date(user.createdAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  // Gadgets: nur die aufgestellten Zimmer-Items, die sinnvoll am Schreibtisch
  // stehen (siehe MANCAVE_GADGET_CATEGORIES) — Tapeten, Böden, Poster & Co.
  // bleiben draußen.
  const gadgets: MancaveGadget[] = room.placed
    .map(p => getRoomItem(p.key))
    .filter((def): def is NonNullable<typeof def> => !!def && MANCAVE_GADGET_CATEGORIES.includes(def.category))
    .map(def => ({
      key: def.key, label: def.label, description: def.description,
      imageUrl: def.imageUrl, accent: def.accent, category: def.category, zone: renderZoneFor(def.category),
      w: def.w, h: def.h, screenRect: def.screenRect, price: def.price,
    }));

  const data: MancaveData = {
    displayName:     user.username ?? user.name ?? "Unbekannt",
    avatarUrl:       user.image,
    rankPoints,
    totalPoints:     user.points,
    rankLabel:       getRankFullLabel(currentRank),
    rankColor:       currentRank.color,
    rankPct,
    nextRankLabel:   nextRank ? getRankFullLabel(nextRank) : null,
    leaderboardRank,
    totalUsers,
    memberSince,
    eventCount,
    eventWins,
    pollMasterCount,
    pokaleCount:     pokale.length,
    voiceHours,
    messageCount,
    topGames: topGames.length > 0 ? topGames : favoriteGames,
    badges: [
      ...badges.map(b => ({ key: b.id, icon: b.icon, name: b.name, desc: b.desc })),
      ...userCustomBadges.map(uc => ({ key: uc.badge.id, icon: uc.badge.icon, name: uc.badge.name, desc: uc.badge.desc })),
    ],
    pokale: pokale.map(p => ({ id: p.id, title: p.title, isSeries: p.isSeries, awardedAt: p.awardedAt.toISOString() })),
    gadgets,
  };

  return <MancaveClient data={data} />;
}

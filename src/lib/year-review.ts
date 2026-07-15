import { prisma } from "./prisma";
import { getRank, type RankEntry } from "./ranks";
import { getBadgeDef } from "./badges";

/** Abgeschlossene Jahre, für die ein Rückblick sinnvoll ist (Beitrittsjahr bis letztes volles Jahr). */
export function getAvailableReviewYears(memberSince: Date): number[] {
  const currentYear = new Date().getFullYear();
  const startYear   = memberSince.getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 1; y >= startYear; y--) years.push(y);
  return years;
}

export type YearReview = {
  year: number;

  coinsEarned: number;
  coinsSpent: number;

  rankPointsEarned: number;
  rankStart: RankEntry;
  rankEnd:   RankEntry;
  rankedUp:  boolean;

  eventsAttended: number;
  eventWins:      number;
  topGames:       string[];

  tournamentsPlayed: number;
  tournamentWins:    number;

  voiceHoursEstimate: number;
  messagesEstimate:   number;

  newBadges: { icon: string; name: string }[];

  newCollectibles: { id: string; name: string; imageUrl: string | null; rarity: string }[];
  rarestCollectible: { name: string; imageUrl: string | null; rarity: string } | null;

  lul: { spieltage: number; points: number; wins: number } | null;
  duels: { played: number; won: number } | null;
  predictions: { total: number; correct: number } | null;
  donationsTotal: number;

  biggestWin: { amount: number; reason: string } | null;
  busiestMonth: { month: number; count: number } | null;
};

const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export async function buildYearReview(userId: string, year: number): Promise<YearReview> {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd   = new Date(Date.UTC(year + 1, 0, 1));

  const [
    coinsEarnedAgg, coinsSpentAgg,
    rankPointsBeforeAgg, rankPointsThroughAgg,
    biggestWin, txInYear,
    eventRegs, tournamentParts,
    lulEntries, duelsRaw, predictionRows,
    donationsAgg, systemBadges, customBadges, collectiblesAcquired,
  ] = await Promise.all([
    prisma.pointTransaction.aggregate({
      where: { userId, amount: { gt: 0 }, reason: { startsWith: "[Münzen]" }, createdAt: { gte: yearStart, lt: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId, amount: { lt: 0 }, createdAt: { gte: yearStart, lt: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId, reason: { startsWith: "[Rang-Punkte]" }, createdAt: { lt: yearStart } },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId, reason: { startsWith: "[Rang-Punkte]" }, createdAt: { lt: yearEnd } },
      _sum: { amount: true },
    }),
    prisma.pointTransaction.findFirst({
      where:   { userId, amount: { gt: 0 }, reason: { startsWith: "[Münzen]" }, createdAt: { gte: yearStart, lt: yearEnd } },
      orderBy: { amount: "desc" },
    }),
    prisma.pointTransaction.findMany({
      where:  { userId, reason: { startsWith: "[Münzen]" }, createdAt: { gte: yearStart, lt: yearEnd } },
      select: { amount: true, reason: true, createdAt: true },
    }),
    prisma.eventRegistration.findMany({
      where:   { userId, event: { startAt: { gte: yearStart, lt: yearEnd } } },
      select:  { event: { select: { game: true, finalRankingJson: true } } },
    }),
    prisma.tournamentParticipant.findMany({
      where:  { userId, event: { startAt: { gte: yearStart, lt: yearEnd } } },
      select: { finalRank: true },
    }),
    prisma.lulEntry.findMany({
      where:  { userId, spieltag: { scheduledAt: { gte: yearStart, lt: yearEnd } } },
      select: { lulPoints: true, gameWinner: true },
    }),
    prisma.duelChallenge.findMany({
      where:  { OR: [{ challengerId: userId }, { opponentId: userId }], status: "resolved", resolvedAt: { gte: yearStart, lt: yearEnd } },
      select: { winnerId: true },
    }),
    prisma.eventWinnerPrediction.findMany({
      where:  { userId, resolved: true, createdAt: { gte: yearStart, lt: yearEnd } },
      select: { correct: true },
    }),
    prisma.donation.aggregate({
      where: { userId, year },
      _sum:  { amount: true },
    }),
    prisma.userSystemBadge.findMany({
      where:  { userId, earnedAt: { gte: yearStart, lt: yearEnd } },
      select: { badgeKey: true },
    }),
    prisma.userCustomBadge.findMany({
      where:   { userId, earnedAt: { gte: yearStart, lt: yearEnd } },
      include: { badge: { select: { icon: true, name: true } } },
    }),
    prisma.userCollectible.findMany({
      where:   { userId, createdAt: { gte: yearStart, lt: yearEnd } },
      include: { collectibleItem: { select: { id: true, name: true, imageUrl: true, rarity: true } } },
    }),
  ]);

  const coinsEarned = coinsEarnedAgg._sum.amount ?? 0;
  const coinsSpent  = Math.abs(coinsSpentAgg._sum.amount ?? 0);

  const rankPointsBefore = rankPointsBeforeAgg._sum.amount ?? 0;
  const rankPointsThrough = rankPointsThroughAgg._sum.amount ?? 0;
  const rankStart = getRank(rankPointsBefore);
  const rankEnd   = getRank(rankPointsThrough);

  const eventWins = eventRegs.filter(r => {
    try {
      const ranking = JSON.parse(r.event.finalRankingJson ?? "[]");
      return Array.isArray(ranking) && ranking[0] === userId;
    } catch { return false; }
  }).length;
  const gameCounts: Record<string, number> = {};
  for (const r of eventRegs) if (r.event.game) gameCounts[r.event.game] = (gameCounts[r.event.game] ?? 0) + 1;
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);

  const tournamentWins = tournamentParts.filter(p => p.finalRank === 1).length;

  const voiceHoursEstimate = txInYear.filter(t => t.reason.includes("Sprachkanal")).length;
  const messagesEstimate   = txInYear.filter(t => t.reason.includes("Nachrichten gesendet")).length * 10;

  const monthCounts: Record<number, number> = {};
  for (const t of txInYear) {
    const m = t.createdAt.getUTCMonth() + 1;
    monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  }
  const busiestEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0];
  const busiestMonth = busiestEntry ? { month: Number(busiestEntry[0]), count: busiestEntry[1] } : null;

  const newBadges = [
    ...systemBadges.map(b => getBadgeDef(b.badgeKey)).filter((b): b is NonNullable<typeof b> => !!b)
      .map(b => ({ icon: b.icon, name: b.name })),
    ...customBadges.map(c => ({ icon: c.badge.icon, name: c.badge.name })),
  ];

  const newCollectibles = collectiblesAcquired.map(uc => ({
    id:       uc.collectibleItem.id,
    name:     uc.collectibleItem.name,
    imageUrl: uc.collectibleItem.imageUrl,
    rarity:   uc.collectibleItem.rarity,
  }));
  const rarestCollectible = newCollectibles.length > 0
    ? [...newCollectibles].sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0))[0]
    : null;

  const lul = lulEntries.length > 0 ? {
    spieltage: lulEntries.length,
    points:    lulEntries.reduce((s, e) => s + e.lulPoints, 0),
    wins:      lulEntries.filter(e => e.gameWinner).length,
  } : null;

  const duels = duelsRaw.length > 0 ? {
    played: duelsRaw.length,
    won:    duelsRaw.filter(d => d.winnerId === userId).length,
  } : null;

  const predictions = predictionRows.length > 0 ? {
    total:   predictionRows.length,
    correct: predictionRows.filter(p => p.correct).length,
  } : null;

  return {
    year,
    coinsEarned,
    coinsSpent,
    rankPointsEarned: rankPointsThrough - rankPointsBefore,
    rankStart,
    rankEnd,
    rankedUp: rankEnd.min > rankStart.min,
    eventsAttended: eventRegs.length,
    eventWins,
    topGames,
    tournamentsPlayed: tournamentParts.length,
    tournamentWins,
    voiceHoursEstimate,
    messagesEstimate,
    newBadges,
    newCollectibles,
    rarestCollectible,
    lul,
    duels,
    predictions,
    donationsTotal: donationsAgg._sum.amount ?? 0,
    biggestWin: biggestWin
      ? { amount: biggestWin.amount, reason: biggestWin.reason.replace(/^\[Münzen\]\s*/, "").replace(/\s*🎂×2$/, "") }
      : null,
    busiestMonth,
  };
}

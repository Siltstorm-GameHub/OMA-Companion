// ============================================
// Echte OMA-Aktivitätsdaten → MemberSeasonInput
// ============================================
// Aggregiert die tatsächlichen Community-Daten für alle Discord-verknüpften
// Mitglieder. Aktuell kumulativ über die gesamte Historie (keine
// Saison-Fenster/Reset-Punkte) — siehe runFullSeasonUpdate()-Kommentar für
// die Einschränkung, die das für spätere Saisons bedeutet.

import { prisma } from "@/lib/prisma";
import type { MemberSeasonInput } from "./season-engine";

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const id = row[key] as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function buildSeasonInputs(): Promise<MemberSeasonInput[]> {
  const members = await prisma.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true, discordId: true },
  });
  if (members.length === 0) return [];
  const userIds = members.map((m) => m.id);
  const discordIds = members.map((m) => m.discordId!);

  const [
    eventCounts,
    questCounts,
    eventWinCounts,
    matchScoreSums,
    dailyPollVotes,
    eventPollVotes,
    donationSums,
    lobbyMessages,
    existingCards,
  ] = await Promise.all([
    prisma.eventRegistration.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, attended: true },
      _count: { _all: true },
    }),
    prisma.userQuestProgress.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, completed: true },
      _count: { _all: true },
    }),
    prisma.tournamentParticipant.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, finalRank: 1 },
      _count: { _all: true },
    }),
    prisma.matchEntry.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { score: true },
    }),
    prisma.dailyPollVote.findMany({ where: { userId: { in: userIds } }, select: { userId: true } }),
    prisma.eventPollVote.findMany({ where: { voterId: { in: userIds } }, select: { voterId: true } }),
    prisma.donation.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { amount: true },
    }),
    prisma.lobbyMessage.findMany({ where: { userId: { in: userIds } }, select: { userId: true } }),
    prisma.card.findMany({
      where: { linkedDiscordId: { in: discordIds } },
      select: { linkedDiscordId: true, class: true, activityTier: true },
    }),
  ]);

  const eventCountMap = new Map(eventCounts.map((r) => [r.userId, r._count._all]));
  const questCountMap = new Map(questCounts.map((r) => [r.userId, r._count._all]));
  const eventWinMap = new Map(eventWinCounts.map((r) => [r.userId, r._count._all]));
  const matchScoreMap = new Map(matchScoreSums.map((r) => [r.userId, r._sum.score ?? 0]));
  const dailyPollMap = countBy(dailyPollVotes, "userId");
  const eventPollMap = countBy(eventPollVotes, "voterId");
  const donationMap = new Map(donationSums.map((r) => [r.userId, r._sum.amount ?? 0]));
  const lobbyMap = countBy(lobbyMessages, "userId");
  const cardByDiscordId = new Map(existingCards.map((c) => [c.linkedDiscordId!, c]));

  return members.map((m) => {
    const existingCard = cardByDiscordId.get(m.discordId!);
    return {
      userId: m.id,
      discordId: m.discordId!,
      currentClass: existingCard?.class ?? null,
      currentTier: existingCard?.activityTier ?? null,
      eventCount: eventCountMap.get(m.id) ?? 0,
      questCount: questCountMap.get(m.id) ?? 0,
      eventWins: eventWinMap.get(m.id) ?? 0,
      eventStatsScore: matchScoreMap.get(m.id) ?? 0,
      surveyParticipations: (dailyPollMap.get(m.id) ?? 0) + (eventPollMap.get(m.id) ?? 0),
      donationAmount: donationMap.get(m.id) ?? 0,
      lobbyActivityScore: lobbyMap.get(m.id) ?? 0,
    };
  });
}

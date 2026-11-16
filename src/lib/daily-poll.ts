// Community-Umfragen (Modell DailyPoll): Laden + Aufbereiten für die Anzeige.
// Gemeinsam genutzt von der Startseite (serverseitig), der Event-Seite, /api/daily-poll/active
// und der Abstimm-Route (die nach einer Stimme direkt die aktualisierte Umfrage zurückgibt).
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type PollGameSuggestion = { name: string; appId: number | null };

export type DailyPollView = {
  id: string;
  title: string;
  question: string;
  endDate: string;
  allowMultiple: boolean;
  allowFreeText: boolean;
  freeTextGameMode: boolean;
  rewardCoins: number;
  ended: boolean;
  /** Verknüpftes Event (Umfrage erscheint dann auch auf dessen Seite) */
  event: { id: string; title: string } | null;
  options: { id: string; label: string; gameName: string | null; steamAppId: number | null }[];
  hasVoted: boolean;
  myOptionIds: string[];
  myFreeText: string | null;
  myFreeTextGames: PollGameSuggestion[];
  /** Erst nach eigener Abstimmung (oder nach Ende) sichtbar */
  results: {
    optionCounts: Record<string, number>;
    totalVotes: number;
    freeTextAnswers: string[];
    gameSuggestions: (PollGameSuggestion & { count: number })[];
  } | null;
};

/** Beendete Umfragen bleiben so lange mit Endergebnis sichtbar. */
const RESULT_GRACE_MS = 3 * 24 * 3600_000;

const POLL_INCLUDE = {
  options: { orderBy: { order: "asc" } },
  votes: true,
  event: { select: { id: true, title: true } },
} satisfies Prisma.DailyPollInclude;

type PollRow = Prisma.DailyPollGetPayload<{ include: typeof POLL_INCLUDE }>;

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function toPollView(poll: PollRow, userId: string | null | undefined, now = new Date()): DailyPollView {
  const myVote = userId ? poll.votes.find(v => v.userId === userId) ?? null : null;
  const ended = poll.endDate.getTime() < now.getTime();

  const optionCounts: Record<string, number> = {};
  for (const o of poll.options) optionCounts[o.id] = 0;
  const freeTextAnswers: string[] = [];
  const gameCounts = new Map<string, PollGameSuggestion & { count: number }>();

  for (const v of poll.votes) {
    for (const id of parseJson<string[]>(v.optionIds, [])) if (id in optionCounts) optionCounts[id]++;
    if (v.freeText?.trim()) freeTextAnswers.push(v.freeText.trim());
    for (const g of parseJson<PollGameSuggestion[]>(v.freeTextGames, [])) {
      const key = g.appId ? `id:${g.appId}` : `name:${g.name.toLowerCase()}`;
      const existing = gameCounts.get(key);
      if (existing) existing.count++;
      else gameCounts.set(key, { name: g.name, appId: g.appId, count: 1 });
    }
  }

  return {
    id: poll.id,
    title: poll.title,
    question: poll.question,
    endDate: poll.endDate.toISOString(),
    allowMultiple: poll.allowMultiple,
    allowFreeText: poll.allowFreeText,
    freeTextGameMode: poll.freeTextGameMode,
    rewardCoins: poll.rewardCoins,
    ended,
    event: poll.event,
    options: poll.options.map(o => ({ id: o.id, label: o.label, gameName: o.gameName, steamAppId: o.steamAppId })),
    hasVoted: !!myVote,
    myOptionIds: parseJson<string[]>(myVote?.optionIds, []),
    myFreeText: myVote?.freeText ?? null,
    myFreeTextGames: parseJson<PollGameSuggestion[]>(myVote?.freeTextGames, []),
    results: (myVote || ended)
      ? {
          optionCounts,
          totalVotes: poll.votes.length,
          freeTextAnswers,
          gameSuggestions: [...gameCounts.values()].sort((a, b) => b.count - a.count),
        }
      : null,
  };
}

/** Laufende (und kürzlich beendete) Umfragen — optional nur die eines Events. */
export async function loadDailyPolls(
  { userId, eventId }: { userId?: string | null; eventId?: string } = {},
): Promise<DailyPollView[]> {
  const now = new Date();
  const polls = await prisma.dailyPoll.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: new Date(now.getTime() - RESULT_GRACE_MS) },
      ...(eventId ? { eventId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: POLL_INCLUDE,
  });
  return polls.map(p => toPollView(p, userId, now));
}

/** Eine Umfrage frisch aufbereitet (nach Abstimmen/Zurückziehen). */
export async function loadDailyPoll(pollId: string, userId: string): Promise<DailyPollView | null> {
  const poll = await prisma.dailyPoll.findUnique({ where: { id: pollId }, include: POLL_INCLUDE });
  return poll ? toPollView(poll, userId) : null;
}

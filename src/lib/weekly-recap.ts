/**
 * Wochenrückblick auf der Übersicht (montags und dienstags): Events, Münzen, Rang-Punkte und Beiträge der
 * zurückliegenden Woche (Mo–So). Nur Server. Ausblenden per Cookie RECAP_HIDE_COOKIE (= Montag der Woche).
 */

import { prisma } from "./prisma";
import { getWeekBounds } from "./community-job-service";
import type { WeeklyRecapData } from "@/app/(app)/(dashboard)/dashboard/WeeklyRecap";

export const RECAP_HIDE_COOKIE = "home_recap_hidden";

const MONTHS_SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

/** Wochentag in Berlin: 1 = Montag … 7 = Sonntag */
function berlinWeekday(now: Date): number {
  const d = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Berlin" }).format(now);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(d) + 1;
}

export async function loadWeeklyRecap(userId: string | undefined, now: Date, hiddenWeek: string | null | undefined): Promise<WeeklyRecapData | null> {
  if (!userId) return null;
  const weekday = berlinWeekday(now);
  if (weekday !== 1 && weekday !== 2) return null;

  const { weekStart } = getWeekBounds(now);
  const start = new Date(weekStart.getTime() - 7 * 86_400_000);
  const end = weekStart;
  const weekKey = start.toISOString().slice(0, 10);
  if (hiddenWeek === weekKey) return null;

  const range = { gte: start, lt: end };
  const [events, coins, rankPoints, reports, ideas, proposals] = await Promise.all([
    prisma.eventRegistration.count({ where: { userId, role: "player", event: { startAt: range, hidden: false } } }),
    prisma.pointTransaction.aggregate({
      where: { userId, createdAt: range, amount: { gt: 0 }, NOT: { reason: { startsWith: "[Rang-Punkte]" } } }, _sum: { amount: true },
    }),
    prisma.pointTransaction.aggregate({
      where: { userId, createdAt: range, amount: { gt: 0 }, reason: { startsWith: "[Rang-Punkte]" } }, _sum: { amount: true },
    }),
    prisma.jobReport.count({ where: { authorId: userId, isDraft: false, publishedAt: range } }),
    prisma.communityIdea.count({ where: { authorId: userId, createdAt: range } }),
    prisma.eventProposal.count({ where: { authorId: userId, createdAt: range } }),
  ]);
  const data: WeeklyRecapData = {
    weekKey,
    label: (() => {
      const last = new Date(end.getTime() - 86_400_000);
      return start.getUTCMonth() === last.getUTCMonth()
        ? `${start.getUTCDate()}.–${last.getUTCDate()}. ${MONTHS_SHORT[last.getUTCMonth()]}`
        : `${start.getUTCDate()}. ${MONTHS_SHORT[start.getUTCMonth()]} – ${last.getUTCDate()}. ${MONTHS_SHORT[last.getUTCMonth()]}`;
    })(),
    events,
    coins: Math.round(coins._sum.amount ?? 0),
    rankPoints: Math.round(rankPoints._sum.amount ?? 0),
    posts: reports + ideas + proposals,
  };
  // Nichts gemacht → kein Rückblick
  return data.events + data.coins + data.rankPoints + data.posts > 0 ? data : null;
}

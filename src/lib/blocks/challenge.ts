// ============================================
// OMA Blocks — Community-Challenge (Event mit gemeinsamem Ziel)
// ============================================
// Ein Event mit game "OMA Blocks" und BlocksChallenge: Alle gewerteten Solo-Läufe (BlocksRun, vom Server
// nachgespielt) zwischen Event-Start und -Ende zählen auf ein gemeinsames Ziel — Linien oder Punkte.
// Nach dem Ende wird abgerechnet (Cron cron/blocks-season bzw. beim nächsten Aufruf): Ist das Ziel
// erreicht, bekommt jeder mit mindestens `minContribution` die Belohnung. Idempotent über finalizedAt.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { COIN_PREFIX, RANK_PREFIX } from "@/lib/points";

export type ChallengeMetric = "lines" | "score";

export const METRIC_LABEL: Record<ChallengeMetric, string> = { lines: "Linien", score: "Punkte" };

export function parseMetric(v: unknown): ChallengeMetric {
  return v === "score" ? "score" : "lines";
}

export interface ChallengeContributor {
  userId: string;
  name: string;
  image: string | null;
  value: number;
}

export interface ChallengeProgress {
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  status: "upcoming" | "running" | "ended";
  metric: ChallengeMetric;
  goal: number;
  minContribution: number;
  rewardCoins: number;
  rewardRankPoints: number;
  total: number;
  contributors: number;
  top: ChallengeContributor[];
  mine: number;
  succeeded: boolean | null;
}

async function contributions(metric: ChallengeMetric, from: Date, to: Date) {
  const rows = await prisma.blocksRun.groupBy({
    by: ["userId"],
    where: { finishedAt: { gte: from, lte: to }, score: { not: null } },
    _sum: { lines: true, score: true },
  });
  return rows
    .map((r) => ({ userId: r.userId, value: (metric === "score" ? r._sum.score : r._sum.lines) ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

const challengeSelect = {
  id: true,
  title: true,
  startAt: true,
  endAt: true,
  blocksChallenge: true,
} as const;

type ChallengeEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

function loadEvent(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, select: challengeSelect });
}

async function buildProgress(event: ChallengeEvent, viewerId: string | null, topCount: number): Promise<ChallengeProgress | null> {
  const c = event.blocksChallenge;
  if (!c || !event.endAt) return null;
  const now = new Date();
  const metric = parseMetric(c.metric);
  const status = now < event.startAt ? "upcoming" : now > event.endAt ? "ended" : "running";
  const list = status === "upcoming" ? [] : await contributions(metric, event.startAt, now < event.endAt ? now : event.endAt);
  const total = list.reduce((s, r) => s + r.value, 0);
  const topRows = list.slice(0, topCount);
  const users = await prisma.user.findMany({
    where: { id: { in: topRows.map((r) => r.userId) } },
    select: { id: true, username: true, name: true, image: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    eventId: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    status,
    metric,
    goal: c.goal,
    minContribution: c.minContribution,
    rewardCoins: c.rewardCoins,
    rewardRankPoints: c.rewardRankPoints,
    total,
    contributors: list.length,
    top: topRows.map((r) => {
      const u = byId.get(r.userId);
      return { userId: r.userId, name: u?.username ?? u?.name ?? "Spieler", image: u?.image ?? null, value: r.value };
    }),
    mine: viewerId ? list.find((r) => r.userId === viewerId)?.value ?? 0 : 0,
    succeeded: c.succeeded,
  };
}

/** Fortschritt einer Challenge (null, wenn das Event keine Challenge ist). */
export async function getChallengeProgress(eventId: string, viewerId: string | null, topCount = 10): Promise<ChallengeProgress | null> {
  await finalizeDueBlocksChallenges();
  const event = await loadEvent(eventId);
  return event ? buildProgress(event, viewerId, topCount) : null;
}

/** Laufende und in den nächsten 7 Tagen startende Challenges (für den Blocks-Bereich im Games-Hub). */
export async function getActiveChallenges(viewerId: string): Promise<ChallengeProgress[]> {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      hidden: false,
      blocksChallenge: { isNot: null },
      endAt: { gte: now },
      startAt: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { startAt: "asc" },
    take: 3,
    select: challengeSelect,
  });
  const list = await Promise.all(events.map((e) => buildProgress(e, viewerId, 3)));
  return list.filter((p): p is ChallengeProgress => !!p);
}

/** Rechnet alle abgelaufenen, noch offenen Challenges ab. Idempotent über finalizedAt. */
export async function finalizeDueBlocksChallenges(now: Date = new Date()): Promise<{ finalized: string[] }> {
  const due = await prisma.blocksChallenge.findMany({
    where: { finalizedAt: null, event: { endAt: { lte: now } } },
    include: { event: { select: { id: true, title: true, startAt: true, endAt: true } } },
  });
  const finalized: string[] = [];
  for (const c of due) {
    const { event } = c;
    if (!event.endAt) continue;
    const metric = parseMetric(c.metric);
    const list = await contributions(metric, event.startAt, event.endAt);
    const total = list.reduce((s, r) => s + r.value, 0);
    const succeeded = total >= c.goal;
    // Erst beanspruchen, dann auszahlen — so zahlt ein paralleler Aufruf nie doppelt.
    const claim = await prisma.blocksChallenge.updateMany({
      where: { id: c.id, finalizedAt: null },
      data: { finalizedAt: now, succeeded },
    });
    if (claim.count !== 1) continue;
    finalized.push(c.id);

    const qualified = list.filter((r) => r.value >= Math.max(1, c.minContribution));
    const unit = METRIC_LABEL[metric];
    for (const r of qualified) {
      if (succeeded) await payReward(r.userId, c.rewardCoins, c.rewardRankPoints, `OMA Blocks Challenge: ${event.title}`);
      await createNotification(r.userId, {
        type: "badge",
        title: succeeded ? `Challenge geschafft: ${event.title}` : `Challenge knapp verfehlt: ${event.title}`,
        body: succeeded
          ? `Die Community hat ${total.toLocaleString("de-DE")} ${unit} geschafft — dein Beitrag: ${r.value.toLocaleString("de-DE")}.` +
            (c.rewardCoins || c.rewardRankPoints ? ` Deine Belohnung: ${rewardText(c.rewardCoins, c.rewardRankPoints)}.` : "")
          : `${total.toLocaleString("de-DE")} von ${c.goal.toLocaleString("de-DE")} ${unit} — danke für deine ${r.value.toLocaleString("de-DE")}!`,
        url: `/tournament/${event.id}`,
      });
    }
    await prisma.event.update({ where: { id: event.id }, data: { status: "finished" } });
  }
  return { finalized };
}

export function rewardText(coins: number, rankPoints: number): string {
  return [coins > 0 ? `${coins.toLocaleString("de-DE")} Münzen` : "", rankPoints > 0 ? `${rankPoints} Rang-Punkte` : ""]
    .filter(Boolean)
    .join(" + ");
}

async function payReward(userId: string, coins: number, rankPoints: number, reason: string): Promise<void> {
  if (coins <= 0 && rankPoints <= 0) return;
  await prisma.$transaction([
    ...(coins > 0 ? [prisma.pointTransaction.create({ data: { userId, amount: coins, reason: `${COIN_PREFIX} ${reason}` } })] : []),
    ...(rankPoints > 0 ? [prisma.pointTransaction.create({ data: { userId, amount: rankPoints, reason: `${RANK_PREFIX} ${reason}` } })] : []),
    prisma.user.update({
      where: { id: userId },
      data: {
        ...(coins > 0 && { points: { increment: coins } }),
        ...(rankPoints > 0 && { rankPoints: { increment: rankPoints } }),
      },
    }),
  ]);
}

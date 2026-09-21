import { prisma } from "./prisma";
import { getEffectiveCommunityJobs } from "./community-job-config";
import { computeWeeklyPayout, getWeekBounds } from "./community-job-service";
import { getCommunityJob } from "./community-jobs";

/**
 * Admin-Übersichten der Community-Jobs: Auszahlungen (mit Vorschau und Cron-Verlauf), Auffälligkeiten bei
 * Bewertungen (nur Hinweise, keine automatischen Strafen) und die Gesundheit je Job.
 */

const DAY = 86_400_000;
const displayName = (u: { username: string | null; name: string | null } | undefined, fallback = "?") => u?.username ?? u?.name ?? fallback;

// ── Auszahlungen ─────────────────────────────────────────────────────────────

export async function getPayoutOverview(weeks = 8) {
  const since = new Date(Date.now() - weeks * 7 * DAY);
  const rows = await prisma.communityJobWeeklyPayout.findMany({
    where: { weekStart: { gte: since } }, orderBy: { weekStart: "desc" },
    select: { weekStart: true, jobKey: true, coinsAwarded: true, tierLabel: true, rawScore: true },
  });

  const byWeek = new Map<number, Map<string, { paid: number; coins: number; zero: number; tiers: Map<string, number> }>>();
  for (const r of rows) {
    const wk = r.weekStart.getTime();
    const jobs = byWeek.get(wk) ?? new Map();
    const cur = jobs.get(r.jobKey) ?? { paid: 0, coins: 0, zero: 0, tiers: new Map<string, number>() };
    cur.paid += 1;
    cur.coins += r.coinsAwarded;
    if (r.coinsAwarded === 0) cur.zero += 1;
    const tier = r.tierLabel ?? "Keine Bewertung";
    cur.tiers.set(tier, (cur.tiers.get(tier) ?? 0) + 1);
    jobs.set(r.jobKey, cur);
    byWeek.set(wk, jobs);
  }

  return [...byWeek.entries()].sort((a, b) => b[0] - a[0]).map(([ts, jobs]) => ({
    weekStart: new Date(ts).toISOString(),
    totalCoins: [...jobs.values()].reduce((s, j) => s + j.coins, 0),
    jobs: [...jobs.entries()].map(([jobKey, j]) => ({
      jobKey, label: getCommunityJob(jobKey)?.label ?? jobKey, paid: j.paid, coins: j.coins, zero: j.zero,
      tiers: [...j.tiers.entries()].map(([label, count]) => ({ label, count })),
    })),
  }));
}

/** Trockenlauf: was der nächste Payout-Lauf für die zuletzt abgeschlossene Woche auszahlen würde (schreibt nichts). */
export async function previewPayout(referenceDate: Date = new Date()) {
  const { weekStart, weekEnd } = getWeekBounds(new Date(referenceDate.getTime() - 7 * DAY));
  const members = await prisma.communityJobMember.findMany({
    where: { status: { in: ["ACTIVE", "WARNED"] }, contractStartAt: { lt: weekEnd } },
    include: { user: { select: { username: true, name: true } } },
  });
  const existing = await prisma.communityJobWeeklyPayout.findMany({ where: { weekStart }, select: { userId: true, jobKey: true, coinsAwarded: true } });
  const paid = new Map(existing.map(e => [`${e.userId}:${e.jobKey}`, e.coinsAwarded]));

  const rows = [];
  for (const m of members) {
    const key = `${m.userId}:${m.jobKey}`;
    if (paid.has(key)) {
      rows.push({ user: displayName(m.user), jobKey: m.jobKey, alreadyPaid: true, coins: paid.get(key) ?? 0, score: null as number | null, tier: null as string | null });
      continue;
    }
    try {
      const o = await computeWeeklyPayout(m, weekStart, weekEnd);
      rows.push({ user: displayName(m.user), jobKey: m.jobKey, alreadyPaid: false, coins: o.coinsAwarded, score: o.rawScore, tier: o.tierLabel });
    } catch {
      rows.push({ user: displayName(m.user), jobKey: m.jobKey, alreadyPaid: false, coins: 0, score: null, tier: "Fehler bei der Berechnung" });
    }
  }
  return {
    weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), rows,
    pendingCoins: rows.filter(r => !r.alreadyPaid).reduce((s, r) => s + r.coins, 0),
    pendingCount: rows.filter(r => !r.alreadyPaid).length,
  };
}

export async function getCronRuns(limit = 10) {
  const runs = await prisma.communityJobCronRun.findMany({ orderBy: { ranAt: "desc" }, take: limit });
  return runs.map(r => ({ id: r.id, ranAt: r.ranAt.toISOString(), durationMs: r.durationMs, hadError: r.hadError, result: r.resultJson }));
}

export async function recordCronRun(durationMs: number, hadError: boolean, result: unknown): Promise<void> {
  try {
    await prisma.communityJobCronRun.create({ data: { durationMs, hadError, resultJson: JSON.stringify(result).slice(0, 4000) } });
    // Nur die letzten 60 Läufe behalten.
    const old = await prisma.communityJobCronRun.findMany({ orderBy: { ranAt: "desc" }, skip: 60, select: { id: true } });
    if (old.length > 0) await prisma.communityJobCronRun.deleteMany({ where: { id: { in: old.map(o => o.id) } } });
  } catch (err) {
    console.error("[community-job-cron] Lauf konnte nicht protokolliert werden:", err);
  }
}

// ── Auffälligkeiten ──────────────────────────────────────────────────────────

interface VoteEvent { voter: string; owner: string; at: number }

export async function getVoteAnomalies(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const where = { createdAt: { gte: since } };
  const take = 20_000;
  const [reports, contribs, assets, posts, ideas, guides, comments, ratings] = await Promise.all([
    prisma.jobReportVote.findMany({ where, take, select: { voterId: true, createdAt: true, report: { select: { authorId: true } } } }),
    prisma.jobReportContributionVote.findMany({ where, take, select: { voterId: true, createdAt: true, contribution: { select: { authorId: true } } } }),
    prisma.jobMediaAssetVote.findMany({ where, take, select: { voterId: true, createdAt: true, asset: { select: { authorId: true } } } }),
    prisma.marketingPostVote.findMany({ where, take, select: { voterId: true, createdAt: true, post: { select: { authorId: true } } } }),
    prisma.communityIdeaVote.findMany({ where, take, select: { voterId: true, createdAt: true, idea: { select: { authorId: true } } } }),
    prisma.coachGuideVote.findMany({ where, take, select: { voterId: true, createdAt: true, guide: { select: { authorId: true } } } }),
    prisma.communityBoardCommentVote.findMany({ where, take, select: { voterId: true, createdAt: true, comment: { select: { authorId: true } } } }),
    prisma.coachRating.findMany({ where, take, select: { raterId: true, createdAt: true, coachId: true } }),
  ]);

  const events: VoteEvent[] = [
    ...reports.map(v => ({ voter: v.voterId, owner: v.report.authorId, at: v.createdAt.getTime() })),
    ...contribs.map(v => ({ voter: v.voterId, owner: v.contribution.authorId, at: v.createdAt.getTime() })),
    ...assets.map(v => ({ voter: v.voterId, owner: v.asset.authorId, at: v.createdAt.getTime() })),
    ...posts.map(v => ({ voter: v.voterId, owner: v.post.authorId, at: v.createdAt.getTime() })),
    ...ideas.map(v => ({ voter: v.voterId, owner: v.idea.authorId, at: v.createdAt.getTime() })),
    ...guides.map(v => ({ voter: v.voterId, owner: v.guide.authorId, at: v.createdAt.getTime() })),
    ...comments.map(v => ({ voter: v.voterId, owner: v.comment.authorId, at: v.createdAt.getTime() })),
    ...ratings.map(v => ({ voter: v.raterId, owner: v.coachId, at: v.createdAt.getTime() })),
  ];

  // 1) Paare: A bewertet B auffällig oft (und ggf. umgekehrt).
  const pairCount = new Map<string, number>();
  for (const e of events) pairCount.set(`${e.voter}>${e.owner}`, (pairCount.get(`${e.voter}>${e.owner}`) ?? 0) + 1);
  const pairs = [...pairCount.entries()].filter(([, n]) => n >= 8).map(([key, n]) => {
    const [voter, owner] = key.split(">");
    return { voter, owner, count: n, reverse: pairCount.get(`${owner}>${voter}`) ?? 0 };
  }).sort((a, b) => b.count - a.count).slice(0, 15);

  // 2) Schübe: viele Bewertungen in 10 Minuten.
  const byVoter = new Map<string, number[]>();
  for (const e of events) byVoter.set(e.voter, [...(byVoter.get(e.voter) ?? []), e.at]);
  const bursts: { voter: string; count: number; at: number }[] = [];
  for (const [voter, times] of byVoter) {
    times.sort((a, b) => a - b);
    let lo = 0, best = { count: 0, at: 0 };
    for (let hi = 0; hi < times.length; hi++) {
      while (times[hi] - times[lo] > 10 * 60_000) lo++;
      if (hi - lo + 1 > best.count) best = { count: hi - lo + 1, at: times[lo] };
    }
    if (best.count >= 20) bursts.push({ voter, ...best });
  }

  // 3) Neue Konten mit vielen Bewertungen.
  const heavyVoters = [...byVoter.entries()].filter(([, t]) => t.length >= 5).map(([v]) => v);
  const heavyUsers = heavyVoters.length > 0
    ? await prisma.user.findMany({ where: { id: { in: heavyVoters }, createdAt: { gte: new Date(Date.now() - 14 * DAY) } }, select: { id: true, createdAt: true } })
    : [];
  const newAccounts = heavyUsers.map(u => ({ voter: u.id, count: byVoter.get(u.id)?.length ?? 0, createdAt: u.createdAt.getTime() }));

  // 4) Konzentration: fast alle Stimmen der letzten 7 Tage kommen von höchstens zwei Personen.
  const weekAgo = Date.now() - 7 * DAY;
  const byOwner = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (e.at < weekAgo) continue;
    const m = byOwner.get(e.owner) ?? new Map<string, number>();
    m.set(e.voter, (m.get(e.voter) ?? 0) + 1);
    byOwner.set(e.owner, m);
  }
  const concentration: { owner: string; total: number; topShare: number; topVoters: string[] }[] = [];
  for (const [owner, m] of byOwner) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (total < 10) continue;
    const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const share = top.reduce((s, [, n]) => s + n, 0) / total;
    if (share >= 0.6) concentration.push({ owner, total, topShare: share, topVoters: top.map(([v]) => v) });
  }

  const ids = new Set<string>();
  pairs.forEach(p => { ids.add(p.voter); ids.add(p.owner); });
  bursts.forEach(b => ids.add(b.voter));
  newAccounts.forEach(n => ids.add(n.voter));
  concentration.forEach(c => { ids.add(c.owner); c.topVoters.forEach(v => ids.add(v)); });
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, username: true, name: true } });
  const nm = new Map(users.map(u => [u.id, displayName(u)]));
  const n = (id: string) => ({ id, name: nm.get(id) ?? id });

  return {
    days, totalVotes: events.length,
    pairs: pairs.map(p => ({ voter: n(p.voter), owner: n(p.owner), count: p.count, reverse: p.reverse, mutual: p.reverse >= 5 })),
    bursts: bursts.sort((a, b) => b.count - a.count).slice(0, 10).map(b => ({ voter: n(b.voter), count: b.count, at: new Date(b.at).toISOString() })),
    newAccounts: newAccounts.sort((a, b) => b.count - a.count).slice(0, 10).map(a => ({ voter: n(a.voter), count: a.count, createdAt: new Date(a.createdAt).toISOString() })),
    concentration: concentration.sort((a, b) => b.total - a.total).slice(0, 10).map(c => ({ owner: n(c.owner), total: c.total, topShare: c.topShare, topVoters: c.topVoters.map(n) })),
  };
}

// ── Gesundheit je Job ────────────────────────────────────────────────────────

export async function getJobHealth() {
  const jobs = await getEffectiveCommunityJobs();
  const now = new Date();
  const { weekStart } = getWeekBounds(new Date(now.getTime() - 7 * DAY));

  return Promise.all(jobs.map(async job => {
    const [members, pending, waitlisted, payouts] = await Promise.all([
      prisma.communityJobMember.findMany({
        where: { jobKey: job.key, status: { in: ["ACTIVE", "WARNED"] } },
        select: { status: true, lastContributionAt: true, assignedAt: true, contractEndAt: true },
      }),
      prisma.communityJobApplication.count({ where: { jobKey: job.key, status: "PENDING" } }),
      prisma.communityJobApplication.count({ where: { jobKey: job.key, status: "WAITLISTED" } }),
      prisma.communityJobWeeklyPayout.aggregate({ where: { jobKey: job.key, weekStart }, _sum: { coinsAwarded: true }, _count: true }),
    ]);

    const free = Math.max(0, job.maxSlots - members.length);
    const idle = (m: { lastContributionAt: Date | null; assignedAt: Date }, days: number) => {
      const ref = m.lastContributionAt ?? m.assignedAt;
      return now.getTime() - ref.getTime() > days * DAY;
    };
    const idle14 = members.filter(m => idle(m, 14)).length;
    const active7 = members.filter(m => m.lastContributionAt && now.getTime() - m.lastContributionAt.getTime() <= 7 * DAY).length;
    const endingSoon = members.filter(m => m.contractEndAt.getTime() - now.getTime() <= 14 * DAY).length;
    const warned = members.filter(m => m.status === "WARNED").length;

    const hints: { level: "warn" | "info"; text: string }[] = [];
    if (free > 0 && pending + waitlisted > 0) hints.push({ level: "warn", text: `${free} Platz frei, obwohl ${pending + waitlisted} Bewerber warten — bitte prüfen` });
    else if (free > 0 && members.length === 0) hints.push({ level: "warn", text: "Komplett unbesetzt, keine Bewerber" });
    else if (free > 0) hints.push({ level: "info", text: `${free} ${free === 1 ? "Platz" : "Plätze"} frei, keine Bewerber` });
    if (idle14 > 0) hints.push({ level: "warn", text: `${idle14} ${idle14 === 1 ? "Mitglied" : "Mitglieder"} ohne Beitrag seit 14 Tagen` });
    if (warned > 0) hints.push({ level: "info", text: `${warned} verwarnt` });
    if (endingSoon > 0) hints.push({ level: "info", text: `${endingSoon} ${endingSoon === 1 ? "Vertrag läuft" : "Verträge laufen"} in 14 Tagen aus` });

    return {
      key: job.key, label: job.label, emoji: job.emoji, maxSlots: job.maxSlots, filled: members.length, free,
      pending, waitlisted, active7, idle14, warned, endingSoon,
      lastWeekCoins: payouts._sum.coinsAwarded ?? 0, lastWeekPaid: payouts._count, hints,
    };
  }));
}

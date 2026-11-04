import { prisma } from "./prisma";
import type { ScoreBreakdown } from "./score-engine";
import { COIN_PREFIX } from "./points";
import { getCommunityJob } from "./community-jobs";
import { syncReputationDiscordRole } from "./discord-roles";
import {
  getEffectiveCommunityJobs, getPayoutTiers, getVoteBonusTiers,
  resolveTier, resolveVoteBonusMultiplier,
} from "./community-job-config";
import {
  BADGE_WINDOW_WEEKS, WEEKLY_POINTS_MAX, levelFromPoints, weeklyBadgePoints, weeklyCommentPoints, type JobBadgeData,
} from "./job-badges";
import { getPayoutCandidates, getRecentJobContributors, listKnownCoaches } from "./community-job-access";
import { COMMUNITY_JOBS } from "./community-jobs";

/** Setzt die Discord-Ansehens-Rolle nach dem gespeicherten Stand — Fehler dürfen nie etwas blockieren. */
export async function syncReputationRoleForUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId }, select: { discordId: true, reputationLevel: true, reputationPoints: true },
  }).catch(() => null);
  if (!user) return { ok: false, error: "User nicht gefunden" };
  return syncReputationDiscordRole(user.discordId, user.reputationPoints > 0 ? user.reputationLevel : null)
    .catch(() => ({ ok: false, error: "Discord-Fehler" }));
}

/**
 * Community-Jobs, Server-Seite — offenes Modell: Jeder User darf alle Jobs ausüben,
 * es gibt keine Bewerbung, Mitgliedschaft oder Verträge mehr. Hier liegen Katalog,
 * Wochengehalt je Job und das Ansehen pro User (Profilrahmen, Discord-Rolle).
 *
 * `computeRawScore` ist bewusst pluggable: Phase 1 hat noch keine Content-Modelle
 * (JobReport etc.), spätere Phasen registrieren hier ihre echte Score-Berechnung
 * über `registerScoreResolver`, ohne dass sich die Payout-Logik selbst ändert.
 */

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Wochenfenster Montag 00:00 UTC – folgender Montag 00:00 UTC, für einen beliebigen Zeitpunkt in der Woche. */
export function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=So..6=Sa
  const diffToMonday = (day + 6) % 7;
  const weekStart = new Date(d.getTime() - diffToMonday * 86_400_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  return { weekStart, weekEnd };
}

type ScoreResolver = (userId: string, weekStart: Date, weekEnd: Date) => Promise<number>;
const scoreResolvers = new Map<string, ScoreResolver>();

/** Spätere Phasen registrieren hier ihre echte Score-Berechnung pro Job. */
export function registerScoreResolver(jobKey: string, resolver: ScoreResolver): void {
  scoreResolvers.set(jobKey, resolver);
}

type ScoreBreakdownFn = (userId: string, weekStart: Date, weekEnd: Date) => Promise<ScoreBreakdown>;
const scoreBreakdowns = new Map<string, ScoreBreakdownFn>();

/** Jeder Job registriert zusätzlich zur Zahl auch die Aufschlüsselung (Streams, Deckel, Boni) — für "Wie kommt mein Score zustande?". */
export function registerScoreBreakdown(jobKey: string, fn: ScoreBreakdownFn): void {
  scoreBreakdowns.set(jobKey, fn);
}

export async function getScoreBreakdown(jobKey: string, userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreBreakdown | null> {
  const fn = scoreBreakdowns.get(jobKey);
  return fn ? fn(userId, weekStart, weekEnd) : null;
}

async function computeRawScore(jobKey: string, userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const resolver = scoreResolvers.get(jobKey);
  if (!resolver) return 0; // noch kein Content-Modell für diesen Job registriert
  return resolver(userId, weekStart, weekEnd);
}

// ── Katalog ──────────────────────────────────────────────────────────────────

export interface CommunityJobCatalogEntry {
  key: string; label: string; emoji: string; description: string; officeGuideMarkdown: string;
  /** Wer in den letzten 30 Tagen in diesem Job beigetragen hat (beim Coach: alle auffindbaren Coaches). */
  holders: { userId: string; username: string | null; availableUntil: string | null; specialties: string[] }[];
}

/**
 * Öffentlicher Katalog der offenen Community-Jobs: Texte + wer gerade aktiv ist.
 * Keine Slots/Warteliste mehr — jeder darf jeden Job ausüben.
 */
export async function getCommunityJobCatalog(): Promise<CommunityJobCatalogEntry[]> {
  const jobs = await getEffectiveCommunityJobs();
  return Promise.all(jobs.map(async job => {
    let holders: CommunityJobCatalogEntry["holders"];
    if (job.key === "coach") {
      holders = await listKnownCoaches();
    } else {
      const ids = await getRecentJobContributors(job.key);
      const users = await prisma.user.findMany({
        where: { id: { in: ids }, deletedAt: null }, select: { id: true, username: true, name: true },
      });
      holders = users.map(u => ({ userId: u.id, username: u.username ?? u.name, availableUntil: null, specialties: [] }));
    }
    return {
      key: job.key, label: job.label, emoji: job.emoji, description: job.description,
      officeGuideMarkdown: job.officeGuideMarkdown, holders,
    };
  }));
}

// ── Wöchentliches Gehalt ─────────────────────────────────────────────────────

/**
 * Zählt gültige (nicht selbst, nicht angefochten-überstimmt) Bewertungen, die
 * dieser User in der Woche auf fremde Community-Job-Beiträge abgegeben hat —
 * über ALLE Vote-Tabellen hinweg (Reports, Assets, später mehr). Jede Content-
 * Phase registriert hier ihren eigenen Zähler; die Summe aller Zähler ergibt
 * die Gesamtzahl für den Aktivitäts-Bonus.
 */
const ownVoteCounters: ScoreResolver[] = [];
export function registerOwnVoteCounter(fn: ScoreResolver): void {
  ownVoteCounters.push(fn);
}
async function countOwnVotes(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const counts = await Promise.all(ownVoteCounters.map(fn => fn(userId, weekStart, weekEnd)));
  return counts.reduce((sum, c) => sum + c, 0);
}

export interface WeeklyPayoutOutcome {
  userId: string; jobKey: string; rawScore: number;
  tierLabel: string | null; baseCoins: number; ownVotes: number; voteBonusMultiplier: number; coinsAwarded: number;
}

export async function computeWeeklyPayout(
  member: { userId: string; jobKey: string },
  weekStart: Date, weekEnd: Date,
): Promise<WeeklyPayoutOutcome> {
  const rawScore = await computeRawScore(member.jobKey, member.userId, weekStart, weekEnd);
  const tiers = await getPayoutTiers(member.jobKey);
  const tier = resolveTier(tiers, rawScore);

  const baseCoins = tier?.coinsAwarded ?? 0;

  // Wird UNABHÄNGIG von baseCoins berechnet: bei baseCoins=0 ändert der
  // Multiplikator zwar nichts am ausgezahlten Betrag (0 × irgendwas = 0),
  // aber der gespeicherte/angezeigte Wert muss trotzdem die tatsächliche
  // Stufe zeigen (z.B. ×0.5 bei 0 eigenen Bewertungen) — sonst zeigt die UI
  // fälschlich immer ×1.0, sobald der User in diesem Job diese Woche 0 Münzen
  // verdient hat, unabhängig vom Admin-konfigurierten Tarif.
  const ownVotes = await countOwnVotes(member.userId, weekStart, weekEnd);
  const bonusTiers = await getVoteBonusTiers();
  const voteBonusMultiplier = resolveVoteBonusMultiplier(bonusTiers, ownVotes);

  return {
    userId: member.userId, jobKey: member.jobKey, rawScore,
    tierLabel: tier?.label ?? null, baseCoins, ownVotes,
    voteBonusMultiplier, coinsAwarded: Math.round(baseCoins * voteBonusMultiplier),
  };
}

export interface ProjectedPayout {
  rawScore: number; tierLabel: string | null; ownVotes: number; voteBonusMultiplier: number;
  /** Was JETZT ausgezahlt würde, wenn die laufende Woche sofort enden würde. */
  coinsAwarded: number;
  /** Theoretisches Maximum diese Woche: höchste Gehaltsstufe × höchster Aktivitäts-Bonus. */
  maxCoinsAwarded: number;
}

/**
 * Live-Vorschau fürs Büro-Dashboard: dieselbe Formel wie computeWeeklyPayout,
 * aber für die noch LAUFENDE statt eine abgeschlossene Woche — Bewertungen mit
 * `createdAt` in der Zukunft gibt es naturgemäß nicht, computeRawScore/
 * countOwnVotes liefern also automatisch nur den bis jetzt aufgelaufenen Stand.
 * Wird nirgends gespeichert, rein zur Anzeige.
 */
export async function getProjectedPayout(userId: string, jobKey: string): Promise<ProjectedPayout> {
  const { weekStart, weekEnd } = getWeekBounds(new Date());
  // Offene Jobs: kein Vertragsbeginn mehr — es wird immer die volle Woche gerechnet.
  const outcome = await computeWeeklyPayout({ userId, jobKey }, weekStart, weekEnd);

  const [tiers, bonusTiers] = await Promise.all([getPayoutTiers(jobKey), getVoteBonusTiers()]);
  const maxBaseCoins = tiers.reduce((max, t) => Math.max(max, t.coinsAwarded), 0);
  const maxBonusMultiplier = bonusTiers.reduce((max, t) => Math.max(max, t.multiplier), 1);

  return {
    rawScore: outcome.rawScore, tierLabel: outcome.tierLabel, ownVotes: outcome.ownVotes,
    voteBonusMultiplier: outcome.voteBonusMultiplier, coinsAwarded: outcome.coinsAwarded,
    maxCoinsAwarded: Math.round(maxBaseCoins * maxBonusMultiplier),
  };
}

/**
 * Wöchentlicher Payout-Lauf: zahlt die zuletzt ABGESCHLOSSENE Woche vor
 * `referenceDate` aus (nicht die laufende — deren Bewertungen wären am Montag
 * früh noch fast leer). Offene Jobs: Es gibt keine Mitgliedschaft mehr — für
 * jeden Job wird jeder gerechnet, der dort je beigetragen hat; jeder Job zahlt
 * seine Stufe voll. Wer in einem Job Score 0 hat, bekommt keine Zeile.
 * Idempotent — überspringt User/Job-Paare, für die diese Woche schon eine Zeile
 * existiert. Ein Fehler bei einem User bricht den Lauf nicht ab.
 */
export async function runWeeklyPayout(referenceDate: Date = new Date()): Promise<{ paid: number; skipped: number; failed: number }> {
  const { weekStart, weekEnd } = getWeekBounds(new Date(referenceDate.getTime() - 7 * 86_400_000));
  const pairs: { userId: string; jobKey: string }[] = [];
  for (const job of COMMUNITY_JOBS) {
    for (const userId of await getPayoutCandidates(job.key)) pairs.push({ userId, jobKey: job.key });
  }

  let paid = 0, skipped = 0, failed = 0;
  for (const member of pairs) {
    try {
      const existing = await prisma.communityJobWeeklyPayout.findUnique({
        where: { userId_jobKey_weekStart: { userId: member.userId, jobKey: member.jobKey, weekStart } },
      });
      if (existing) { skipped++; continue; }

      const outcome = await computeWeeklyPayout(member, weekStart, weekEnd);
      if (outcome.rawScore <= 0 && outcome.coinsAwarded <= 0) { skipped++; continue; }

      await prisma.$transaction(async tx => {
        await tx.communityJobWeeklyPayout.create({
          data: {
            userId: outcome.userId, jobKey: outcome.jobKey, weekStart, weekEnd,
            rawScore: outcome.rawScore, tierLabel: outcome.tierLabel,
            baseCoins: outcome.baseCoins, voteBonusMultiplier: outcome.voteBonusMultiplier,
            coinsAwarded: outcome.coinsAwarded,
          },
        });
        if (outcome.coinsAwarded > 0) {
          const job = getCommunityJob(outcome.jobKey);
          await tx.user.update({ where: { id: outcome.userId }, data: { points: { increment: outcome.coinsAwarded } } });
          await tx.pointTransaction.create({
            data: {
              userId: outcome.userId, amount: outcome.coinsAwarded,
              reason: `${COIN_PREFIX} Wochengehalt: ${job?.label ?? outcome.jobKey}${outcome.tierLabel ? ` (${outcome.tierLabel})` : ""}`,
            },
          });
        }
      });
      paid++;
    } catch (err) {
      failed++;
      console.error(`[community-job-payout] Auszahlung fehlgeschlagen (User ${member.userId}, Job ${member.jobKey}):`, err);
    }
  }
  return { paid, skipped, failed };
}

// ── Ansehen (Stufe 1–4 pro User, steuert den Profilrahmen) ──────────────────

/**
 * Berechnet das Ansehen aller zuletzt aktiven User neu — aus der Gesamtleistung über ALLE
 * Community-Jobs: Pro abgeschlossener Woche zählt jede Gehaltsstufe eines Jobs 1–3 Punkte
 * (weeklyBadgePoints), dazu höchstens 1 Punkt für Daumen auf eigene Kommentare; die Woche
 * wird bei WEEKLY_POINTS_MAX gedeckelt. Summe über BADGE_WINDOW_WEEKS Wochen → Stufe 1–4.
 * Die Stufe kann steigen UND sinken. Vom Team gesetzte Stufen bleiben bis zum Ablauf des
 * Overrides unverändert. Läuft im täglichen Payout-Cron NACH dem Wochen-Payout.
 */
export async function runReputationUpdate(referenceDate: Date = new Date()): Promise<{ updated: number; rolesSynced: number }> {
  const windowEnd = getWeekBounds(referenceDate).weekStart; // nur abgeschlossene Wochen
  const since = new Date(windowEnd.getTime() - BADGE_WINDOW_WEEKS * 7 * 86_400_000);
  const weekKey = (d: Date) => getWeekBounds(d).weekStart.getTime();

  const [payouts, commentVotes, previouslyRated] = await Promise.all([
    prisma.communityJobWeeklyPayout.findMany({
      where: { weekStart: { gte: since, lt: windowEnd } },
      select: { userId: true, jobKey: true, rawScore: true, weekStart: true },
    }),
    prisma.communityBoardCommentVote.findMany({
      where: {
        createdAt: { gte: since, lt: windowEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
      select: { createdAt: true, comment: { select: { authorId: true } } },
    }),
    // Wer schon Ansehen hat, muss mitgerechnet werden, damit die Stufe auch wieder sinken kann.
    prisma.user.findMany({
      where: { OR: [{ reputationLevel: { gt: 1 } }, { reputationPoints: { gt: 0 } }] },
      select: { id: true },
    }),
  ]);

  const tiersByJob = new Map<string, Awaited<ReturnType<typeof getPayoutTiers>>>();
  for (const job of COMMUNITY_JOBS) {
    tiersByJob.set(job.key, [...(await getPayoutTiers(job.key))].sort((x, y) => x.minScore - y.minScore));
  }

  // userId → (Woche → Punkte vor Deckel)
  const weekly = new Map<string, Map<number, number>>();
  const add = (userId: string, week: number, points: number) => {
    if (points <= 0) return;
    const m = weekly.get(userId) ?? new Map<number, number>();
    m.set(week, (m.get(week) ?? 0) + points);
    weekly.set(userId, m);
  };
  for (const p of payouts) {
    const tiers = tiersByJob.get(p.jobKey) ?? [];
    const tier = resolveTier(tiers, p.rawScore);
    add(p.userId, weekKey(p.weekStart), weeklyBadgePoints(tier ? tiers.indexOf(tier) + 1 : 0, tiers.length));
  }
  const commentCounts = new Map<string, Map<number, number>>();
  for (const v of commentVotes) {
    const m = commentCounts.get(v.comment.authorId) ?? new Map<number, number>();
    const k = weekKey(v.createdAt);
    m.set(k, (m.get(k) ?? 0) + 1);
    commentCounts.set(v.comment.authorId, m);
  }
  for (const [userId, perWeek] of commentCounts) {
    for (const [week, count] of perWeek) add(userId, week, weeklyCommentPoints(count));
  }

  const userIds = [...new Set([...weekly.keys(), ...previouslyRated.map(u => u.id)])];
  let updated = 0, rolesSynced = 0;
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputationLevel: true, reputationPeakLevel: true, reputationPoints: true, reputationOverrideUntil: true, deletedAt: true },
    });
    if (!user || user.deletedAt) continue;
    if (user.reputationOverrideUntil && user.reputationOverrideUntil > referenceDate) continue; // vom Team von Hand gesetzt

    const points = [...(weekly.get(userId)?.values() ?? [])].reduce((sum, p) => sum + Math.min(WEEKLY_POINTS_MAX, p), 0);
    const level = levelFromPoints(points);
    const peak = Math.max(user.reputationPeakLevel, level);
    if (level === user.reputationLevel && peak === user.reputationPeakLevel && points === user.reputationPoints) continue;

    await prisma.user.update({
      where: { id: userId },
      data: { reputationLevel: level, reputationPeakLevel: peak, reputationPoints: points },
    });
    updated++;
    // Discord-Rolle nur anfassen, wenn sich Stufe oder "aktiv ja/nein" geändert hat.
    if (level !== user.reputationLevel || (points > 0) !== (user.reputationPoints > 0)) {
      await syncReputationRoleForUser(userId);
      rolesSynced++;
    }
  }
  return { updated, rolesSynced };
}

/** Admin setzt das Ansehen eines Users von Hand (gilt 4 Wochen, dann übernimmt wieder die Berechnung). */
export async function adminSetReputationLevel(userId: string, level: number): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(level) || level < 1 || level > 4) return { error: "Stufe muss zwischen 1 und 4 liegen" };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputationPeakLevel: true } });
  if (!user) return { error: "User nicht gefunden" };
  await prisma.user.update({
    where: { id: userId },
    data: { reputationLevel: level, reputationPeakLevel: Math.max(user.reputationPeakLevel, level), reputationOverrideUntil: addDays(new Date(), 28) },
  });
  await syncReputationRoleForUser(userId);
  return { ok: true };
}

/**
 * Ansehen für viele Nutzer auf einmal (Profilrahmen). Jeder existierende User hat
 * eine Stufe (Start: 1) — unbekannte IDs fehlen im Ergebnis.
 */
export async function getJobBadges(userIds: string[]): Promise<Record<string, JobBadgeData>> {
  const ids = [...new Set(userIds)].slice(0, 200);
  const result: Record<string, JobBadgeData> = {};
  if (ids.length === 0) return result;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, reputationLevel: true },
  });
  for (const u of users) result[u.id] = { level: u.reputationLevel };
  return result;
}

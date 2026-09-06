import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import { getCommunityJob } from "./community-jobs";
import { syncCommunityJobDiscordRole } from "./discord-roles";
import {
  getEffectiveCommunityJobs, getMaxSlots, getPayoutTiers, getVoteBonusConfig,
  resolveTier, computeVoteBonusMultiplier,
} from "./community-job-config";

/** Setzt/entfernt die Discord-Job-Rolle — Fehler dürfen die eigentliche Aktion nie blockieren. */
async function syncDiscordRoleForUser(userId: string, jobKey: string | null): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } }).catch(() => null);
  await syncCommunityJobDiscordRole(user?.discordId, jobKey).catch(() => {});
}

/**
 * Community-Jobs, Server-Seite — Phase 1 (Fundament): Bewerbung, Mitgliedschaft,
 * Warteliste, Übergabe, Verträge, wöchentliches Gehalt. Siehe Plan "Community-Jobs
 * mit Büro/Werkstatt und Wochengehalt".
 *
 * `computeRawScore` ist bewusst pluggable: Phase 1 hat noch keine Content-Modelle
 * (JobReport etc.), spätere Phasen registrieren hier ihre echte Score-Berechnung
 * über `registerScoreResolver`, ohne dass sich die Payout-Logik selbst ändert.
 */

const CONTRACT_MONTHS = 3;
const RENEWAL_OPENS_AFTER_MONTHS = 2;
const REAPPLY_BLOCK_DAYS = 14;
const INACTIVITY_WARNING_DAYS = 14;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
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

async function computeRawScore(jobKey: string, userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const resolver = scoreResolvers.get(jobKey);
  if (!resolver) return 0; // noch kein Content-Modell für diesen Job registriert
  return resolver(userId, weekStart, weekEnd);
}

// ── Status-Abfragen ──────────────────────────────────────────────────────────

export async function getActiveMembership(userId: string) {
  return prisma.communityJobMember.findFirst({
    where: { userId, status: { in: ["ACTIVE", "WARNED"] } },
    orderBy: { assignedAt: "desc" },
  });
}

export interface CommunityJobCatalogEntry {
  key: string; label: string; emoji: string; description: string;
  maxSlots: number; filledSlots: number;
  holders: { userId: string; username: string | null; status: string; lastPayoutCoins: number | null }[];
  waitlistCount: number;
}

/** Öffentlicher Katalog: Slots, aktuelle Inhaber + letztes Gehalt (Transparenz-Anforderung). */
export async function getCommunityJobCatalog(): Promise<CommunityJobCatalogEntry[]> {
  const jobs = await getEffectiveCommunityJobs();
  const entries: CommunityJobCatalogEntry[] = [];

  for (const job of jobs) {
    const members = await prisma.communityJobMember.findMany({
      where: { jobKey: job.key, status: { in: ["ACTIVE", "WARNED"] } },
      include: { user: { select: { id: true, username: true, name: true } } },
    });
    const waitlistCount = await prisma.communityJobApplication.count({
      where: { jobKey: job.key, status: "WAITLISTED" },
    });

    const holders = await Promise.all(members.map(async m => {
      const last = await prisma.communityJobWeeklyPayout.findFirst({
        where: { userId: m.userId, jobKey: job.key },
        orderBy: { weekStart: "desc" },
      });
      return {
        userId: m.userId,
        username: m.user.username ?? m.user.name,
        status: m.status,
        lastPayoutCoins: last?.coinsAwarded ?? null,
      };
    }));

    entries.push({
      key: job.key, label: job.label, emoji: job.emoji, description: job.description,
      maxSlots: job.maxSlots, filledSlots: members.length, holders, waitlistCount,
    });
  }
  return entries;
}

// ── Bewerbung ────────────────────────────────────────────────────────────────

export type ApplyResult = { ok: true; status: "PENDING" } | { error: string };

export async function applyForJob(userId: string, jobKey: string, message?: string): Promise<ApplyResult> {
  if (!getCommunityJob(jobKey)) return { error: "Unbekannter Job" };

  const activeElsewhere = await getActiveMembership(userId);
  if (activeElsewhere) return { error: "Du übst bereits einen Community-Job aus" };

  const pending = await prisma.communityJobApplication.findFirst({
    where: { userId, jobKey, status: { in: ["PENDING", "WAITLISTED"] } },
  });
  if (pending) return { error: "Du hast dich für diesen Job bereits beworben" };

  const lastRevoked = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey, status: "REVOKED" },
    orderBy: { revokedAt: "desc" },
  });
  if (lastRevoked?.reapplyBlockedUntil && lastRevoked.reapplyBlockedUntil > new Date()) {
    return { error: `Bewerbung erst wieder ab ${lastRevoked.reapplyBlockedUntil.toLocaleDateString("de-DE")} möglich` };
  }

  await prisma.communityJobApplication.create({
    data: { userId, jobKey, message, status: "PENDING" },
  });
  return { ok: true, status: "PENDING" };
}

export type WithdrawResult = { ok: true } | { error: string };

export async function withdrawApplication(userId: string, applicationId: string): Promise<WithdrawResult> {
  const app = await prisma.communityJobApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.userId !== userId) return { error: "Bewerbung nicht gefunden" };
  if (!["PENDING", "WAITLISTED"].includes(app.status)) return { error: "Bewerbung kann nicht mehr zurückgezogen werden" };

  await prisma.communityJobApplication.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" },
  });
  return { ok: true };
}

async function activateApplication(applicationId: string, userId: string, jobKey: string, handedOffFromUserId?: string) {
  const now = new Date();
  await prisma.$transaction([
    prisma.communityJobApplication.update({
      where: { id: applicationId },
      data: { status: "ACTIVATED", activatedAt: now },
    }),
    prisma.communityJobMember.create({
      data: {
        userId, jobKey, status: "ACTIVE",
        assignedAt: now, contractStartAt: now, contractEndAt: addMonths(now, CONTRACT_MONTHS),
        handedOffFromUserId: handedOffFromUserId ?? null,
      },
    }),
  ]);
  await syncDiscordRoleForUser(userId, jobKey);
}

export type ReviewResult = { ok: true; result: "ACTIVATED" | "WAITLISTED" | "REJECTED" } | { error: string };

export async function reviewApplication(
  adminId: string, applicationId: string, decision: "APPROVE" | "REJECT",
): Promise<ReviewResult> {
  const app = await prisma.communityJobApplication.findUnique({ where: { id: applicationId } });
  if (!app || app.status !== "PENDING") return { error: "Bewerbung nicht (mehr) offen" };

  if (decision === "REJECT") {
    await prisma.communityJobApplication.update({
      where: { id: applicationId },
      data: { status: "REJECTED", reviewedById: adminId, reviewedAt: new Date() },
    });
    return { ok: true, result: "REJECTED" };
  }

  const maxSlots = await getMaxSlots(app.jobKey);
  const filled = await prisma.communityJobMember.count({
    where: { jobKey: app.jobKey, status: { in: ["ACTIVE", "WARNED"] } },
  });

  await prisma.communityJobApplication.update({
    where: { id: applicationId },
    data: { reviewedById: adminId, reviewedAt: new Date(), status: filled < maxSlots ? "PENDING" : "WAITLISTED" },
  });

  if (filled < maxSlots) {
    await activateApplication(applicationId, app.userId, app.jobKey);
    return { ok: true, result: "ACTIVATED" };
  }
  return { ok: true, result: "WAITLISTED" };
}

// ── Übergabe ─────────────────────────────────────────────────────────────────

export type HandoffResult = { ok: true } | { error: string };

async function performHandoff(fromMemberId: string, targetApplicationId: string): Promise<HandoffResult> {
  const [fromMember, targetApp] = await Promise.all([
    prisma.communityJobMember.findUnique({ where: { id: fromMemberId } }),
    prisma.communityJobApplication.findUnique({ where: { id: targetApplicationId } }),
  ]);
  if (!fromMember || fromMember.status !== "ACTIVE" && fromMember.status !== "WARNED") {
    return { error: "Kein aktiver Job-Inhaber" };
  }
  if (!targetApp || targetApp.status !== "WAITLISTED" || targetApp.jobKey !== fromMember.jobKey) {
    return { error: "Bewerbung nicht auf der Warteliste für diesen Job" };
  }

  await prisma.communityJobMember.update({
    where: { id: fromMemberId },
    data: { status: "QUIT" },
  });
  await syncDiscordRoleForUser(fromMember.userId, null);
  await activateApplication(targetApplicationId, targetApp.userId, targetApp.jobKey, fromMember.userId);
  return { ok: true };
}

/** Freiwillige Übergabe durch den aktuellen Inhaber selbst. */
export async function handoffJob(fromUserId: string, targetApplicationId: string): Promise<HandoffResult> {
  const fromMember = await getActiveMembership(fromUserId);
  if (!fromMember) return { error: "Du hast gerade keinen aktiven Community-Job" };
  return performHandoff(fromMember.id, targetApplicationId);
}

/** Admin-Zwangsübergabe — ersetzt optional einen bestehenden Inhaber ohne dessen Zustimmung. */
export async function adminReassignJob(
  _adminId: string, jobKey: string, targetApplicationId: string, revokeMemberId?: string,
): Promise<HandoffResult> {
  if (revokeMemberId) {
    return performHandoff(revokeMemberId, targetApplicationId);
  }
  const targetApp = await prisma.communityJobApplication.findUnique({ where: { id: targetApplicationId } });
  if (!targetApp || targetApp.status !== "WAITLISTED" || targetApp.jobKey !== jobKey) {
    return { error: "Bewerbung nicht auf der Warteliste für diesen Job" };
  }
  const maxSlots = await getMaxSlots(jobKey);
  const filled = await prisma.communityJobMember.count({
    where: { jobKey, status: { in: ["ACTIVE", "WARNED"] } },
  });
  if (filled >= maxSlots) return { error: "Keine freien Slots — bitte einen bestehenden Inhaber zum Ersetzen angeben" };

  await activateApplication(targetApplicationId, targetApp.userId, jobKey);
  return { ok: true };
}

// ── Kündigen / Verlängern ────────────────────────────────────────────────────

export type QuitResult = { ok: true } | { error: string };

export async function quitCommunityJob(userId: string): Promise<QuitResult> {
  const member = await getActiveMembership(userId);
  if (!member) return { error: "Du hast gerade keinen aktiven Community-Job" };
  await prisma.communityJobMember.update({ where: { id: member.id }, data: { status: "QUIT" } });
  await syncDiscordRoleForUser(userId, null);
  return { ok: true };
}

export type RenewResult = { ok: true; contractEndAt: string } | { error: string };

export async function renewContract(userId: string): Promise<RenewResult> {
  const member = await getActiveMembership(userId);
  if (!member) return { error: "Du hast gerade keinen aktiven Community-Job" };
  if (member.status !== "ACTIVE") return { error: "Verwarnte Mitglieder können nicht verlängern" };

  const now = new Date();
  const renewalOpensAt = addMonths(member.contractStartAt, RENEWAL_OPENS_AFTER_MONTHS);
  if (now < renewalOpensAt) return { error: `Verlängerung erst ab ${renewalOpensAt.toLocaleDateString("de-DE")} möglich` };
  if (now > member.contractEndAt) return { error: "Vertrag ist bereits abgelaufen" };

  const contractEndAt = addMonths(member.contractEndAt, CONTRACT_MONTHS);
  await prisma.communityJobMember.update({
    where: { id: member.id },
    data: { contractEndAt, renewedAt: now },
  });
  return { ok: true, contractEndAt: contractEndAt.toISOString() };
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
  tierLabel: string | null; baseCoins: number; voteBonusMultiplier: number; coinsAwarded: number;
}

export async function computeWeeklyPayout(
  member: { userId: string; jobKey: string; contractStartAt: Date },
  weekStart: Date, weekEnd: Date,
): Promise<WeeklyPayoutOutcome> {
  const rawScore = await computeRawScore(member.jobKey, member.userId, weekStart, weekEnd);
  const tiers = await getPayoutTiers(member.jobKey);
  const tier = resolveTier(tiers, rawScore);

  let baseCoins = tier?.coinsAwarded ?? 0;

  // Anteiliges erstes Wochengehalt, falls die Mitgliedschaft mitten in der Woche begann.
  if (baseCoins > 0 && member.contractStartAt > weekStart) {
    const totalMs = weekEnd.getTime() - weekStart.getTime();
    const workedMs = weekEnd.getTime() - member.contractStartAt.getTime();
    baseCoins = Math.round(baseCoins * Math.max(0, Math.min(1, workedMs / totalMs)));
  }

  let voteBonusMultiplier = 1;
  if (baseCoins > 0) {
    const ownVotes = await countOwnVotes(member.userId, weekStart, weekEnd);
    const bonusConfig = await getVoteBonusConfig();
    voteBonusMultiplier = computeVoteBonusMultiplier(ownVotes, bonusConfig);
  }

  return {
    userId: member.userId, jobKey: member.jobKey, rawScore,
    tierLabel: tier?.label ?? null, baseCoins,
    voteBonusMultiplier, coinsAwarded: Math.round(baseCoins * voteBonusMultiplier),
  };
}

/**
 * Wöchentlicher Payout-Lauf: für alle aktiven Mitglieder einmalig pro Woche.
 * Idempotent — überspringt Mitglieder, für die diese Woche schon eine Zeile existiert.
 */
export async function runWeeklyPayout(referenceDate: Date = new Date()): Promise<{ paid: number; skipped: number }> {
  const { weekStart, weekEnd } = getWeekBounds(referenceDate);
  const members = await prisma.communityJobMember.findMany({
    where: { status: { in: ["ACTIVE", "WARNED"] } },
  });

  let paid = 0, skipped = 0;
  for (const member of members) {
    const existing = await prisma.communityJobWeeklyPayout.findUnique({
      where: { userId_jobKey_weekStart: { userId: member.userId, jobKey: member.jobKey, weekStart } },
    }).catch(() => null);
    if (existing) { skipped++; continue; }

    const outcome = await computeWeeklyPayout(member, weekStart, weekEnd);

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
  }
  return { paid, skipped };
}

/**
 * Täglicher Check: abgelaufene, nicht verlängerte Verträge → EXPIRED, Slot frei.
 * Muss NACH dem Payout-Lauf derselben Woche laufen, siehe Plan.
 */
export async function runContractExpiryCheck(referenceDate: Date = new Date()): Promise<{ expired: number }> {
  const expiredMembers = await prisma.communityJobMember.findMany({
    where: { status: { in: ["ACTIVE", "WARNED"] }, contractEndAt: { lt: referenceDate } },
  });
  for (const m of expiredMembers) {
    await prisma.communityJobMember.update({ where: { id: m.id }, data: { status: "EXPIRED" } });
    await syncDiscordRoleForUser(m.userId, null);
  }
  return { expired: expiredMembers.length };
}

/** Inaktivitäts-Mahnung: keine Beiträge seit INACTIVITY_WARNING_DAYS → WARNED (falls noch nicht verwarnt). */
export async function runInactivityCheck(referenceDate: Date = new Date()): Promise<{ warned: number }> {
  const threshold = new Date(referenceDate.getTime() - INACTIVITY_WARNING_DAYS * 86_400_000);
  const candidates = await prisma.communityJobMember.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { lastContributionAt: { lt: threshold } },
        { lastContributionAt: null, assignedAt: { lt: threshold } },
      ],
    },
  });
  for (const m of candidates) {
    await prisma.communityJobMember.update({
      where: { id: m.id },
      data: { status: "WARNED", warnedAt: referenceDate, warningReason: "Inaktivität: keine neuen Beiträge" },
    });
  }
  return { warned: candidates.length };
}

/** Admin-/Automatik-Entzug wegen anhaltend schlechter Leistung oder wiederholter Verwarnung. */
export async function revokeMembership(memberId: string, reason: string): Promise<{ ok: true } | { error: string }> {
  const member = await prisma.communityJobMember.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Mitgliedschaft nicht gefunden" };
  const now = new Date();
  await prisma.communityJobMember.update({
    where: { id: memberId },
    data: {
      status: "REVOKED", revokedAt: now, warningReason: reason,
      reapplyBlockedUntil: addDays(now, REAPPLY_BLOCK_DAYS),
    },
  });
  await syncDiscordRoleForUser(member.userId, null);
  return { ok: true };
}

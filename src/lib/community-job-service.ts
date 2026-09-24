import { prisma } from "./prisma";
import type { ScoreBreakdown } from "./score-engine";
import { COIN_PREFIX } from "./points";
import { getCommunityJob } from "./community-jobs";
import { syncCommunityJobDiscordRole } from "./discord-roles";
import { dispatchNotification } from "./notify-dispatch";
import {
  getEffectiveCommunityJobs, getMaxSlots, getPayoutTiers, getVoteBonusTiers,
  resolveTier, resolveVoteBonusMultiplier,
} from "./community-job-config";
import { formatBerlinDate } from "./time";
import {
  BADGE_WINDOW_WEEKS, levelFromPoints, weeklyBadgePoints, type JobBadgeData,
} from "./job-badges";

/** Setzt/entfernt die Discord-Job-Rolle — Fehler dürfen die eigentliche Aktion nie blockieren. */
async function syncDiscordRoleForUser(userId: string, jobKey: string | null): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } }).catch(() => null);
  await syncCommunityJobDiscordRole(user?.discordId, jobKey).catch(() => {});
}

/** Fehler beim Benachrichtigen dürfen die eigentliche Aktion nie blockieren. */
function notifyJob(ruleKey: string, userId: string, jobKey: string, extra: Record<string, string> = {}): void {
  const label = getCommunityJob(jobKey)?.label ?? jobKey;
  dispatchNotification(ruleKey, { users: [userId], placeholders: { "{jobLabel}": label, ...extra } }).catch(() => {});
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
const CONTRACT_REMINDER_DAYS = 14;

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

// ── Status-Abfragen ──────────────────────────────────────────────────────────

export async function getActiveMembership(userId: string) {
  return prisma.communityJobMember.findFirst({
    where: { userId, status: { in: ["ACTIVE", "WARNED"] } },
    orderBy: { assignedAt: "desc" },
  });
}

export type ProfileJobBadge =
  | { employed: true; jobKey: string; jobLabel: string; jobEmoji: string; status: string; tierLabel: string | null; badgeLevel: number }
  | { employed: false; unemployedSinceMonths: number };

/**
 * Für die Profil-Hero-Section (eigenes UND fremde Profile): aktueller
 * Community-Job + letzte Gehaltsstufe, oder "Arbeitslos seit N Monaten".
 */
export async function getProfileJobBadge(userId: string): Promise<ProfileJobBadge> {
  const active = await getActiveMembership(userId);
  if (active) {
    const job = getCommunityJob(active.jobKey);
    const lastPayout = await prisma.communityJobWeeklyPayout.findFirst({
      where: { userId, jobKey: active.jobKey },
      orderBy: { weekStart: "desc" },
    });
    return {
      employed: true, jobKey: active.jobKey,
      jobLabel: job?.label ?? active.jobKey, jobEmoji: job?.emoji ?? "💼",
      status: active.status, tierLabel: lastPayout?.tierLabel ?? null, badgeLevel: active.badgeLevel,
    };
  }

  const lastEnded = await prisma.communityJobMember.findFirst({
    where: { userId, status: { in: ["REVOKED", "QUIT", "EXPIRED"] } },
    orderBy: [{ revokedAt: "desc" }],
  });
  const endDates = [lastEnded?.revokedAt, lastEnded?.contractEndAt].filter((d): d is Date => !!d);
  const since = endDates.length > 0
    ? new Date(Math.max(...endDates.map(d => d.getTime())))
    : (await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }))?.createdAt ?? new Date();

  const months = Math.max(0, Math.floor((Date.now() - since.getTime()) / (30 * 86_400_000)));
  return { employed: false, unemployedSinceMonths: months };
}

export interface CommunityJobCatalogEntry {
  key: string; label: string; emoji: string; description: string; officeGuideMarkdown: string;
  maxSlots: number; filledSlots: number;
  holders: { userId: string; username: string | null; status: string; lastPayoutCoins: number | null; availableUntil: string | null; specialties: string[] }[];
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
        // Nur solange die Verfügbarkeit ("Ich helfe gerade") noch läuft.
        availableUntil: m.availableUntil && m.availableUntil > new Date() ? m.availableUntil.toISOString() : null,
        specialties: m.specialties,
      };
    }));

    entries.push({
      key: job.key, label: job.label, emoji: job.emoji, description: job.description, officeGuideMarkdown: job.officeGuideMarkdown,
      maxSlots: job.maxSlots, filledSlots: members.length, holders, waitlistCount,
    });
  }
  return entries;
}

// ── Bewerbung ────────────────────────────────────────────────────────────────

export type ApplyResult = { ok: true; status: "ACTIVATED" | "WAITLISTED" } | { error: string };

/**
 * Bewerbungen auf Jobs mit freiem Slot werden automatisch angenommen — kein
 * Admin-Zwischenschritt mehr nötig (User-Entscheidung). Ist der Job voll,
 * landet die Bewerbung direkt auf der Warteliste, auch ohne PENDING-Status.
 * `reviewApplication`/die Admin-Bewerbungs-Queue bleiben als manuelles
 * Override-Werkzeug erhalten (z.B. für Sonderfälle), werden im Normalfall
 * aber nicht mehr gebraucht.
 */
export async function applyForJob(
  userId: string, jobKey: string, message?: string, opts: { adminTestBypass?: boolean } = {},
): Promise<ApplyResult> {
  if (!getCommunityJob(jobKey)) return { error: "Unbekannter Job" };
  const bypass = opts.adminTestBypass === true;

  if (!bypass) {
    const activeElsewhere = await getActiveMembership(userId);
    if (activeElsewhere) return { error: "Du übst bereits einen Community-Job aus" };
  } else {
    // Testmodus: bestehenden Job automatisch verlassen statt Fehler zu werfen — "kündigen und was anderes machen" in einem Schritt.
    const activeElsewhere = await getActiveMembership(userId);
    if (activeElsewhere && activeElsewhere.jobKey !== jobKey) await quitCommunityJob(userId);
  }

  const pending = await prisma.communityJobApplication.findFirst({
    where: { userId, jobKey, status: { in: ["PENDING", "WAITLISTED"] } },
  });
  if (pending) return { error: "Du hast dich für diesen Job bereits beworben" };

  if (!bypass) {
    const lastRevoked = await prisma.communityJobMember.findFirst({
      where: { userId, jobKey, status: "REVOKED" },
      orderBy: { revokedAt: "desc" },
    });
    if (lastRevoked?.reapplyBlockedUntil && lastRevoked.reapplyBlockedUntil > new Date()) {
      return { error: `Bewerbung erst wieder ab ${formatBerlinDate(lastRevoked.reapplyBlockedUntil)} möglich` };
    }
  }

  const maxSlots = bypass ? Infinity : await getMaxSlots(jobKey);
  const filled = await prisma.communityJobMember.count({
    where: { jobKey, status: { in: ["ACTIVE", "WARNED"] } },
  });

  const application = await prisma.communityJobApplication.create({
    data: { userId, jobKey, message, status: filled < maxSlots ? "PENDING" : "WAITLISTED" },
  });

  if (filled < maxSlots) {
    await activateApplication(application.id, userId, jobKey);
    notifyJob("community_job_approved", userId, jobKey);
    return { ok: true, status: "ACTIVATED" };
  }
  notifyJob("community_job_waitlisted", userId, jobKey);
  return { ok: true, status: "WAITLISTED" };
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
    notifyJob("community_job_rejected", app.userId, app.jobKey);
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
    notifyJob("community_job_approved", app.userId, app.jobKey);
    return { ok: true, result: "ACTIVATED" };
  }
  notifyJob("community_job_waitlisted", app.userId, app.jobKey);
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
  notifyJob("community_job_handoff_received", targetApp.userId, targetApp.jobKey);
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
  notifyJob("community_job_approved", targetApp.userId, jobKey);
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
  if (now < renewalOpensAt) return { error: `Verlängerung erst ab ${formatBerlinDate(renewalOpensAt)} möglich` };
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

/** Anteiliges Gehalt, falls die Mitgliedschaft mitten in der Woche begann — sonst unverändert. */
function prorateForMidWeekStart(coins: number, contractStartAt: Date, weekStart: Date, weekEnd: Date): number {
  if (coins <= 0 || contractStartAt <= weekStart) return coins;
  const totalMs = weekEnd.getTime() - weekStart.getTime();
  const workedMs = weekEnd.getTime() - contractStartAt.getTime();
  return Math.round(coins * Math.max(0, Math.min(1, workedMs / totalMs)));
}

export interface WeeklyPayoutOutcome {
  userId: string; jobKey: string; rawScore: number;
  tierLabel: string | null; baseCoins: number; ownVotes: number; voteBonusMultiplier: number; coinsAwarded: number;
}

export async function computeWeeklyPayout(
  member: { userId: string; jobKey: string; contractStartAt: Date },
  weekStart: Date, weekEnd: Date,
): Promise<WeeklyPayoutOutcome> {
  const rawScore = await computeRawScore(member.jobKey, member.userId, weekStart, weekEnd);
  const tiers = await getPayoutTiers(member.jobKey);
  const tier = resolveTier(tiers, rawScore);

  const baseCoins = prorateForMidWeekStart(tier?.coinsAwarded ?? 0, member.contractStartAt, weekStart, weekEnd);

  // Wird UNABHÄNGIG von baseCoins berechnet: bei baseCoins=0 ändert der
  // Multiplikator zwar nichts am ausgezahlten Betrag (0 × irgendwas = 0),
  // aber der gespeicherte/angezeigte Wert muss trotzdem die tatsächliche
  // Stufe zeigen (z.B. ×0.5 bei 0 eigenen Bewertungen) — sonst zeigt die UI
  // fälschlich immer ×1.0, sobald der Job-Inhaber diese Woche 0 Münzen
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
export async function getProjectedPayout(
  member: { userId: string; jobKey: string; contractStartAt: Date },
): Promise<ProjectedPayout> {
  const { weekStart, weekEnd } = getWeekBounds(new Date());
  const outcome = await computeWeeklyPayout(member, weekStart, weekEnd);

  const [tiers, bonusTiers] = await Promise.all([getPayoutTiers(member.jobKey), getVoteBonusTiers()]);
  const maxTierCoins = tiers.reduce((max, t) => Math.max(max, t.coinsAwarded), 0);
  const maxBonusMultiplier = bonusTiers.reduce((max, t) => Math.max(max, t.multiplier), 1);
  const maxBaseCoins = prorateForMidWeekStart(maxTierCoins, member.contractStartAt, weekStart, weekEnd);

  return {
    rawScore: outcome.rawScore, tierLabel: outcome.tierLabel, ownVotes: outcome.ownVotes,
    voteBonusMultiplier: outcome.voteBonusMultiplier, coinsAwarded: outcome.coinsAwarded,
    maxCoinsAwarded: Math.round(maxBaseCoins * maxBonusMultiplier),
  };
}

/**
 * Wöchentlicher Payout-Lauf: zahlt die zuletzt ABGESCHLOSSENE Woche vor
 * `referenceDate` aus (nicht die laufende — deren Bewertungen wären am Montag
 * früh noch fast leer). Idempotent — überspringt Mitglieder, für die diese
 * Woche schon eine Zeile existiert. Ein Fehler bei einem Mitglied bricht den
 * Lauf nicht ab, sondern wird gezählt und geloggt.
 */
export async function runWeeklyPayout(referenceDate: Date = new Date()): Promise<{ paid: number; skipped: number; failed: number }> {
  const { weekStart, weekEnd } = getWeekBounds(new Date(referenceDate.getTime() - 7 * 86_400_000));
  const members = await prisma.communityJobMember.findMany({
    where: { status: { in: ["ACTIVE", "WARNED"] }, contractStartAt: { lt: weekEnd } },
  });

  let paid = 0, skipped = 0, failed = 0;
  for (const member of members) {
    try {
      const existing = await prisma.communityJobWeeklyPayout.findUnique({
        where: { userId_jobKey_weekStart: { userId: member.userId, jobKey: member.jobKey, weekStart } },
      });
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
    } catch (err) {
      failed++;
      console.error(`[community-job-payout] Auszahlung fehlgeschlagen (User ${member.userId}, Job ${member.jobKey}):`, err);
    }
  }
  return { paid, skipped, failed };
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

/**
 * Inaktivitäts-Mahnung: keine Beiträge seit INACTIVITY_WARNING_DAYS → WARNED (falls noch nicht verwarnt).
 * Umgekehrt wird eine Verwarnung aufgehoben (→ ACTIVE), sobald das Mitglied nach der Verwarnung
 * wieder beigetragen hat — sonst bliebe "Verwarnt" bis Vertragsende bestehen und blockiert die Verlängerung.
 */
export async function runInactivityCheck(referenceDate: Date = new Date()): Promise<{ warned: number; recovered: number }> {
  const warnedMembers = await prisma.communityJobMember.findMany({
    where: { status: "WARNED", warnedAt: { not: null }, lastContributionAt: { not: null } },
  });
  const recoveredIds = warnedMembers
    .filter(m => m.lastContributionAt! > m.warnedAt!)
    .map(m => m.id);
  if (recoveredIds.length > 0) {
    await prisma.communityJobMember.updateMany({
      where: { id: { in: recoveredIds } },
      data: { status: "ACTIVE", warnedAt: null, warningReason: null },
    });
  }

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
    const reason = "Inaktivität: keine neuen Beiträge";
    await prisma.communityJobMember.update({
      where: { id: m.id },
      data: { status: "WARNED", warnedAt: referenceDate, warningReason: reason },
    });
    notifyJob("community_job_warned", m.userId, m.jobKey, { "{reason}": reason });
  }
  return { warned: candidates.length, recovered: recoveredIds.length };
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
  notifyJob("community_job_revoked", member.userId, member.jobKey, { "{reason}": reason });
  return { ok: true };
}

/** Von Hand verwarnen (z.B. nach Regelverstoß). Die Verwarnung hebt sich wie die automatische auf, sobald wieder beigetragen wird. */
export async function adminWarnMember(memberId: string, reason: string): Promise<{ ok: true } | { error: string }> {
  const member = await prisma.communityJobMember.findUnique({ where: { id: memberId } });
  if (!member || !["ACTIVE", "WARNED"].includes(member.status)) return { error: "Aktive Mitgliedschaft nicht gefunden" };
  const clean = reason.trim().slice(0, 300);
  if (!clean) return { error: "Grund erforderlich" };
  await prisma.communityJobMember.update({
    where: { id: memberId }, data: { status: "WARNED", warnedAt: new Date(), warningReason: clean },
  });
  notifyJob("community_job_warned", member.userId, member.jobKey, { "{reason}": clean });
  return { ok: true };
}

/** Vertragsende verschieben (`days` positiv = verlängern, negativ = kürzen). Ein sofortiges Ende ist der Job-Entzug. */
export async function adminAdjustContract(memberId: string, days: number, reason: string): Promise<{ ok: true; contractEndAt: Date } | { error: string }> {
  if (!Number.isInteger(days) || days === 0 || days < -90 || days > 180) return { error: "Tage müssen zwischen -90 und 180 liegen (nicht 0)" };
  const member = await prisma.communityJobMember.findUnique({ where: { id: memberId } });
  if (!member || !["ACTIVE", "WARNED"].includes(member.status)) return { error: "Aktive Mitgliedschaft nicht gefunden" };
  const next = addDays(member.contractEndAt, days);
  if (next.getTime() < Date.now() + 86_400_000) return { error: "Der Vertrag würde sofort enden — bitte stattdessen den Job entziehen" };
  await prisma.communityJobMember.update({ where: { id: memberId }, data: { contractEndAt: next } });
  const label = getCommunityJob(member.jobKey)?.label ?? member.jobKey;
  dispatchNotification("community_job_contract_adjusted", {
    users: [member.userId],
    placeholders: { "{jobLabel}": label, "{date}": next.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }), "{reason}": reason.trim().slice(0, 200) },
  }).catch(() => {});
  return { ok: true, contractEndAt: next };
}

/** Ansehens-Stufe (1–4) von Hand setzen; der Wochen-Cron lässt sie danach 28 Tage unverändert. */
export async function adminSetBadgeLevel(memberId: string, level: number): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(level) || level < 1 || level > 4) return { error: "Stufe muss zwischen 1 und 4 liegen" };
  const member = await prisma.communityJobMember.findUnique({ where: { id: memberId } });
  if (!member || !["ACTIVE", "WARNED"].includes(member.status)) return { error: "Aktive Mitgliedschaft nicht gefunden" };
  await prisma.communityJobMember.update({
    where: { id: memberId },
    data: { badgeLevel: level, peakBadgeLevel: Math.max(member.peakBadgeLevel, level), badgeOverrideUntil: addDays(new Date(), 28) },
  });
  return { ok: true };
}

/**
 * Erinnerung, wenn der Vertrag in den nächsten CONTRACT_REMINDER_DAYS abläuft und
 * noch nicht verlängert wurde. Läuft täglich, sendet aber nur einmal (nutzt
 * `renewedAt` als Marker: wurde seit der letzten Erinnerung nicht verlängert,
 * würde ohne Deckelung jeden Tag erneut benachrichtigt — daher nur am Tag, an
 * dem das Erinnerungsfenster beginnt).
 */
export async function runContractReminderCheck(referenceDate: Date = new Date()): Promise<{ reminded: number }> {
  const windowStart = addDays(referenceDate, CONTRACT_REMINDER_DAYS);
  const windowEnd = addDays(referenceDate, CONTRACT_REMINDER_DAYS + 1);
  const members = await prisma.communityJobMember.findMany({
    where: { status: "ACTIVE", contractEndAt: { gte: windowStart, lt: windowEnd } },
  });
  for (const m of members) {
    notifyJob("community_job_contract_expiring", m.userId, m.jobKey, {
      "{contractEndDate}": formatBerlinDate(m.contractEndAt),
    });
  }
  return { reminded: members.length };
}

// ── Badges (Ansehens-Stufe hinter dem Usernamen) ─────────────────────────────

/**
 * Berechnet für alle aktiven Inhaber die Ansehens-Stufe neu: Wochenpunkte der letzten
 * BADGE_WINDOW_WEEKS Wochen (aus der erreichten Gehaltsstufe, siehe weeklyBadgePoints) → Stufe 1–4.
 * Die Stufe kann steigen UND sinken; `peakBadgeLevel` merkt sich die höchste der Amtszeit (für das
 * "Ehem."-Zeichen). Läuft im täglichen Payout-Cron NACH dem Wochen-Payout.
 */
export async function runBadgeLevelUpdate(referenceDate: Date = new Date()): Promise<{ updated: number }> {
  const since = new Date(referenceDate.getTime() - BADGE_WINDOW_WEEKS * 7 * 86_400_000);
  const members = await prisma.communityJobMember.findMany({ where: { status: { in: ["ACTIVE", "WARNED"] } } });
  const tiersByJob = new Map<string, Awaited<ReturnType<typeof getPayoutTiers>>>();

  let updated = 0;
  for (const m of members) {
    if (m.badgeOverrideUntil && m.badgeOverrideUntil > referenceDate) continue; // vom Team von Hand gesetzt
    if (!tiersByJob.has(m.jobKey)) tiersByJob.set(m.jobKey, await getPayoutTiers(m.jobKey));
    const tiers = [...(tiersByJob.get(m.jobKey) ?? [])].sort((a, b) => a.minScore - b.minScore);

    const payouts = await prisma.communityJobWeeklyPayout.findMany({
      where: { userId: m.userId, jobKey: m.jobKey, weekStart: { gte: since } },
      select: { rawScore: true },
    });
    const points = payouts.reduce((sum, p) => {
      const tier = resolveTier(tiers, p.rawScore);
      return sum + weeklyBadgePoints(tier ? tiers.indexOf(tier) + 1 : 0, tiers.length);
    }, 0);

    const level = levelFromPoints(points);
    const peak = Math.max(m.peakBadgeLevel, level);
    if (level !== m.badgeLevel || peak !== m.peakBadgeLevel) {
      await prisma.communityJobMember.update({ where: { id: m.id }, data: { badgeLevel: level, peakBadgeLevel: peak } });
      updated++;
    }
  }
  return { updated };
}

/**
 * Badge-Daten für viele Nutzer auf einmal: aktueller Job (mit Stufe, ggf. verwarnt).
 * Nutzer ohne Job fehlen im Ergebnis (= arbeitslos).
 */
export async function getJobBadges(userIds: string[]): Promise<Record<string, JobBadgeData>> {
  const ids = [...new Set(userIds)].slice(0, 200);
  const result: Record<string, JobBadgeData> = {};
  if (ids.length === 0) return result;

  const active = await prisma.communityJobMember.findMany({
    where: { userId: { in: ids }, status: { in: ["ACTIVE", "WARNED"] } },
    orderBy: { assignedAt: "asc" }, // spätere (jüngste) Amtszeit überschreibt
    select: { userId: true, jobKey: true, badgeLevel: true, status: true },
  });
  for (const m of active) {
    result[m.userId] = { jobKey: m.jobKey, level: m.badgeLevel, ...(m.status === "WARNED" ? { warned: true } : {}) };
  }

  return result;
}

import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import { getRank } from "./ranks";
import { loadMancaveTiers, surfaceTierFrom } from "./mancave-economy";
import { getEffectiveJobs } from "./job-config";
import {
  JOBS_ENABLED, WAGE_CAP_HOURS, WAGE_MULTIPLIER_PCT, HIRE_LOCK_HOURS, MIN_CLAIM_MINUTES,
  computeAccrual, formatDuration, jobUnlockState, type JobDef,
} from "./jobs";

/**
 * Idle-Jobs, Server-Seite.
 *
 * Der Lohn wird FAUL berechnet: es gibt keinen Cron, der nachts Münzen verteilt.
 * Stattdessen rechnet computeAccrual() beim Lesen und beim Abholen dieselbe
 * reine Funktion, die auch der Client für den Ticker nutzt — was angezeigt
 * wird, ist exakt das, was ausgezahlt wird.
 */

type TxClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface JobContext {
  rankTier: number;
  roomTier: number;
  job:      JobDef | null;
  /** Katalog MIT Admin-Overrides (Lohn/Mindest-Mancave-Stufe), siehe job-config.ts. */
  effectiveJobs: JobDef[];
  jobMap:   Map<string, JobDef>;
  row: {
    jobKey: string | null; hiredAt: Date | null; accrualFrom: Date | null;
    lastClaimAt: Date | null; totalEarned: number; hireLockedUntil: Date | null;
  } | null;
}

/** Alles, was für jede Job-Entscheidung gebraucht wird — in einem Rutsch. */
async function loadContext(userId: string): Promise<JobContext> {
  const [user, row, mancaveTiers, effectiveJobs] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }),
    prisma.userJob.findUnique({ where: { userId } }).catch(() => null),
    loadMancaveTiers(userId),
    getEffectiveJobs(),
  ]);
  const jobMap = new Map(effectiveJobs.map(j => [j.key, j]));

  return {
    rankTier: getRank(user?.rankPoints ?? 0).tier,
    roomTier: surfaceTierFrom(mancaveTiers),
    job:      row?.jobKey ? jobMap.get(row.jobKey) ?? null : null,
    effectiveJobs,
    jobMap,
    row:      row ?? null,
  };
}

// ── Übersicht für die Jobbörse ───────────────────────────────────────────────

export interface JobListEntry {
  key: string; label: string; emoji: string; flavor: string;
  minTier: number; minRoomTier: number; coinsPerHour: number; accent: JobDef["accent"];
  rankOk: boolean; roomTierOk: boolean; unlocked: boolean; isCurrent: boolean;
}

export interface CurrentJob {
  jobKey: string; label: string; emoji: string; coinsPerHour: number;
  hiredAt: string | null; accrualFrom: string | null; lastClaimAt: string | null;
  hireLockedUntil: string | null;
  accruedCoins: number; workedMinutes: number; capped: boolean;
}

export interface JobOverview {
  enabled: boolean;
  wageCapHours: number;
  wageMultiplierPct: number;
  minClaimMinutes: number;
  /** Gesamt-Mancave-Stufe des Users (1-4) — schaltet Jobs frei, siehe jobs.ts. */
  roomTier: number;
  current: CurrentJob | null;
  jobs: JobListEntry[];
}

export async function getJobOverview(userId: string): Promise<JobOverview> {
  const ctx = await loadContext(userId);
  const now = Date.now();

  const current: CurrentJob | null = ctx.job && ctx.row?.accrualFrom
    ? (() => {
        const accrual = computeAccrual(ctx.job!, ctx.row!.accrualFrom!, now, {
          wageCapHours:  WAGE_CAP_HOURS,
          multiplierPct: WAGE_MULTIPLIER_PCT,
        });
        return {
          jobKey: ctx.job!.key, label: ctx.job!.label, emoji: ctx.job!.emoji,
          coinsPerHour:    ctx.job!.coinsPerHour,
          hiredAt:         ctx.row!.hiredAt?.toISOString() ?? null,
          accrualFrom:     ctx.row!.accrualFrom!.toISOString(),
          lastClaimAt:     ctx.row!.lastClaimAt?.toISOString() ?? null,
          hireLockedUntil: ctx.row!.hireLockedUntil?.toISOString() ?? null,
          accruedCoins:    accrual.coins,
          workedMinutes:   accrual.workedMinutes,
          capped:          accrual.capped,
        };
      })()
    : null;

  const jobs: JobListEntry[] = ctx.effectiveJobs.map(job => {
    const st = jobUnlockState(job, ctx.rankTier, ctx.roomTier);
    return {
      key: job.key, label: job.label, emoji: job.emoji, flavor: job.flavor,
      minTier: job.minTier, minRoomTier: job.minRoomTier, coinsPerHour: job.coinsPerHour, accent: job.accent,
      rankOk:     st.rankOk,
      roomTierOk: st.roomTierOk,
      unlocked:   st.unlocked,
      isCurrent:  ctx.job?.key === job.key,
    };
  });

  return {
    enabled:           JOBS_ENABLED,
    wageCapHours:      WAGE_CAP_HOURS,
    wageMultiplierPct: WAGE_MULTIPLIER_PCT,
    minClaimMinutes:   MIN_CLAIM_MINUTES,
    roomTier:          ctx.roomTier,
    current,
    jobs,
  };
}

// ── Abrechnung ───────────────────────────────────────────────────────────────

/**
 * Bucht den aufgelaufenen Lohn innerhalb einer laufenden Transaktion.
 * Gibt zurück, wie viele Münzen tatsächlich geflossen sind (0 = nichts fällig).
 */
async function payOut(
  tx: TxClient, userId: string, job: JobDef, accrualFrom: Date, now: Date,
): Promise<number> {
  const accrual = computeAccrual(job, accrualFrom, now, {
    wageCapHours:  WAGE_CAP_HOURS,
    multiplierPct: WAGE_MULTIPLIER_PCT,
  });
  if (accrual.coins <= 0) return 0;

  await tx.user.update({ where: { id: userId }, data: { points: { increment: accrual.coins } } });
  await tx.pointTransaction.create({
    data: {
      userId, amount: accrual.coins,
      reason: `${COIN_PREFIX} Lohn: ${job.label} (${formatDuration(accrual.countedMinutes)})`,
    },
  });
  return accrual.coins;
}

export type ClaimResult =
  | { ok: true; coins: number; countedMinutes: number; points: number; fired?: string }
  | { error: string };

export async function claimWage(userId: string): Promise<ClaimResult> {
  const ctx = await loadContext(userId);
  if (!JOBS_ENABLED)                     return { error: "Idle-Jobs sind gerade deaktiviert" };
  if (!ctx.job || !ctx.row?.accrualFrom) return { error: "Du hast gerade keinen Job" };

  const now     = new Date();
  const job     = ctx.job;
  const accrual = computeAccrual(job, ctx.row.accrualFrom, now, {
    wageCapHours:  WAGE_CAP_HOURS,
    multiplierPct: WAGE_MULTIPLIER_PCT,
  });

  if (accrual.countedMinutes < MIN_CLAIM_MINUTES) {
    return { error: `Noch zu früh — lass ihn mindestens ${MIN_CLAIM_MINUTES} Minuten arbeiten` };
  }

  // ── Absicherung ──────────────────────────────────────────────────────
  // Die Mancave-Stufe kann nur sinken, wenn Items downgegradet werden (im
  // Dev-Free-Modus jederzeit möglich) — dann verfällt der Job. Der bereits
  // verdiente Lohn wird trotzdem voll ausgezahlt, die Arbeit ist ja passiert.
  const st     = jobUnlockState(job, ctx.rankTier, ctx.roomTier);
  const fired  = !st.roomTierOk
    ? "Du wurdest gefeuert: deine Mancave-Stufe reicht für diese Stelle nicht mehr"
    : !st.rankOk
      ? "Du wurdest gefeuert: dein Rang reicht für diese Stelle nicht mehr"
      : null;

  const points = await prisma.$transaction(async tx => {
    const coins = await payOut(tx, userId, job, ctx.row!.accrualFrom!, now);
    await tx.userJob.update({
      where: { userId },
      data: {
        accrualFrom: now,
        lastClaimAt: now,
        totalEarned: { increment: coins },
        ...(fired ? { jobKey: null, hiredAt: null, accrualFrom: null } : {}),
      },
    });
    const u = await tx.user.findUnique({ where: { id: userId }, select: { points: true } });
    return u?.points ?? 0;
  });

  return {
    ok: true,
    coins: accrual.coins,
    countedMinutes: accrual.countedMinutes,
    points,
    ...(fired ? { fired } : {}),
  };
}

// ── Bewerben ─────────────────────────────────────────────────────────────────

export type HireResult =
  | { ok: true; jobKey: string; label: string; autoClaimed: number }
  | { error: string };

export async function hireJob(userId: string, jobKey: string): Promise<HireResult> {
  const ctx = await loadContext(userId);
  if (!JOBS_ENABLED) return { error: "Idle-Jobs sind gerade deaktiviert" };

  const job = ctx.jobMap.get(jobKey) ?? null;
  if (!job) return { error: "Unbekannter Job" };
  if (ctx.job?.key === job.key) return { error: "Da arbeitest du schon" };

  const st = jobUnlockState(job, ctx.rankTier, ctx.roomTier);
  if (!st.rankOk)     return { error: "Dafür reicht dein Rang noch nicht" };
  if (!st.roomTierOk) return { error: `Dafür braucht deine Mancave mindestens Stufe ${job.minRoomTier}` };

  const now = new Date();
  if (ctx.row?.hireLockedUntil && ctx.row.hireLockedUntil > now) {
    const restMin = Math.ceil((ctx.row.hireLockedUntil.getTime() - now.getTime()) / 60_000);
    return { error: `Du hast gerade erst angefangen — Wechsel möglich in ${formatDuration(restMin)}` };
  }

  const lockedUntil = new Date(now.getTime() + HIRE_LOCK_HOURS * 3_600_000);

  const autoClaimed = await prisma.$transaction(async tx => {
    // Wer wechselt, verliert nichts: der bis hierhin verdiente Lohn wird
    // in derselben Transaktion abgerechnet.
    let coins = 0;
    if (ctx.job && ctx.row?.accrualFrom) {
      coins = await payOut(tx, userId, ctx.job, ctx.row.accrualFrom, now);
    }

    await tx.userJob.upsert({
      where:  { userId },
      create: {
        userId, jobKey: job.key, hiredAt: now, accrualFrom: now,
        totalEarned: coins, hireLockedUntil: lockedUntil,
      },
      update: {
        jobKey: job.key, hiredAt: now, accrualFrom: now,
        totalEarned: { increment: coins }, hireLockedUntil: lockedUntil,
        ...(coins > 0 ? { lastClaimAt: now } : {}),
      },
    });
    return coins;
  });

  return { ok: true, jobKey: job.key, label: job.label, autoClaimed };
}

// ── Kündigen ─────────────────────────────────────────────────────────────────

export type QuitResult = { ok: true; paidOut: number } | { error: string };

/**
 * Kündigen ist jederzeit erlaubt und zahlt immer aus. Es setzt bewusst KEINE
 * zweite Sperre — die Wechselsperre nach der Einstellung reicht, und der
 * Lohn-Deckel verhindert ohnehin, dass sich Schichten stapeln lassen.
 */
export async function quitJob(userId: string): Promise<QuitResult> {
  const ctx = await loadContext(userId);
  if (!ctx.job || !ctx.row?.accrualFrom) return { error: "Du hast gerade keinen Job" };

  const now = new Date();
  const job = ctx.job;

  const paidOut = await prisma.$transaction(async tx => {
    const coins = await payOut(tx, userId, job, ctx.row!.accrualFrom!, now);
    await tx.userJob.update({
      where: { userId },
      data: {
        jobKey: null, hiredAt: null, accrualFrom: null,
        totalEarned: { increment: coins },
        ...(coins > 0 ? { lastClaimAt: now } : {}),
      },
    });
    return coins;
  });

  return { ok: true, paidOut };
}

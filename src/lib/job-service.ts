import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import { getRank } from "./ranks";
import { getRoomConfig, type RoomConfig } from "./room-config";
import { loadRoom } from "./room";
import { countTags } from "./room-layout";
import type { RoomTag } from "./room-items";
import {
  JOBS, MIN_CLAIM_MINUTES, checkRequirements, computeAccrual, formatDuration,
  formatMissing, getJob, jobUnlockState, type JobDef,
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
  cfg:      RoomConfig;
  rankTier: number;
  tags:     Partial<Record<RoomTag, number>>;
  job:      JobDef | null;
  row: {
    jobKey: string | null; hiredAt: Date | null; accrualFrom: Date | null;
    lastClaimAt: Date | null; totalEarned: number; hireLockedUntil: Date | null;
  } | null;
}

/** Alles, was für jede Job-Entscheidung gebraucht wird — in einem Rutsch. */
async function loadContext(userId: string): Promise<JobContext> {
  const [cfg, user, row, room] = await Promise.all([
    getRoomConfig(),
    prisma.user.findUnique({ where: { id: userId }, select: { rankPoints: true } }),
    prisma.userJob.findUnique({ where: { userId } }).catch(() => null),
    loadRoom(userId),
  ]);

  return {
    cfg,
    rankTier: getRank(user?.rankPoints ?? 0).tier,
    tags:     countTags(room.placed),
    job:      getJob(row?.jobKey),
    row:      row ?? null,
  };
}

// ── Übersicht für die Jobbörse ───────────────────────────────────────────────

export interface JobListEntry {
  key: string; label: string; emoji: string; flavor: string;
  minTier: number; coinsPerHour: number; accent: JobDef["accent"];
  requirements: { tag: RoomTag; label: string; need: number; have: number }[];
  rankOk: boolean; setupOk: boolean; unlocked: boolean; isCurrent: boolean;
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
  current: CurrentJob | null;
  jobs: JobListEntry[];
}

export async function getJobOverview(userId: string): Promise<JobOverview> {
  const ctx = await loadContext(userId);
  const now = Date.now();

  const current: CurrentJob | null = ctx.job && ctx.row?.accrualFrom
    ? (() => {
        const accrual = computeAccrual(ctx.job!, ctx.row!.accrualFrom!, now, {
          wageCapHours:  ctx.cfg.wageCapHours,
          multiplierPct: ctx.cfg.wageMultiplierPct,
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

  const jobs: JobListEntry[] = JOBS.map(job => {
    const st = jobUnlockState(job, ctx.rankTier, ctx.tags);
    return {
      key: job.key, label: job.label, emoji: job.emoji, flavor: job.flavor,
      minTier: job.minTier, coinsPerHour: job.coinsPerHour, accent: job.accent,
      requirements: job.requirements.map(req => ({
        tag:   req.tag,
        label: ROOM_TAG_LABELS[req.tag],
        need:  req.count,
        have:  ctx.tags[req.tag] ?? 0,
      })),
      rankOk:    st.rankOk,
      setupOk:   st.setupOk,
      unlocked:  st.unlocked,
      isCurrent: ctx.job?.key === job.key,
    };
  });

  return {
    enabled:           ctx.cfg.jobsEnabled,
    wageCapHours:      ctx.cfg.wageCapHours,
    wageMultiplierPct: ctx.cfg.wageMultiplierPct,
    minClaimMinutes:   MIN_CLAIM_MINUTES,
    current,
    jobs,
  };
}

// Kleiner Umweg, damit die Label-Auflösung an einer Stelle bleibt.
import { ROOM_TAG_LABELS } from "./room-items";
function ROOM_TAG_LABEL(tag: RoomTag): string {
  return ROOM_TAG_LABELS[tag];
}

// ── Abrechnung ───────────────────────────────────────────────────────────────

/**
 * Bucht den aufgelaufenen Lohn innerhalb einer laufenden Transaktion.
 * Gibt zurück, wie viele Münzen tatsächlich geflossen sind (0 = nichts fällig).
 */
async function payOut(
  tx: TxClient, userId: string, job: JobDef, accrualFrom: Date, cfg: RoomConfig, now: Date,
): Promise<number> {
  const accrual = computeAccrual(job, accrualFrom, now, {
    wageCapHours:  cfg.wageCapHours,
    multiplierPct: cfg.wageMultiplierPct,
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
  if (!ctx.cfg.jobsEnabled)              return { error: "Idle-Jobs sind gerade deaktiviert" };
  if (!ctx.job || !ctx.row?.accrualFrom) return { error: "Du hast gerade keinen Job" };

  const now     = new Date();
  const job     = ctx.job;
  const accrual = computeAccrual(job, ctx.row.accrualFrom, now, {
    wageCapHours:  ctx.cfg.wageCapHours,
    multiplierPct: ctx.cfg.wageMultiplierPct,
  });

  if (accrual.countedMinutes < MIN_CLAIM_MINUTES) {
    return { error: `Noch zu früh — lass ihn mindestens ${MIN_CLAIM_MINUTES} Minuten arbeiten` };
  }

  // ── Absicherung ──────────────────────────────────────────────────────
  // Job-relevante Möbel lassen sich gar nicht erst einlagern, das kann also
  // nur noch durch eine Katalog-Umbalancierung oder eine Admin-Korrektur der
  // Rangpunkte eintreten. Dann wird der bereits verdiente Lohn trotzdem voll
  // ausgezahlt — die Arbeit ist ja passiert — und danach die Stelle frei.
  const { met, missing } = checkRequirements(job, ctx.tags);
  const rankOk = ctx.rankTier >= job.minTier;
  const fired  = !met
    ? `Du wurdest gefeuert: dein Setup erfüllt die Anforderungen nicht mehr (${formatMissing(missing)})`
    : !rankOk
      ? "Du wurdest gefeuert: dein Rang reicht für diese Stelle nicht mehr"
      : null;

  const points = await prisma.$transaction(async tx => {
    const coins = await payOut(tx, userId, job, ctx.row!.accrualFrom!, ctx.cfg, now);
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
  if (!ctx.cfg.jobsEnabled) return { error: "Idle-Jobs sind gerade deaktiviert" };

  const job = getJob(jobKey);
  if (!job) return { error: "Unbekannter Job" };
  if (ctx.job?.key === job.key) return { error: "Da arbeitest du schon" };

  const st = jobUnlockState(job, ctx.rankTier, ctx.tags);
  if (!st.rankOk)  return { error: "Dafür reicht dein Rang noch nicht" };
  if (!st.setupOk) {
    return { error: `Dein Setup erfüllt die Anforderungen nicht: ${formatMissing(st.missing)}` };
  }

  const now = new Date();
  if (ctx.row?.hireLockedUntil && ctx.row.hireLockedUntil > now) {
    const restMin = Math.ceil((ctx.row.hireLockedUntil.getTime() - now.getTime()) / 60_000);
    return { error: `Du hast gerade erst angefangen — Wechsel möglich in ${formatDuration(restMin)}` };
  }

  const lockedUntil = new Date(now.getTime() + ctx.cfg.hireLockHours * 3_600_000);

  const autoClaimed = await prisma.$transaction(async tx => {
    // Wer wechselt, verliert nichts: der bis hierhin verdiente Lohn wird
    // in derselben Transaktion abgerechnet.
    let coins = 0;
    if (ctx.job && ctx.row?.accrualFrom) {
      coins = await payOut(tx, userId, ctx.job, ctx.row.accrualFrom, ctx.cfg, now);
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
    const coins = await payOut(tx, userId, job, ctx.row!.accrualFrom!, ctx.cfg, now);
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

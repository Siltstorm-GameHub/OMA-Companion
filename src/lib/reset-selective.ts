import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { APP_ERA_START_KEY } from "@/lib/app-era";
import { recomputeWanderpocalHolders } from "@/lib/recompute-wanderpocal";
import { syncReputationRoleForUser } from "@/lib/community-job-service";
import { getBerlinDateParts } from "@/lib/time";
import {
  expandToSeasonGroups, mergeTotals, rankPointsFromEventCompletion, rankPointsFromSeriesCompletion,
  type RankTotals,
} from "@/lib/reset-ledger";

// ── Selektiver Reset (Neustart auf v1.0) ────────────────────────────────────
// Der Admin wählt Eventreihen, die fortgeführt werden (immer mit ALLEN Saisons ihrer Gruppe), und
// ein Datum. Der tägliche Cron (/api/cron/app-reset) führt den Reset in der Nacht dieses Datums aus.
//
// Bleibt erhalten: bewahrte Reihen samt Events, Tabellen, Statistiken, Pokalen und LuL-Saisons;
// alle Events, die erst NACH dem Reset-Zeitpunkt beginnen; Clips/Contests, Ideen-Board, Posts und
// Berichte, Squads.
// Wird zurückgesetzt: Münzen (0), Rang-Punkte (= Summe aus den bewahrten Reihen), Punktehistorie,
// alle übrigen bereits begonnenen Events und Reihen, Pokale, LuL, Quests, Tipps, Minigames
// (Blocks), Shop-Inventar, Community-Job-Auszahlungen und Ansehen, Voice-/Nachrichten-
// Zähler, Ranglisten-Snapshots, In-App-Benachrichtigungen. Danach: Wanderpokale neu berechnen.

const SCHEDULE_KEY = "app_reset_schedule";
const RANK_TRANSFER_REASON = "[Rang-Punkte] Übernahme aus fortgeführten Reihen (Neustart v1.0)";

export type ResetSummary = {
  keptSeriesCount: number;
  deletedSeriesCount: number;
  resetSeriesCount: number;
  deletedEventCount: number;
  keptFutureEventCount: number;
  usersWithRankPoints: number;
  totalRankPoints: number;
};

export type ResetSchedule = {
  status: "scheduled" | "running" | "done" | "failed";
  scheduledFor: string; // YYYY-MM-DD (Berlin)
  keepSeriesIds: string[];
  scheduledAt: string;
  scheduledById: string | null;
  startedAt?: string;
  finishedAt?: string;
  result?: ResetSummary;
  error?: string;
};

export type ResetPreview = ResetSummary & {
  keptSeries: { id: string; name: string; seasonNumber: number | null }[];
  resetSeries: { id: string; name: string; futureEvents: number }[];
  topUsers: { userId: string; name: string; rankPoints: number }[];
};

// ── Planung ─────────────────────────────────────────────────────────────────

export async function getResetSchedule(): Promise<ResetSchedule | null> {
  const row = await prisma.botConfig.findUnique({ where: { key: SCHEDULE_KEY } }).catch(() => null);
  if (!row) return null;
  try { return JSON.parse(row.value) as ResetSchedule; } catch { return null; }
}

async function saveSchedule(s: ResetSchedule) {
  const value = JSON.stringify(s);
  await prisma.botConfig.upsert({ where: { key: SCHEDULE_KEY }, update: { value }, create: { key: SCHEDULE_KEY, value } });
}

export function berlinToday(now: Date = new Date()): string {
  const { year, month, day } = getBerlinDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function scheduleReset(date: string, keepSeriesIds: string[], userId: string): Promise<ResetSchedule> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ungültiges Datum");
  if (date <= berlinToday()) throw new Error("Das Datum muss frühestens morgen sein (der Reset läuft nachts um ca. 4 Uhr).");
  const current = await getResetSchedule();
  if (current?.status === "running") throw new Error("Ein Reset läuft gerade.");
  const existing = new Set((await prisma.eventSeries.findMany({ select: { id: true } })).map(s => s.id));
  const schedule: ResetSchedule = {
    status: "scheduled",
    scheduledFor: date,
    keepSeriesIds: keepSeriesIds.filter(id => existing.has(id)),
    scheduledAt: new Date().toISOString(),
    scheduledById: userId,
  };
  await saveSchedule(schedule);
  return schedule;
}

export async function cancelReset(): Promise<void> {
  const current = await getResetSchedule();
  if (current?.status === "running") throw new Error("Ein Reset läuft gerade und kann nicht mehr abgebrochen werden.");
  if (current?.status === "scheduled") await prisma.botConfig.delete({ where: { key: SCHEDULE_KEY } });
}

// ── Plan: was bleibt, was geht ──────────────────────────────────────────────

type ResetPlan = {
  keptSeriesIds: string[];
  deleteSeriesIds: string[];
  resetSeriesIds: string[];
  deleteEventIds: string[];
  keptEventIds: string[];
  keptFutureEventCount: number;
  rankPoints: RankTotals;
};

async function buildPlan(selectedIds: string[], cutoff: Date): Promise<ResetPlan> {
  const allSeries = await prisma.eventSeries.findMany({
    select: { id: true, groupId: true, seriesStatConfig: true, seriesCompletionData: true },
  });
  const keptSeriesIds = expandToSeasonGroups(selectedIds, allSeries);
  const kept = new Set(keptSeriesIds);

  const events = await prisma.event.findMany({
    select: { id: true, seriesId: true, startAt: true },
  });
  const deleteEventIds: string[] = [];
  const keptEventIds: string[] = [];
  const survivingSeries = new Set<string>();
  let keptFutureEventCount = 0;
  for (const ev of events) {
    if (ev.seriesId && kept.has(ev.seriesId)) { keptEventIds.push(ev.id); continue; }
    if (ev.startAt >= cutoff) {
      keptFutureEventCount++;
      if (ev.seriesId) survivingSeries.add(ev.seriesId);
      continue;
    }
    deleteEventIds.push(ev.id);
  }
  const notKept = allSeries.filter(s => !kept.has(s.id));
  const resetSeriesIds = notKept.filter(s => survivingSeries.has(s.id)).map(s => s.id);
  const deleteSeriesIds = notKept.filter(s => !survivingSeries.has(s.id)).map(s => s.id);

  // Rang-Punkte der bewahrten Reihen aus den Abschluss-Ledgern
  const rankPoints: RankTotals = {};
  const keptSeries = allSeries.filter(s => kept.has(s.id));
  const keptEvents = keptSeriesIds.length === 0 ? [] : await prisma.event.findMany({
    where: { seriesId: { in: keptSeriesIds }, completionData: { not: null } },
    select: { seriesId: true, completionData: true, registrations: { select: { userId: true, role: true } } },
  });
  const transfers = new Map(keptSeries.map(s => {
    try { return [s.id, !!(s.seriesStatConfig && JSON.parse(s.seriesStatConfig)?.transferToGlobalRanking)] as const; }
    catch { return [s.id, false] as const; }
  }));
  for (const ev of keptEvents) {
    mergeTotals(rankPoints, rankPointsFromEventCompletion(ev.completionData, ev.registrations, transfers.get(ev.seriesId!) ?? false));
  }
  for (const s of keptSeries) mergeTotals(rankPoints, rankPointsFromSeriesCompletion(s.seriesCompletionData));

  // Nur existierende User mit positivem Saldo (Korrekturen können einzelne Werte ins Minus drücken)
  const existingUsers = new Set((await prisma.user.findMany({
    where: { id: { in: Object.keys(rankPoints) } }, select: { id: true },
  })).map(u => u.id));
  for (const [userId, pts] of Object.entries(rankPoints)) {
    if (!existingUsers.has(userId) || pts <= 0) delete rankPoints[userId];
  }

  return { keptSeriesIds, deleteSeriesIds, resetSeriesIds, deleteEventIds, keptEventIds, keptFutureEventCount, rankPoints };
}

function summarize(plan: ResetPlan): ResetSummary {
  return {
    keptSeriesCount: plan.keptSeriesIds.length,
    deletedSeriesCount: plan.deleteSeriesIds.length,
    resetSeriesCount: plan.resetSeriesIds.length,
    deletedEventCount: plan.deleteEventIds.length,
    keptFutureEventCount: plan.keptFutureEventCount,
    usersWithRankPoints: Object.keys(plan.rankPoints).length,
    totalRankPoints: Object.values(plan.rankPoints).reduce((a, b) => a + b, 0),
  };
}

/** Vorschau ohne Schreiben — gerechnet mit "jetzt" als Stichtag; der echte Lauf nimmt seinen eigenen Zeitpunkt. */
export async function previewReset(selectedIds: string[]): Promise<ResetPreview> {
  const plan = await buildPlan(selectedIds, new Date());
  const [keptSeries, resetSeries] = await Promise.all([
    prisma.eventSeries.findMany({
      where: { id: { in: plan.keptSeriesIds } },
      select: { id: true, name: true, seasonNumber: true },
      orderBy: [{ name: "asc" }, { seasonNumber: "asc" }],
    }),
    prisma.eventSeries.findMany({
      where: { id: { in: plan.resetSeriesIds } },
      select: { id: true, name: true, _count: { select: { events: { where: { startAt: { gte: new Date() } } } } } },
    }),
  ]);
  const top = Object.entries(plan.rankPoints).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const users = await prisma.user.findMany({
    where: { id: { in: top.map(([id]) => id) } }, select: { id: true, name: true, username: true },
  });
  const nameOf = new Map(users.map(u => [u.id, u.name ?? u.username ?? "?"]));
  return {
    ...summarize(plan),
    keptSeries,
    resetSeries: resetSeries.map(s => ({ id: s.id, name: s.name, futureEvents: s._count.events })),
    topUsers: top.map(([userId, rankPoints]) => ({ userId, name: nameOf.get(userId) ?? "?", rankPoints })),
  };
}

// ── Ausführung ──────────────────────────────────────────────────────────────

export async function executeReset(selectedIds: string[]): Promise<ResetSummary> {
  const cutoff = new Date();
  const plan = await buildPlan(selectedIds, cutoff);
  const { keptSeriesIds, deleteSeriesIds, resetSeriesIds, deleteEventIds, keptEventIds } = plan;

  // Für die Discord-Rollen nach dem Reset: wer hat aktuell Ansehen?
  const hadReputation = (await prisma.user.findMany({
    where: { reputationPoints: { gt: 0 } }, select: { id: true },
  })).map(u => u.id);

  const lulSeasonWhere: Prisma.LulSeasonWhereInput = keptSeriesIds.length
    ? { OR: [{ seriesId: null }, { seriesId: { notIn: keptSeriesIds } }] }
    : {};

  const ops: Prisma.PrismaPromise<unknown>[] = [
    // ── LuL: nur Saisons bewahrter Reihen bleiben ──
    prisma.lulPollVote.deleteMany({ where: { poll: { spieltag: { season: lulSeasonWhere } } } }),
    prisma.lulSeason.deleteMany({ where: lulSeasonWhere }),
    prisma.lulSpieltag.updateMany({ where: { eventId: { in: deleteEventIds } }, data: { eventId: null } }),

    // ── Posts/Berichte und Medien bleiben, verlieren nur den Event-Bezug ──
    prisma.jobReport.updateMany({ where: { eventId: { in: deleteEventIds } }, data: { eventId: null } }),
    prisma.jobMediaAsset.updateMany({ where: { eventId: { in: deleteEventIds } }, data: { eventId: null } }),

    // ── Events vor dem Stichtag außerhalb der bewahrten Reihen (FK-sichere Reihenfolge) ──
    prisma.match.deleteMany({ where: { eventId: { in: deleteEventIds } } }),
    prisma.team.deleteMany({ where: { eventId: { in: deleteEventIds } } }),
    prisma.eventRegistration.deleteMany({ where: { eventId: { in: deleteEventIds } } }),
    prisma.tournamentParticipant.deleteMany({ where: { eventId: { in: deleteEventIds } } }),
    prisma.event.deleteMany({ where: { id: { in: deleteEventIds } } }),

    // Nicht bewahrte Reihen mit künftigen Terminen laufen weiter, starten aber bei 0
    prisma.eventSeries.updateMany({
      where: { id: { in: resetSeriesIds } },
      data: { seriesStandingsJson: null, legacyStandings: null, seriesCompletionData: null },
    }),
    prisma.eventSeries.deleteMany({ where: { id: { in: deleteSeriesIds } } }),

    // ── Pokale: nur die der bewahrten Reihen bleiben ──
    prisma.pokal.deleteMany({
      where: {
        AND: [
          { OR: [{ seriesId: null }, { seriesId: { notIn: keptSeriesIds } }] },
          { OR: [{ eventId: null }, { eventId: { notIn: keptEventIds } }] },
        ],
      },
    }),

    // ── Quests, Tipps ──
    prisma.userQuestProgress.deleteMany(),
    prisma.eventWinnerPrediction.deleteMany(),
    prisma.predictionStreak.deleteMany(),

    // ── Minigames (Blocks) + Shop-Inventar ──
    prisma.blocksRun.deleteMany(),
    prisma.blocksBest.deleteMany(),
    prisma.blocksSeason.deleteMany(),
    prisma.blocksMatch.deleteMany(),
    prisma.userCosmetic.deleteMany(),

    // ── Community-Jobs, Ranglisten-Verlauf, Benachrichtigungen, Punktehistorie ──
    prisma.communityJobWeeklyPayout.deleteMany(),
    prisma.leaderboardRankSnapshot.deleteMany(),
    prisma.inAppNotification.deleteMany(),
    prisma.pointTransaction.deleteMany(),

    // ── User-Werte ──
    prisma.user.updateMany({
      data: {
        points: 0, rankPoints: 0, voiceMinutesTotal: 0, messagesTotal: 0,
        reputationLevel: 1, reputationPeakLevel: 1, reputationPoints: 0, reputationOverrideUntil: null,
        // Shop-Inventar (UserCosmetic) ist weg — angelegte Artikel ebenfalls ablegen
        equippedCosmeticsJson: null,
      },
    }),
    ...Object.entries(plan.rankPoints).flatMap(([userId, pts]) => [
      prisma.user.update({ where: { id: userId }, data: { rankPoints: pts } }),
      prisma.pointTransaction.create({ data: { userId, amount: pts, reason: RANK_TRANSFER_REASON } }),
    ]),

    prisma.botConfig.upsert({
      where: { key: APP_ERA_START_KEY },
      update: { value: cutoff.toISOString() },
      create: { key: APP_ERA_START_KEY, value: cutoff.toISOString() },
    }),
  ];

  await prisma.$transaction(ops);

  // Nachlauf außerhalb der Transaktion — Fehler hier lassen den Reset selbst gültig
  await recomputeWanderpocalHolders().catch(err => console.error("[reset] Wanderpokale:", err));
  for (const userId of hadReputation) {
    await syncReputationRoleForUser(userId).catch(err => console.error("[reset] Ansehen-Rolle:", userId, err));
  }

  return summarize(plan);
}

/** Vom Cron aufgerufen: führt einen fälligen geplanten Reset genau einmal aus. */
export async function runDueReset(now: Date = new Date()): Promise<{ ran: boolean; summary?: ResetSummary; error?: string }> {
  const row = await prisma.botConfig.findUnique({ where: { key: SCHEDULE_KEY } });
  if (!row) return { ran: false };
  let schedule: ResetSchedule;
  try { schedule = JSON.parse(row.value) as ResetSchedule; } catch { return { ran: false }; }
  if (schedule.status !== "scheduled" || schedule.scheduledFor > berlinToday(now)) return { ran: false };

  // Optimistisch beanspruchen: nur wer den unveränderten Wert sieht, startet den Lauf
  const running: ResetSchedule = { ...schedule, status: "running", startedAt: now.toISOString() };
  const claimed = await prisma.botConfig.updateMany({
    where: { key: SCHEDULE_KEY, value: row.value },
    data: { value: JSON.stringify(running) },
  });
  if (claimed.count === 0) return { ran: false };

  try {
    const summary = await executeReset(schedule.keepSeriesIds);
    await saveSchedule({ ...running, status: "done", finishedAt: new Date().toISOString(), result: summary });
    return { ran: true, summary };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[reset] fehlgeschlagen:", err);
    await saveSchedule({ ...running, status: "failed", finishedAt: new Date().toISOString(), error });
    return { ran: true, error };
  }
}

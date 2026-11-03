// ============================================
// OMA Blocks — Highscores (Monat + All-Time), Monatsabschluss, Versus-Siege
// ============================================
// Bestwerte liegen in BlocksBest: season "YYYY-MM" (Berliner Kalendermonat, wie die Gems-Saisons)
// und "all" für All-Time. Die Monatswertung "setzt sich zurück", indem ab dem 1. einfach die neue
// season-Zeile zählt — nichts wird gelöscht. Der Cron (cron/blocks-season) friert danach den Endstand
// des Vormonats in BlocksSeason ein und benachrichtigt die Top 3.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { seasonKey, seasonLabel } from "@/lib/gems/tower-season";
import type { EngineStats } from "./engine";

export const ALL_TIME = "all";

export interface BlocksRankingRow {
  userId: string;
  name: string;
  image: string | null;
  score: number;
  lines: number;
  level: number;
  reachedAt: string;
}

async function usersById(ids: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, name: true, image: true },
  });
  return new Map(users.map((u) => [u.id, { name: u.username ?? u.name ?? "Unbekannt", image: u.image ?? null }]));
}

/** Rangliste einer Saison ("YYYY-MM" oder ALL_TIME): höchster Score zuerst, bei Gleichstand wer früher dort war. */
export async function getBlocksRanking(season: string, limit = 50): Promise<BlocksRankingRow[]> {
  const rows = await prisma.blocksBest.findMany({
    where: { season, score: { gt: 0 } },
    orderBy: [{ score: "desc" }, { reachedAt: "asc" }],
    take: limit,
  });
  if (rows.length === 0) return [];
  const users = await usersById(rows.map((r) => r.userId));
  return rows.map((r) => ({
    userId: r.userId,
    name: users.get(r.userId)?.name ?? "Unbekannt",
    image: users.get(r.userId)?.image ?? null,
    score: r.score,
    lines: r.lines,
    level: r.level,
    reachedAt: r.reachedAt.toISOString(),
  }));
}

/** Platz eines Spielers (1-basiert) in einer Saison, null = kein Eintrag. */
export async function getBlocksPlace(userId: string, season: string): Promise<{ place: number; score: number } | null> {
  const own = await prisma.blocksBest.findUnique({ where: { userId_season: { userId, season } } });
  if (!own || own.score <= 0) return null;
  const ahead = await prisma.blocksBest.count({
    where: {
      season,
      OR: [{ score: { gt: own.score } }, { score: own.score, reachedAt: { lt: own.reachedAt } }],
    },
  });
  return { place: ahead + 1, score: own.score };
}

/** Trägt ein geprüftes Ergebnis ein und aktualisiert Monats- und All-Time-Bestwert. */
export async function recordBlocksResult(
  userId: string,
  runId: string,
  stats: EngineStats,
  now: Date = new Date(),
): Promise<{ season: string; newMonthBest: boolean; newAllTimeBest: boolean; monthBest: number; allTimeBest: number }> {
  const season = seasonKey(now);
  await prisma.blocksRun.update({
    where: { id: runId },
    data: {
      finishedAt: now,
      season,
      score: stats.score,
      lines: stats.lines,
      level: stats.level,
      pieces: stats.pieces,
      frames: stats.frame,
    },
  });

  const upsertBest = async (s: string) => {
    const existing = await prisma.blocksBest.findUnique({ where: { userId_season: { userId, season: s } } });
    if (existing && existing.score >= stats.score) return { isNew: false, best: existing.score };
    if (stats.score <= 0) return { isNew: false, best: existing?.score ?? 0 };
    const data = { score: stats.score, lines: stats.lines, level: stats.level, runId, reachedAt: now };
    await prisma.blocksBest.upsert({
      where: { userId_season: { userId, season: s } },
      create: { userId, season: s, ...data },
      update: data,
    });
    return { isNew: true, best: stats.score };
  };

  const month = await upsertBest(season);
  const all = await upsertBest(ALL_TIME);
  return { season, newMonthBest: month.isNew, newAllTimeBest: all.isNew, monthBest: month.best, allTimeBest: all.best };
}

export interface FinishedSeason {
  season: string;
  label: string;
  top: { userId: string; name: string; image: string | null; score: number }[];
}

/** Die letzten abgeschlossenen Monate (für die „Monatssieger“-Liste). */
export async function getFinishedBlocksSeasons(limit = 6): Promise<FinishedSeason[]> {
  const rows = await prisma.blocksSeason.findMany({ orderBy: { season: "desc" }, take: limit });
  return rows.map((r) => {
    let top: FinishedSeason["top"] = [];
    try {
      top = (JSON.parse(r.rankingJson) as BlocksRankingRow[])
        .slice(0, 3)
        .map((x) => ({ userId: x.userId, name: x.name, image: x.image, score: x.score }));
    } catch {
      /* kaputtes JSON — leer anzeigen */
    }
    return { season: r.season, label: seasonLabel(r.season), top };
  });
}

/** Friert alle abgelaufenen, noch offenen Monatswertungen ein. Idempotent über BlocksSeason. */
export async function finalizeDueBlocksSeasons(now: Date = new Date()): Promise<{ finalized: string[]; cleanedRuns: number }> {
  const current = seasonKey(now);
  const seasons = await prisma.blocksBest.findMany({
    where: { season: { lt: current, not: ALL_TIME } },
    distinct: ["season"],
    select: { season: true },
  });
  const done = new Set((await prisma.blocksSeason.findMany({ select: { season: true } })).map((s) => s.season));

  const finalized: string[] = [];
  for (const { season } of seasons) {
    // "all" sortiert hinter Ziffern — trotzdem sicherheitshalber nur echte Monate.
    if (done.has(season) || !/^\d{4}-\d{2}$/.test(season)) continue;
    const ranking = await getBlocksRanking(season, 50);
    const claimed = await prisma.blocksSeason
      .create({ data: { season, rankingJson: JSON.stringify(ranking) } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) continue;
    finalized.push(season);
    for (let i = 0; i < Math.min(3, ranking.length); i++) {
      await createNotification(ranking[i].userId, {
        type: "badge",
        title: `OMA Blocks: Platz ${i + 1} im ${seasonLabel(season)}`,
        body: `Mit ${ranking[i].score.toLocaleString("de-DE")} Punkten bist du auf Platz ${i + 1} der Monatswertung gelandet.`,
        url: "/gems?spiel=blocks",
      });
    }
  }

  // Nie eingereichte Läufe (Tab geschlossen o.ä.) nach einem Tag aufräumen.
  const { count } = await prisma.blocksRun.deleteMany({
    where: { finishedAt: null, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  return { finalized, cleanedRuns: count };
}

// ── Versus ──

export interface VersusWinsRow {
  userId: string;
  name: string;
  image: string | null;
  wins: number;
  played: number;
}

/** Versus-Siege im Monat (nur Runden mit mindestens 2 Spielern werden gespeichert). */
export async function getVersusWins(season: string = seasonKey(), limit = 10): Promise<VersusWinsRow[]> {
  const played = await prisma.blocksMatchPlayer.groupBy({
    by: ["userId"],
    where: { match: { season } },
    _count: { _all: true },
  });
  const wins = await prisma.blocksMatchPlayer.groupBy({
    by: ["userId"],
    where: { match: { season }, place: 1 },
    _count: { _all: true },
  });
  const winsBy = new Map(wins.map((w) => [w.userId, w._count._all]));
  const rows = played
    .map((p) => ({ userId: p.userId, played: p._count._all, wins: winsBy.get(p.userId) ?? 0 }))
    .filter((r) => r.wins > 0)
    .sort((a, b) => b.wins - a.wins || a.played - b.played)
    .slice(0, limit);
  if (rows.length === 0) return [];
  const users = await usersById(rows.map((r) => r.userId));
  return rows.map((r) => ({ ...r, name: users.get(r.userId)?.name ?? "Unbekannt", image: users.get(r.userId)?.image ?? null }));
}

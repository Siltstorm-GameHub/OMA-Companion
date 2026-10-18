// ============================================
// OMA Gems — Last-Stand-Saisons
// ============================================
// Wie beim Aufstieg (siehe tower-season.ts) ist jeder Kalendermonat (Berliner Zeit, "YYYY-MM") eine Saison:
// Gezählt wird die beste Zahl besiegter Wellen im Monat (GemsWaveBest). Karten-Ränge und Relikte bleiben,
// die Rangliste beginnt jeden Monat neu — so haben auch Neue eine Chance. Zum Monatswechsel vergibt der Cron
// (cron/gems-tower-season) Packs an die besten Spieler der abgelaufenen Saison.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { grantPack } from "./packs";
import { packForPlace, seasonKey, seasonLabel } from "./tower-season";

export interface WaveRankingRow {
  userId: string;
  bestWaves: number;
  reachedAt: string;
}

/** Rein, damit testbar: mehr Wellen zuerst, bei Gleichstand wer den Bestwert früher erreicht hat. */
export function rankWaveSeason(rows: { userId: string; bestWaves: number; reachedAt: Date }[]): WaveRankingRow[] {
  return rows
    .filter((r) => r.bestWaves > 0)
    .map((r) => ({ userId: r.userId, bestWaves: r.bestWaves, reachedAt: r.reachedAt.toISOString() }))
    .sort((a, b) => b.bestWaves - a.bestWaves || a.reachedAt.localeCompare(b.reachedAt));
}

export async function getWaveSeasonRanking(season: string = seasonKey()): Promise<WaveRankingRow[]> {
  const rows = await prisma.gemsWaveBest.findMany({
    where: { season, bestWaves: { gt: 0 } },
    select: { userId: true, bestWaves: true, reachedAt: true },
  });
  return rankWaveSeason(rows);
}

/** Bestwert eines Spielers in der laufenden Saison (0 = noch keine Welle besiegt). */
export async function getWaveBest(userId: string, season: string = seasonKey()): Promise<number> {
  const row = await prisma.gemsWaveBest.findUnique({ where: { userId_season: { userId, season } }, select: { bestWaves: true } });
  return row?.bestWaves ?? 0;
}

/** Trägt das Ergebnis eines Laufs (`wavesCleared` besiegte Wellen) ein. Liefert den bisherigen Bestwert
 *  der Saison, damit der Aufrufer neu erreichte Wellen belohnen kann. */
export async function recordWaveRun(
  userId: string,
  wavesCleared: number
): Promise<{ previousBest: number; best: number; isNewBest: boolean }> {
  const season = seasonKey();
  const previousBest = await getWaveBest(userId, season);
  if (wavesCleared <= previousBest) return { previousBest, best: previousBest, isNewBest: false };
  await prisma.gemsWaveBest.upsert({
    where: { userId_season: { userId, season } },
    create: { userId, season, bestWaves: wavesCleared },
    update: { bestWaves: wavesCleared, reachedAt: new Date() },
  });
  return { previousBest, best: wavesCleared, isNewBest: true };
}

/** Schließt alle abgelaufenen, noch offenen Last-Stand-Saisons ab und vergibt die Platzierungs-Packs.
 *  Idempotent über GemsWaveSeason (eine Zeile je abgeschlossener Saison). */
export async function finalizeDueWaveSeasons(now: Date = new Date()): Promise<{ finalized: string[] }> {
  const current = seasonKey(now);
  const finished = await prisma.gemsWaveBest.findMany({
    where: { season: { lt: current } },
    distinct: ["season"],
    select: { season: true },
  });
  const done = new Set((await prisma.gemsWaveSeason.findMany({ select: { season: true } })).map((s) => s.season));

  const finalized: string[] = [];
  for (const { season } of finished) {
    if (done.has(season)) continue;
    const ranking = await getWaveSeasonRanking(season);
    // Zuerst den Abschluss festhalten — schlägt das fehl (parallel schon erledigt), keine Doppel-Packs.
    const claimed = await prisma.gemsWaveSeason
      .create({ data: { season, rankingJson: JSON.stringify(ranking.slice(0, 50)) } })
      .then(() => true)
      .catch(() => false);
    if (!claimed) continue;

    for (let i = 0; i < ranking.length; i++) {
      const place = i + 1;
      const kind = packForPlace(place);
      if (!kind) break;
      await grantPack(ranking[i].userId, "GEMS_WAVE_SEASON", kind);
      await createNotification(ranking[i].userId, {
        type: "event_result",
        title: `Last-Stand-Saison ${seasonLabel(season)}: Platz ${place}`,
        body: `Du hast ${ranking[i].bestWaves} ${ranking[i].bestWaves === 1 ? "Welle" : "Wellen"} besiegt. Dein Pack liegt im OMA-Gems-Shop.`,
        url: "/gems?tab=laden",
      });
    }
    finalized.push(season);
  }
  return { finalized };
}

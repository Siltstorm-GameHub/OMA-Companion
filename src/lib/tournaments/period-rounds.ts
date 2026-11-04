// ============================================
// Zeitraum-Events: Runde 1 startet automatisch
// ============================================
// Bei Events, die länger als 24 Stunden laufen (lib/event-period.ts), im Format Punktewertung
// (coop_stats) oder Durchschnittswerte (avg_stats) muss kein Admin die erste Runde anlegen: Sobald
// der Starttermin erreicht ist, wird Runde 1 mit allen bis dahin angemeldeten Spielern eröffnet
// (bei aktivem Check-in nur Eingecheckte, siehe prepareTournamentPool) und als "läuft gerade"
// markiert. Wer sich danach anmeldet, kommt automatisch dazu (lib/tournaments/late-join.ts).
//
// Ausgelöst lazy beim Laden von Event-Seiten (syncDueEventActivations) und im täglichen Cron.

import { prisma } from "@/lib/prisma";
import { isPeriodEvent } from "@/lib/event-period";
import { supportsMatchWin } from "@/lib/tournaments/stat-rounds";
import { prepareTournamentPool } from "@/lib/tournaments/participants";
import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";

/** Reine Prüfung (testbar): soll für dieses Event jetzt automatisch Runde 1 eröffnet werden? */
export function shouldAutoStartRound(ev: {
  format: string | null;
  status: string;
  startAt: Date;
  endAt: Date | null;
  matchCount: number;
}, now: Date = new Date()): boolean {
  if (!supportsMatchWin(ev.format)) return false; // Punktewertung oder Durchschnittswerte
  if (ev.status === "finished" || ev.status === "closed" || ev.status === "umfrage") return false;
  if (!ev.endAt || !isPeriodEvent(ev)) return false;
  if (ev.startAt > now || ev.endAt <= now) return false;
  return ev.matchCount === 0;
}

/** Eröffnet Runde 1 für alle fälligen Zeitraum-Events. Gibt die Anzahl eröffneter Runden zurück. Wirft nie. */
export async function autoStartPeriodRounds(now: Date = new Date()): Promise<number> {
  try {
    const candidates = await prisma.event.findMany({
      where: {
        format: { in: ["coop_stats", "avg_stats"] },
        status: { in: ["open", "active"] },
        startAt: { lte: now },
        endAt: { gt: now },
        matches: { none: {} },
      },
      select: { id: true, format: true, status: true, startAt: true, endAt: true },
    });
    let started = 0;
    for (const ev of candidates) {
      if (!shouldAutoStartRound({ ...ev, matchCount: 0 }, now)) continue;
      if (await startFirstRound(ev.id)) started++;
    }
    return started;
  } catch (err) {
    console.error("[period-rounds] automatischer Rundenstart fehlgeschlagen", err);
    return 0;
  }
}

async function startFirstRound(eventId: string): Promise<boolean> {
  // Teilnehmer-Pool (angemeldete Spieler, ggf. nur Eingecheckte) — legt fehlende Turnier-Teilnehmer an
  const { ids } = await prepareTournamentPool(eventId);

  return prisma.$transaction(async (tx) => {
    // Parallele Seitenaufrufe dürfen nicht zwei "Runde 1" anlegen
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"period-round:" + eventId}))`;
    const existing = await tx.match.count({ where: { eventId } });
    if (existing > 0) return false;

    const ev = await tx.event.findUnique({
      where: { id: eventId },
      select: { statFields: true, tournamentStatus: true, series: { select: { seriesStatConfig: true } } },
    });
    if (!ev) return false;
    // Termine einer Reihe haben oft keine eigenen Stat-Felder — dann die der Reihe übernehmen,
    // damit Teilnehmer ihre Werte melden können
    const seriesFields = ev.statFields ? null : seriesEventStatFieldsFromConfig(ev.series?.seriesStatConfig);

    await tx.match.create({
      data: {
        eventId,
        round: 1,
        position: 1,
        startedAt: new Date(),
        entries: ids.length ? { create: ids.map(userId => ({ userId })) } : undefined,
      },
    });
    await tx.event.update({
      where: { id: eventId },
      data: {
        type: "tournament",
        ...(ev.tournamentStatus !== "active" && { tournamentStatus: "active" }),
        ...(seriesFields && seriesFields.length > 0 && { statFields: JSON.stringify(seriesFields) }),
      },
    });
    return true;
  });
}

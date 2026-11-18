// ============================================
// Zyklus-Automatik einer Eventreihe
// ============================================
// Eine Reihe mit Wiederholung (wöchentlich/2-wöchentlich/monatlich) kann dauerhaft laufen: Jeder
// Zyklus bleibt ein eigener Termin (Anmeldung, Screenshot-Meldungen, Eventpunkte, Sieger, Abschluss,
// Community-Ziel hängen am Event), aber die Termine legt das System selbst an:
//   - es gibt immer `aheadCount` kommende Zyklen, angelegt und veröffentlicht — User können sich
//     schon Wochen vorher anmelden und das Ziel des Zyklus sehen
//   - neue Zyklen übernehmen das nächste geplante Ziel (lib/goal-plan.ts)
//   - optional: Spieler aus dem laufenden/kommenden Zyklus sind im neuen automatisch angemeldet
//   - optional: Enddatum, danach entstehen keine Zyklen mehr
// Abgeschlossen werden Zyklen weiter vom Admin (Prüfung der Meldungen, Sieger, Auszahlung).
// Ausgelöst vom täglichen Cron (event-reminders) und beim Speichern der Reihen-Einstellungen.

import { prisma } from "@/lib/prisma";
import type { MonthlyMode, RecurrenceType } from "@/lib/recurrence";
import { cyclesActive, parseCycleConfig, plannedCycleStarts } from "@/lib/series-cycles-config";
import { generateNextSeriesEvent } from "@/lib/series-generate";

export {
  DEFAULT_CYCLE_CONFIG, MAX_CYCLES_AHEAD, cyclesActive, parseCycleConfig, plannedCycleStarts, sanitizeCycleConfig,
  type CycleConfig,
} from "@/lib/series-cycles-config";

/** Spieler, die in den neuen Zyklus übernommen werden: aus dem jüngsten gestarteten Zyklus und allen danach. */
async function carryRegistrations(seriesId: string, newEventId: string, newStart: Date, maxPlayers: number | null) {
  const before = await prisma.event.findMany({
    where: { seriesId, id: { not: newEventId }, startAt: { lt: newStart } },
    orderBy: { startAt: "desc" },
    select: { id: true, startAt: true },
  });
  const now = new Date();
  const lastStartedIdx = before.findIndex(e => e.startAt <= now);
  const sources = lastStartedIdx >= 0 ? before.slice(0, lastStartedIdx + 1) : before.slice(0, 1);
  if (sources.length === 0) return 0;
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: { in: sources.map(e => e.id) }, role: "player" },
    orderBy: { joinedAt: "asc" },
    select: { userId: true },
  });
  let userIds = [...new Set(regs.map(r => r.userId))];
  if (maxPlayers && maxPlayers > 0) userIds = userIds.slice(0, maxPlayers);
  if (userIds.length === 0) return 0;
  const res = await prisma.eventRegistration.createMany({
    data: userIds.map(userId => ({ userId, eventId: newEventId, role: "player" })),
    skipDuplicates: true,
  });
  return res.count;
}

/** Legt fehlende Zyklen einer Reihe an. Gibt die Anzahl neuer Termine zurück. Wirft nie. */
export async function ensureSeriesCycles(seriesId: string, now: Date = new Date()): Promise<number> {
  try {
    const series = await prisma.eventSeries.findUnique({
      where: { id: seriesId },
      select: {
        status: true, recurrenceType: true, recurrenceMonthlyMode: true, cycleConfigJson: true,
        events: { select: { startAt: true } },
      },
    });
    if (!series || !cyclesActive(series)) return 0;
    const cfg = parseCycleConfig(series.cycleConfigJson);
    const starts = plannedCycleStarts(
      series.events, series.recurrenceType as RecurrenceType,
      (series.recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode, cfg, now,
    );
    let created = 0;
    for (const start of starts) {
      // Die Wiederholungsregel des Generators liefert genau diesen Start (gleiche Rechnung) — der
      // Termin wird trotzdem explizit gesetzt, damit vergangene Lücken übersprungen werden
      const r = await generateNextSeriesEvent(seriesId, start);
      if (!r.ok) { console.error("[series-cycles]", seriesId, r.error); break; }
      created++;
      if (cfg.carryParticipants) await carryRegistrations(seriesId, r.event.id, r.event.startAt, r.event.maxPlayers);
    }
    return created;
  } catch (err) {
    console.error("[series-cycles] Zyklen konnten nicht angelegt werden", seriesId, err);
    return 0;
  }
}

/** Cron: alle Reihen mit aktiver Zyklus-Automatik auffüllen. */
export async function ensureAllSeriesCycles(now: Date = new Date()): Promise<number> {
  const candidates = await prisma.eventSeries.findMany({
    where: { status: "active", recurrenceType: { not: null }, cycleConfigJson: { contains: "\"enabled\":true" } },
    select: { id: true },
  });
  let total = 0;
  for (const s of candidates) total += await ensureSeriesCycles(s.id, now);
  return total;
}

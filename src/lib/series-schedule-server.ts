// ============================================
// Terminplanung einer Eventreihe — Termine anlegen (DB)
// ============================================
// Hält für jede Reihe mit Ablaufart (lib/series-schedule.ts) immer `aheadCount` kommende Termine
// angelegt und angekündigt. Ausgelöst vom täglichen Cron (event-reminders), beim Anlegen der Reihe und
// beim Speichern der Planung. Reihen ohne Ablaufart (alte Planung, noch nicht umgestellt) bekommen
// bewusst keine neuen Termine, bis die Ablaufart in den Reihen-Einstellungen festgelegt ist.
// Abgeschlossen werden Termine weiter vom Admin (Prüfung der Meldungen, Sieger, Auszahlung).

import { prisma } from "@/lib/prisma";
import { parseSchedule, planUpcoming } from "@/lib/series-schedule";
import { createSeriesTerm } from "@/lib/series-generate";

/** Spieler, die in den neuen Termin übernommen werden: aus dem jüngsten gestarteten Termin und allen danach. */
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

/** Legt fehlende kommende Termine einer Reihe an. Gibt die Anzahl neuer Termine zurück. Wirft nie. */
export async function ensureSeriesSchedule(seriesId: string, now: Date = new Date()): Promise<number> {
  try {
    const series = await prisma.eventSeries.findUnique({
      where: { id: seriesId },
      select: { status: true, scheduleMode: true, scheduleJson: true, events: { select: { slotIndex: true, startAt: true, endAt: true, status: true } } },
    });
    if (!series || series.status === "archived" || !series.scheduleMode) return 0;
    const schedule = parseSchedule(series.scheduleJson);
    if (!schedule) return 0;
    let created = 0;
    for (const term of planUpcoming(schedule, series.events, now)) {
      const r = await createSeriesTerm(seriesId, term);
      if (!r.ok) { if (r.status !== 409) console.error("[series-schedule]", seriesId, r.error); break; }
      created++;
      if (schedule.carryParticipants) await carryRegistrations(seriesId, r.event.id, r.event.startAt, r.event.maxPlayers);
    }
    return created;
  } catch (err) {
    console.error("[series-schedule] Termine konnten nicht angelegt werden", seriesId, err);
    return 0;
  }
}

/** Gehört das Event zu einer Challenge-Reihe (Ablaufart "runden")? */
export async function isChallengeSeriesEvent(eventId: string): Promise<boolean> {
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { series: { select: { scheduleMode: true } } } });
  return ev?.series?.scheduleMode === "runden";
}

/**
 * Challenge-Reihe: jede Runde (= ein Event) hat genau ein Match, in das alle ihre Werte eintragen —
 * eine neue Meldung ersetzt die vorige. Gibt einen Fehlertext zurück, wenn schon ein Match existiert.
 */
export async function singleMatchViolation(eventId: string): Promise<string | null> {
  if (!(await isChallengeSeriesEvent(eventId))) return null;
  const count = await prisma.match.count({ where: { eventId } });
  return count > 0 ? "In einer Challenge-Reihe hat jede Runde genau ein Match — trage die Werte dort ein." : null;
}

/** Cron: alle aktiven Reihen mit Ablaufart auffüllen. */
export async function ensureAllSeriesSchedules(now: Date = new Date()): Promise<number> {
  const candidates = await prisma.eventSeries.findMany({
    where: { status: "active", scheduleMode: { not: null } },
    select: { id: true },
  });
  let total = 0;
  for (const s of candidates) total += await ensureSeriesSchedule(s.id, now);
  return total;
}

/**
 * Runden einer Reihe bleiben lückenlos: Wird das Ende einer Runde geändert, beginnt die nächste
 * (noch nicht gestartete) Runde direkt danach; wird der Start geändert, endet die vorige (noch
 * laufende) Runde direkt davor. Gibt einen Fehlertext zurück, wenn die Änderung eine Runde zerstören
 * würde (zu kurz oder Überschneidung mit einer schon vorbei/laufenden Runde) — sonst null.
 * changes = die neuen Werte des bearbeiteten Termins (nur geänderte Felder).
 */
export async function checkRoundChain(eventId: string, changes: { startAt?: Date; endAt?: Date | null }, now: Date = new Date()):
  Promise<{ error: string | null; apply: () => Promise<void> }> {
  const noop = { error: null, apply: async () => {} };
  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: { startAt: true, endAt: true, slotIndex: true, seriesId: true, series: { select: { scheduleMode: true } } },
  });
  if (!ev?.seriesId || ev.slotIndex == null || ev.series?.scheduleMode !== "runden") return noop;
  const [prev, next] = await Promise.all([
    prisma.event.findFirst({ where: { seriesId: ev.seriesId, slotIndex: { lt: ev.slotIndex } }, orderBy: { slotIndex: "desc" }, select: { id: true, startAt: true, endAt: true } }),
    prisma.event.findFirst({ where: { seriesId: ev.seriesId, slotIndex: { gt: ev.slotIndex } }, orderBy: { slotIndex: "asc" }, select: { id: true, startAt: true, endAt: true } }),
  ]);
  const GAP = 60_000;
  const MIN = 24 * 60 * 60 * 1000;
  const updates: { id: string; data: { startAt?: Date; endAt?: Date } }[] = [];

  if (changes.endAt && next && (!ev.endAt || changes.endAt.getTime() !== ev.endAt.getTime())) {
    const newNextStart = new Date(changes.endAt.getTime() + GAP);
    if (next.startAt <= now) {
      if (newNextStart > next.startAt) return { error: "Die nächste Runde läuft schon — das Ende darf nicht in sie hineinreichen.", apply: noop.apply };
    } else {
      if (next.endAt && next.endAt.getTime() - newNextStart.getTime() <= MIN) {
        return { error: "Die nächste Runde wäre dann kürzer als 24 Stunden. Passe zuerst ihr Ende an.", apply: noop.apply };
      }
      updates.push({ id: next.id, data: { startAt: newNextStart } });
    }
  }
  if (changes.startAt && prev && changes.startAt.getTime() !== ev.startAt.getTime()) {
    const newPrevEnd = new Date(changes.startAt.getTime() - GAP);
    if (prev.endAt && prev.endAt <= now) {
      if (changes.startAt < prev.endAt) return { error: "Die vorige Runde ist schon vorbei — der Start darf nicht in sie hineinreichen.", apply: noop.apply };
    } else {
      if (newPrevEnd.getTime() - prev.startAt.getTime() <= MIN) {
        return { error: "Die vorige Runde wäre dann kürzer als 24 Stunden.", apply: noop.apply };
      }
      updates.push({ id: prev.id, data: { endAt: newPrevEnd } });
    }
  }
  return {
    error: null,
    apply: async () => { for (const u of updates) await prisma.event.update({ where: { id: u.id }, data: u.data }); },
  };
}

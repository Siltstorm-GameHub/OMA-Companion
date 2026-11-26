import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSeriesManager } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  missingSlots, parseSchedule, ruleChanged, sanitizeSchedule, scheduleProblem, serializeSchedule, type Assignment,
} from "@/lib/series-schedule";
import { ensureSeriesSchedule } from "@/lib/series-schedule-server";

/**
 * POST /api/admin/event-series/schedule — Terminplanung einer Reihe speichern.
 * Body: {
 *   seriesId: string,
 *   schedule: SeriesSchedule (lib/series-schedule.ts),
 *   assignments?: { eventId, slotIndex: number | null }[]  — Pflicht beim ersten Festlegen und wenn sich
 *                                                            die Regel ändert (Termine neu zuordnen)
 *   fixes?: { eventId, startAt?, endAt? }[]                 — Korrekturen aus dem Zuordnungs-Dialog
 * }
 * Die Ablaufart lässt sich nach dem ersten Festlegen nur noch mit einer neuen Saison wechseln.
 * Danach werden fehlende kommende Termine sofort angelegt und angekündigt.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const seriesId = body.seriesId;
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });
  await requireSeriesManager(seriesId);

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: {
      status: true, scheduleMode: true, scheduleJson: true,
      events: { select: { id: true, startAt: true, endAt: true, slotIndex: true } },
    },
  });
  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  if (series.status === "archived") return NextResponse.json({ error: "Diese Saison ist abgeschlossen." }, { status: 409 });

  const schedule = sanitizeSchedule(body.schedule);
  if (!schedule) return NextResponse.json({ error: "Ablaufart und erster Termin fehlen" }, { status: 400 });
  const problem = scheduleProblem(schedule);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (series.scheduleMode && schedule.mode !== series.scheduleMode) {
    return NextResponse.json({ error: "Die Ablaufart lässt sich nur mit einer neuen Saison wechseln." }, { status: 400 });
  }

  const current = parseSchedule(series.scheduleJson);
  const needsAssign = !series.scheduleMode || !current || ruleChanged(current, schedule);
  const eventIds = new Set(series.events.map(e => e.id));

  // Zuordnung prüfen: nur Termine dieser Reihe, jeder Platz höchstens einmal
  let assignments: Assignment[] | null = null;
  if (Array.isArray(body.assignments)) {
    const seen = new Set<number>();
    const given = new Map<string, number | null>();
    for (const a of body.assignments as { eventId?: unknown; slotIndex?: unknown }[]) {
      if (typeof a?.eventId !== "string" || !eventIds.has(a.eventId)) continue;
      const slot = schedule.rhythm && Number.isInteger(a.slotIndex) && (a.slotIndex as number) >= 0 ? a.slotIndex as number : null;
      if (slot != null && seen.has(slot)) return NextResponse.json({ error: `Platz ${slot + 1} ist doppelt belegt` }, { status: 400 });
      if (slot != null) seen.add(slot);
      given.set(a.eventId, slot);
    }
    assignments = series.events.map(e => ({ eventId: e.id, slotIndex: given.get(e.id) ?? null, kind: "regular" as const }));
  } else if (needsAssign) {
    return NextResponse.json({ error: "Die Regel hat sich geändert — bitte die Termine neu zuordnen." }, { status: 400 });
  }

  // Ausgefallene Plätze: bei neuer Zuordnung aus den Lücken, sonst wie bisher
  if (schedule.mode === "termine") {
    const kept = current?.skippedSlots ?? [];
    if (assignments) {
      // Gleiche Regel: schon ausgefallene Plätze bleiben ausgefallen (sofern jetzt nicht belegt)
      const used = new Set(assignments.filter(a => a.slotIndex != null).map(a => a.slotIndex!));
      const carried = current && !ruleChanged(current, schedule) ? kept.filter(i => !used.has(i)) : [];
      schedule.skippedSlots = [...new Set([...missingSlots(schedule, assignments), ...carried])].sort((a, b) => a - b);
    } else {
      schedule.skippedSlots = kept;
    }
  }

  // Korrekturen (nur, was noch nicht vorbei ist)
  const now = new Date();
  const byId = new Map(series.events.map(e => [e.id, e]));
  const fixes: { id: string; data: { startAt?: Date; endAt?: Date } }[] = [];
  for (const f of Array.isArray(body.fixes) ? body.fixes as { eventId?: unknown; startAt?: unknown; endAt?: unknown }[] : []) {
    const ev = typeof f?.eventId === "string" ? byId.get(f.eventId) : undefined;
    if (!ev) continue;
    const data: { startAt?: Date; endAt?: Date } = {};
    if (typeof f.startAt === "string" && ev.startAt > now) data.startAt = new Date(f.startAt);
    if (typeof f.endAt === "string" && (!ev.endAt || ev.endAt > now)) data.endAt = new Date(f.endAt);
    const start = data.startAt ?? ev.startAt;
    const end = data.endAt ?? ev.endAt;
    if ((data.startAt && isNaN(data.startAt.getTime())) || (data.endAt && isNaN(data.endAt.getTime())) || (end && end <= start)) {
      return NextResponse.json({ error: "Eine Korrektur ist ungültig (Ende vor Start)" }, { status: 400 });
    }
    if (data.startAt || data.endAt) fixes.push({ id: ev.id, data });
  }

  await prisma.$transaction(async (tx) => {
    await tx.eventSeries.update({
      where: { id: seriesId },
      data: { scheduleMode: schedule.mode, scheduleJson: serializeSchedule(schedule) },
    });
    if (assignments) {
      // Erst alle Plätze lösen, dann neu setzen — sonst stößt das Umsortieren an die Eindeutigkeit
      await tx.event.updateMany({ where: { seriesId }, data: { slotIndex: null } });
      for (const a of assignments) {
        if (a.slotIndex != null) await tx.event.update({ where: { id: a.eventId }, data: { slotIndex: a.slotIndex } });
      }
    }
    for (const f of fixes) await tx.event.update({ where: { id: f.id }, data: f.data });
  });

  const created = await ensureSeriesSchedule(seriesId);
  revalidateTag("dashboard-global", { expire: 0 });
  return NextResponse.json({ ok: true, created });
}

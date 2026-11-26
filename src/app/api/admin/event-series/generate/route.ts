import { NextRequest, NextResponse } from "next/server";
import { requireSeriesManager, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createSeriesTerm } from "@/lib/series-generate";
import { addWallMinutes, parseSchedule } from "@/lib/series-schedule";

/** Mitglieder: so viele kommende Termine darf eine Reihe gleichzeitig haben */
const MAX_MEMBER_UPCOMING = 5;

/**
 * POST /api/admin/event-series/generate — Sondertermin von Hand anlegen.
 * Body: { seriesId: string, startAt: string (ISO), endAt?: string | null }
 * Der Termin gehört zu keinem Platz der Regel (slotIndex null) und verändert die Regel nicht. Ohne Ende:
 * Dauer aus der Planung (feste Termine) bzw. vom letzten Termin (alte, noch nicht umgestellte Reihen).
 * Runden entstehen nur automatisch (lückenlose Kette).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const seriesId = body.seriesId;
  const startRaw = body.startAt ?? body.overrideDate;
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });
  if (!startRaw) return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
  // Alle, die die Reihe verwalten (auch Mitglieder) — Mitglieder mit einer Obergrenze für
  // kommende Termine, damit eine Reihe nicht beliebig viele Termine im Voraus bekommt
  const user = await requireSeriesManager(seriesId);
  if (!hasMinRole(user.role, "moderator")) {
    const upcoming = await prisma.event.count({ where: { seriesId, startAt: { gt: new Date() }, status: { notIn: ["finished", "archived"] } } });
    if (upcoming >= MAX_MEMBER_UPCOMING) {
      return NextResponse.json({ error: `Höchstens ${MAX_MEMBER_UPCOMING} kommende Termine gleichzeitig. Leg den nächsten an, wenn einer gespielt ist.` }, { status: 409 });
    }
  }

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: {
      scheduleMode: true, scheduleJson: true,
      events: { orderBy: { startAt: "desc" }, take: 1, select: { startAt: true, endAt: true } },
    },
  });
  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  if (series.scheduleMode === "runden") {
    return NextResponse.json({ error: "Runden entstehen automatisch nacheinander — einen Sondertermin gibt es dort nicht." }, { status: 400 });
  }

  const startAt = new Date(startRaw);
  if (isNaN(startAt.getTime())) return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  let endAt: Date | null = body.endAt ? new Date(body.endAt) : null;
  if (endAt && isNaN(endAt.getTime())) return NextResponse.json({ error: "Ungültiges Ende" }, { status: 400 });
  if (!endAt && body.endAt === undefined) {
    const schedule = parseSchedule(series.scheduleJson);
    const last = series.events[0];
    if (schedule && schedule.durationMinutes > 0) endAt = addWallMinutes(startAt, schedule.durationMinutes);
    else if (!schedule && last?.endAt) endAt = new Date(startAt.getTime() + (last.endAt.getTime() - last.startAt.getTime()));
  }

  const result = await createSeriesTerm(seriesId, { startAt, endAt, slotIndex: null });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, event: result.event, gameVote: result.gameVote });
}

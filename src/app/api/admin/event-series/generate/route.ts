import { NextRequest, NextResponse } from "next/server";
import { requireSeriesManager, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** Mitglieder: so viele kommende Termine darf eine Reihe gleichzeitig haben */
const MAX_MEMBER_UPCOMING = 5;
import { generateNextSeriesEvent } from "@/lib/series-generate";

/**
 * POST /api/admin/event-series/generate
 * Calculates the next date and creates a new event in the series.
 * Body: { seriesId: string, overrideDate?: string }
 * overrideDate: optionaler, manuell gewählter Termin (ISO-String) — überschreibt den aus der
 * Wiederholungsregel berechneten Vorschlag, ohne die Regel selbst zu verändern.
 */
export async function POST(req: NextRequest) {
  const { seriesId, overrideDate } = await req.json();
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });
  // Alle, die die Reihe verwalten (auch Mitglieder) — Mitglieder mit einer Obergrenze für
  // kommende Termine, damit eine Reihe nicht beliebig viele Termine im Voraus bekommt
  const user = await requireSeriesManager(seriesId);
  if (!hasMinRole(user.role, "moderator")) {
    const upcoming = await prisma.event.count({ where: { seriesId, startAt: { gt: new Date() }, status: { notIn: ["finished", "archived"] } } });
    if (upcoming >= MAX_MEMBER_UPCOMING) {
      return NextResponse.json({ error: `Höchstens ${MAX_MEMBER_UPCOMING} kommende Termine gleichzeitig. Leg den nächsten an, wenn einer gespielt ist.` }, { status: 409 });
    }
  }
  const result = await generateNextSeriesEvent(seriesId, overrideDate);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, event: result.event, gameVote: result.gameVote });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { generateNextSeriesEvent } from "@/lib/series-generate";

/**
 * POST /api/admin/event-series/generate
 * Calculates the next date and creates a new event in the series.
 * Body: { seriesId: string, overrideDate?: string }
 * overrideDate: optionaler, manuell gewählter Termin (ISO-String) — überschreibt den aus der
 * Wiederholungsregel berechneten Vorschlag, ohne die Regel selbst zu verändern.
 */
export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { seriesId, overrideDate } = await req.json();
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });
  const result = await generateNextSeriesEvent(seriesId, overrideDate);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, event: result.event, gameVote: result.gameVote });
}

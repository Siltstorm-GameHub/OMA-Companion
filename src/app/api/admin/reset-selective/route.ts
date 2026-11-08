import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { cancelReset, getResetSchedule, previewReset, scheduleReset } from "@/lib/reset-selective";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function idsFrom(body: { keepSeriesIds?: unknown }): string[] {
  return Array.isArray(body.keepSeriesIds) ? body.keepSeriesIds.filter((id): id is string => typeof id === "string") : [];
}

/** GET: aktuell geplanter (bzw. zuletzt gelaufener) Reset. */
export async function GET() {
  await requireRole("admin");
  return NextResponse.json({ schedule: await getResetSchedule() });
}

/**
 * POST { action: "preview", keepSeriesIds }        → Vorschau ohne Schreiben
 * POST { action: "schedule", keepSeriesIds, date } → Reset für das Datum planen (Cron führt aus)
 * Siehe lib/reset-selective.ts.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole("admin");
  const body = await req.json().catch(() => ({})) as { action?: string; keepSeriesIds?: unknown; date?: unknown };
  const keepSeriesIds = idsFrom(body);
  try {
    if (body.action === "preview") {
      return NextResponse.json({ preview: await previewReset(keepSeriesIds) });
    }
    if (body.action === "schedule") {
      if (typeof body.date !== "string") return NextResponse.json({ error: "Datum fehlt" }, { status: 400 });
      return NextResponse.json({ schedule: await scheduleReset(body.date, keepSeriesIds, user.id) });
    }
    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 400 });
  }
}

/** DELETE: geplanten Reset abbrechen. */
export async function DELETE() {
  await requireRole("admin");
  try {
    await cancelReset();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Fehler" }, { status: 400 });
  }
}

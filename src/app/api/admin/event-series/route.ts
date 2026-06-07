import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** GET /api/admin/event-series?id=xxx  →  Reihen-Details inkl. fixedGame/fixedFormat */
export async function GET(req: NextRequest) {
  await requireRole("moderator");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(series);
}

/**
 * PATCH /api/admin/event-series
 * Body: {
 *   seriesId: string,
 *   name?: string,
 *   description?: string | null,
 *   fixedGame?: string | null,
 *   fixedFormat?: string | null,
 *   propagateGame?: boolean,   // updateMany events.game
 *   propagateFormat?: boolean, // updateMany tournaments.format
 * }
 */
export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { seriesId, propagateGame, propagateFormat, ...fields } = body;
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });

  // 1) Reihe selbst aktualisieren
  const series = await prisma.eventSeries.update({
    where: { id: seriesId },
    data: {
      ...(fields.name        !== undefined && { name: fields.name }),
      ...(fields.description !== undefined && { description: fields.description }),
      ...(fields.fixedGame   !== undefined && { fixedGame:   fields.fixedGame }),
      ...(fields.fixedFormat !== undefined && { fixedFormat: fields.fixedFormat }),
    },
  });

  // 2) Optional: Spiel auf alle Events der Reihe übertragen
  if (propagateGame && fields.fixedGame !== undefined) {
    await prisma.event.updateMany({
      where: { seriesId },
      data:  { game: fields.fixedGame || null },
    });
  }

  // 3) Optional: Format auf alle Turniere der Reihe übertragen
  if (propagateFormat && fields.fixedFormat) {
    const events = await prisma.event.findMany({
      where: { seriesId },
      select: { id: true },
    });
    const eventIds = events.map(e => e.id);
    if (eventIds.length > 0) {
      await prisma.tournament.updateMany({
        where: { eventId: { in: eventIds } },
        data:  { format: fields.fixedFormat },
      });
    }
  }

  return NextResponse.json({ ok: true, series });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/event-series/[id]/results */
export async function GET(_req: NextRequest, { params }: Params) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    select: { id: true, name: true, statFields: true, participationPts: true, baselineJson: true },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const events = await prisma.event.findMany({
    where: { seriesId: id },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      status: true,
      seriesResults: {
        select: {
          userId: true,
          placement: true,
          points: true,
          statsJson: true,
          user: { select: { id: true, name: true, username: true, image: true } },
        },
      },
      tournament: { select: { participants: { select: { userId: true } } } },
      registrations: { select: { userId: true } },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, username: true, image: true },
    orderBy: [{ username: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    series: {
      id: series.id,
      name: series.name,
      statFields: series.statFields ? (JSON.parse(series.statFields) as string[]) : [],
      participationPts: series.participationPts,
      baselineJson: series.baselineJson ?? null,
    },
    events: events.map(ev => ({
      id: ev.id,
      title: ev.title,
      startAt: ev.startAt.toISOString(),
      status: ev.status,
      participantUserIds: (ev.tournament?.participants ?? ev.registrations).map(p => p.userId),
      results: ev.seriesResults.map(r => ({
        userId: r.userId,
        user: r.user,
        placement: r.placement,
        points: r.points,
        stats: r.statsJson ? (JSON.parse(r.statsJson) as Record<string, number>) : {},
      })),
    })),
    allUsers,
  });
}

/** PUT /api/admin/event-series/[id]/results
 *  Body: { eventId: string, results: { userId, placement, points, stats }[] }
 */
export async function PUT(req: NextRequest, { params }: Params) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json() as {
    eventId: string;
    results: { userId: string; placement: number | null; points: number; stats: Record<string, number> }[];
  };

  const { eventId, results } = body;
  if (!eventId || !Array.isArray(results)) {
    return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
  }

  const event = await prisma.event.findFirst({ where: { id: eventId, seriesId: id } });
  if (!event) return NextResponse.json({ error: "Event nicht in dieser Reihe" }, { status: 404 });

  await prisma.seriesResult.deleteMany({ where: { eventId } });

  if (results.length > 0) {
    await prisma.seriesResult.createMany({
      data: results.map(r => ({
        seriesId: id,
        eventId,
        userId:    r.userId,
        placement: r.placement ?? null,
        points:    r.points ?? 0,
        statsJson: Object.keys(r.stats ?? {}).length > 0 ? JSON.stringify(r.stats) : null,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}

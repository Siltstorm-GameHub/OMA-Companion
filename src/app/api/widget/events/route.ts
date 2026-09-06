import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/events
 *
 * Für das Touchscreen-Widget: gruppierte Liste in eigenständige Events und Event-Reihen.
 *
 * Eigenständige Events: nur Status "open" | "active" | "umfrage" (wie im Admin-Panel) —
 * vergangene/abgeschlossene Standalone-Events werden im Widget nicht gebraucht.
 *
 * Event-Reihen: ALLE Events der Reihe, ungefiltert nach Status (neueste zuerst). Anders
 * als bei Standalone-Events soll man innerhalb einer Reihe bewusst auch auf vergangene
 * Events zugreifen können (z.B. um ein älteres Ergebnis zu korrigieren).
 */
const RELEVANT_STATUSES = ["open", "active", "umfrage"];

const eventSelect = {
  id: true,
  title: true,
  status: true,
  format: true,
  tournamentStatus: true,
  startAt: true,
  _count: { select: { participants: true } },
} as const;

function toWidgetEvent(e: {
  id: string;
  title: string;
  status: string;
  format: string | null;
  tournamentStatus: string | null;
  startAt: Date;
  _count: { participants: number };
}) {
  return {
    id: e.id,
    name: e.title,
    status: e.status,
    format: e.format,
    tournamentStatus: e.tournamentStatus,
    date: e.startAt,
    participantCount: e._count.participants,
  };
}

export async function GET(req: NextRequest) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const [standaloneEvents, allSeries] = await Promise.all([
    prisma.event.findMany({
      where: { seriesId: null, status: { in: RELEVANT_STATUSES } },
      orderBy: { startAt: "asc" },
      select: eventSelect,
    }),
    prisma.eventSeries.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        events: {
          orderBy: { startAt: "desc" },
          select: eventSelect,
        },
      },
    }),
  ]);

  return NextResponse.json({
    standaloneEvents: standaloneEvents.map(toWidgetEvent),
    series: allSeries
      .filter((s) => s.events.length > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        eventCount: s.events.length,
        events: s.events.map(toWidgetEvent),
      })),
  });
}

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
 * Event-Reihen: ALLE Events der Reihe, ungefiltert nach Status, chronologisch aufsteigend
 * (das naechste anstehende Event zuerst). Anders als bei Standalone-Events soll man innerhalb
 * einer Reihe bewusst auch auf vergangene Events zugreifen können (z.B. um ein älteres
 * Ergebnis zu korrigieren) — die stehen entsprechend weiter unten in der Liste.
 */
const RELEVANT_STATUSES = ["open", "active", "umfrage"];
const FINISHED_STATUSES = ["finished", "closed"];

/**
 * Innerhalb einer Reihe: offene/aktive Events chronologisch aufsteigend (naechstes zuerst),
 * beendete/geschlossene Events dahinter angehaengt (ebenfalls aufsteigend). Ein reines
 * "startAt asc" wuerde alte, laengst beendete Events vor den kommenden einsortieren.
 */
function sortSeriesEvents<T extends { status: string; startAt: Date }>(events: T[]): T[] {
  const upcoming = events.filter((e) => !FINISHED_STATUSES.includes(e.status));
  const finished = events.filter((e) => FINISHED_STATUSES.includes(e.status));
  const byStartAtAsc = (a: T, b: T) => a.startAt.getTime() - b.startAt.getTime();
  return [...upcoming.sort(byStartAtAsc), ...finished.sort(byStartAtAsc)];
}

const eventSelect = {
  id: true,
  title: true,
  status: true,
  format: true,
  tournamentStatus: true,
  startAt: true,
  category: true,
  genre: true,
  _count: { select: { participants: true } },
} as const;

function toWidgetEvent(e: {
  id: string;
  title: string;
  status: string;
  format: string | null;
  tournamentStatus: string | null;
  startAt: Date;
  category: string;
  genre: string | null;
  _count: { participants: number };
}) {
  return {
    id: e.id,
    name: e.title,
    status: e.status,
    format: e.format,
    tournamentStatus: e.tournamentStatus,
    date: e.startAt,
    category: e.category,
    genre: e.genre,
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
        events: sortSeriesEvents(s.events).map(toWidgetEvent),
      })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { computeStatStandings, type StatConfig } from "@/lib/series-event-points";

type LegacyRow = { userId: string; points: number; participations: number; stats: Record<string, number> };

/**
 * GET /api/widget/series/[seriesId]/ranking
 *
 * Live-Gesamttabelle einer Event-Reihe fürs Widget — ruft dieselbe computeStatStandings()
 * auf, die auch /events/series/[id]/page.tsx nutzt (src/lib/series-event-points.ts), mit
 * identischer Prisma-Query-Form, damit beide Ansichten exakt dieselben Zahlen zeigen.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { seriesId } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        include: {
          registrations: {
            select: {
              userId: true,
              role: true,
              user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
            },
          },
          matches: {
            select: { entries: { select: { userId: true, statsJson: true } } },
          },
        },
      },
    },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const statCfg: StatConfig = (() => {
    try {
      return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : null;
    } catch {
      return null;
    }
  })() ?? { participationPoints: 0, stats: [] };

  const legacyRows: LegacyRow[] = (() => {
    try {
      return series.legacyStandings ? JSON.parse(series.legacyStandings) : [];
    } catch {
      return [];
    }
  })();

  const { rows } = computeStatStandings(series.events, statCfg, legacyRows);

  const userMap = new Map<string, { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number }>();
  for (const ev of series.events) {
    for (const r of ev.registrations) userMap.set(r.userId, r.user);
  }
  const missingUserIds = rows.map((r) => r.userId).filter((uid) => !userMap.has(uid));
  if (missingUserIds.length > 0) {
    const fetchedUsers = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, name: true, username: true, image: true, rankPoints: true },
    });
    for (const u of fetchedUsers) userMap.set(u.id, u);
  }

  const ranking = rows.map((r, i) => {
    const user = userMap.get(r.userId);
    return {
      placement: i + 1,
      userId: r.userId,
      displayName: user?.username ?? user?.name ?? "Unbekannt",
      image: user?.image ?? null,
      rankPoints: user?.rankPoints ?? 0,
      totalPoints: r.totalPoints,
      participations: r.participations,
      spectatorParticipations: r.spectatorParticipations,
      stats: r.stats,
    };
  });

  return NextResponse.json({ seriesName: series.name, ranking });
}

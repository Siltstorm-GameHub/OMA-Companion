import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

type SeriesStatConfig = {
  participationPoints: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
};

type StandingsRaw = Record<string, Record<string, number>>;
type SeriesStandings = {
  lastUpdated: string;
  processedEventIds: string[];
  raw: StandingsRaw;
};

/**
 * POST /api/admin/events/[id]/complete
 * Body: { mvpUserId?, winnerStatField?, seriesWinnerTargetField? }
 *
 * Schließt ein Event ab:
 * - Setzt status → "finished"
 * - Speichert completionData am Event
 * - Aktualisiert seriesStandingsJson an der Eventreihe
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("moderator");
  const { id: eventId } = await params;

  const body = await req.json() as {
    mvpUserId?: string;
    winnerStatField?: string;
    seriesWinnerTargetField?: string;
  };

  // Event laden
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: { select: { userId: true } },
      series: true,
      matches: {
        include: {
          entries: { select: { userId: true, statsJson: true } },
        },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.completionData) return NextResponse.json({ error: "Event bereits abgeschlossen" }, { status: 409 });
  if (!event.seriesId || !event.series) return NextResponse.json({ error: "Event ist nicht Teil einer Reihe" }, { status: 400 });

  // Stat-Config der Reihe
  const statCfg: SeriesStatConfig = (() => {
    try { return event.series.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : {}; }
    catch { return {}; }
  })();

  // Per-User-Stats aus Match-Einträgen berechnen
  const userStats: Record<string, Record<string, number>> = {};
  if (event.matches.length > 0) {
    for (const match of event.matches) {
      for (const entry of match.entries) {
        if (!entry.userId || !entry.statsJson) continue;
        let parsed: Record<string, number> = {};
        try { parsed = JSON.parse(entry.statsJson); } catch { continue; }
        if (!userStats[entry.userId]) userStats[entry.userId] = {};
        for (const [field, val] of Object.entries(parsed)) {
          userStats[entry.userId][field] = (userStats[entry.userId][field] ?? 0) + Number(val);
        }
      }
    }
  }

  // Event-Gewinner ermitteln (höchster Wert im winnerStatField)
  let eventWinnerId: string | undefined;
  if (body.winnerStatField) {
    let maxVal = -Infinity;
    for (const [uid, stats] of Object.entries(userStats)) {
      const val = stats[body.winnerStatField] ?? 0;
      if (val > maxVal) { maxVal = val; eventWinnerId = uid; }
    }
  }

  // Bisherige Series-Standings laden
  const existingJson: SeriesStandings = (() => {
    try { return event.series.seriesStandingsJson ? JSON.parse(event.series.seriesStandingsJson) : { lastUpdated: "", processedEventIds: [], raw: {} }; }
    catch { return { lastUpdated: "", processedEventIds: [], raw: {} }; }
  })();

  const raw = existingJson.raw as StandingsRaw;

  function addToUser(userId: string, field: string, value: number) {
    if (!raw[userId]) raw[userId] = {};
    raw[userId][field] = (raw[userId][field] ?? 0) + value;
  }

  // Teilnahme + passende Stats für jeden Registrierten
  for (const { userId } of event.registrations) {
    addToUser(userId, "participations", 1);

    const eStats = userStats[userId] ?? {};
    for (const { field } of (statCfg.stats ?? [])) {
      const val = eStats[field] ?? 0;
      if (val > 0) addToUser(userId, field, val);
    }
  }

  // Gewinner +1 auf Ziel-Stat
  if (eventWinnerId && body.seriesWinnerTargetField) {
    addToUser(eventWinnerId, body.seriesWinnerTargetField, 1);
  }

  // MVP +1 auf MVP-Stat-Feld
  if (body.mvpUserId && statCfg.mvpStatField) {
    addToUser(body.mvpUserId, statCfg.mvpStatField, 1);
  }

  const updatedStandings: SeriesStandings = {
    lastUpdated: new Date().toISOString(),
    processedEventIds: [...existingJson.processedEventIds, eventId],
    raw,
  };

  const completionData = {
    mvpUserId:              body.mvpUserId ?? null,
    winnerStatField:        body.winnerStatField ?? null,
    seriesWinnerTargetField: body.seriesWinnerTargetField ?? null,
    eventWinnerId:          eventWinnerId ?? null,
    lockedAt:               new Date().toISOString(),
  };

  // Alles in einer Transaktion speichern
  await prisma.$transaction([
    prisma.event.update({
      where: { id: eventId },
      data: {
        status:         "finished",
        completionData: JSON.stringify(completionData),
      },
    }),
    prisma.eventSeries.update({
      where: { id: event.seriesId },
      data: { seriesStandingsJson: JSON.stringify(updatedStandings) },
    }),
  ]);

  // Push an alle Teilnehmer
  const participantIds = event.registrations.map((r) => r.userId);
  sendPushToUsers(participantIds, {
    title: `✅ Event abgeschlossen: ${event.title}`,
    body:  "Schau dir deine Punkte und das Ergebnis an!",
    url:   "/events",
  }).catch(() => {});

  return NextResponse.json({ ok: true, completionData, eventWinnerId });
}

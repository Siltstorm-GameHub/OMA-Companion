// Reihen-Kontext für die Seite eines einzelnen Reihen-Termins: "Termin 2 von 8", vorheriger und
// nächster Termin, Mini-Zeitstrahl, eigener Platz in der Reihentabelle und der Hauptpreis der
// Endwertung. Dieselben Quellen wie die Reihen-Seite (computeStatStandings, timelineStates, eventPayout).

import { prisma } from "@/lib/prisma";
import { computeStatStandings, type LegacyStandingRow, type StatConfig } from "@/lib/series-event-points";
import { timelineStates, type TimelineState } from "@/lib/series-timeline";
import { eventPayout } from "@/lib/placement-rewards";
import { resolveSeriesColor } from "@/lib/series-icons";
import { cachedInMemory } from "@/lib/memory-cache";

export type SeriesContextEvent = { id: string; title: string; startAt: Date; state: TimelineState };

export interface SeriesContext {
  id: string;
  name: string;
  color: string;
  /** 1-basiert */
  position: number;
  total: number;
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  events: SeriesContextEvent[];
  /** Eigener Platz in der Reihentabelle (null = noch nicht drin) */
  myPlace: number | null;
  myPoints: number;
  tableSize: number;
  /** Hauptpreis der Endwertung (Platz 1) */
  finalFirst: { coins: number; rankPoints: number } | null;
}

const isGamePhaseDone = (completionData: string | null) => {
  if (!completionData) return false;
  try { return (JSON.parse(completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
  catch { return false; }
};

/**
 * Lädt den Reihen-Kontext. Der teure, nicht nutzerbezogene Teil (alle Termine der Reihe samt
 * Match-Einträgen + komplette Reihentabelle) wird 20 s pro Server-Instanz gecacht — die Eventseite
 * wird während eines Termins oft neu geladen (router.refresh nach jeder Meldung). Pro Request kommt
 * nur noch der eigene Platz dazu.
 */
export async function loadSeriesContext(seriesId: string, eventId: string, userId: string | null | undefined): Promise<SeriesContext | null> {
  const base = await cachedInMemory(`series-context:${seriesId}:${eventId}`, 20_000, () => loadSeriesBase(seriesId, eventId));
  if (!base) return null;
  const { standings, ...rest } = base;
  const i = userId ? standings.findIndex(r => r.userId === userId) : -1;
  return { ...rest, myPlace: i >= 0 ? i + 1 : null, myPoints: i >= 0 ? standings[i].totalPoints : 0 };
}

async function loadSeriesBase(seriesId: string, eventId: string) {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: {
      id: true, name: true, icon: true, seriesStatConfig: true, legacyStandings: true, placementRewardsJson: true,
      events: {
        where: { OR: [{ hidden: false }, { id: eventId }] },
        orderBy: { startAt: "asc" },
        select: {
          id: true, title: true, startAt: true, status: true, completionData: true, finalRankingJson: true, goalStateJson: true,
          registrations: { select: { userId: true, role: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      },
    },
  });
  if (!series) return null;

  const idx = series.events.findIndex(e => e.id === eventId);
  if (idx < 0) return null;

  const states = timelineStates(series.events.map(e => ({ status: e.status, gamePhaseDone: isGamePhaseDone(e.completionData) })));
  const events: SeriesContextEvent[] = series.events.map((e, i) => ({ id: e.id, title: e.title, startAt: e.startAt, state: states[i] }));

  // Reihentabelle (für den eigenen Platz) — gleiche Berechnung wie die Reihen-Seite,
  // Tabelle = alle mit Punkten oder Teilnahme
  let standings: { userId: string; totalPoints: number }[] = [];
  if (series.seriesStatConfig) {
    try {
      const cfg = JSON.parse(series.seriesStatConfig) as StatConfig;
      const legacy: LegacyStandingRow[] = series.legacyStandings ? JSON.parse(series.legacyStandings) : [];
      standings = computeStatStandings(series.events, cfg, legacy).rows
        .filter(r => r.totalPoints > 0 || r.participations > 0)
        .map(r => ({ userId: r.userId, totalPoints: r.totalPoints }));
    } catch { /* kaputte Konfiguration → kein Platz */ }
  }
  const tableSize = standings.length;

  const finalFirst = eventPayout({ seriesId: series.id, placementRewardsJson: null, series }).seriesFinal?.find(p => p.place === 1) ?? null;
  const prev = series.events[idx - 1];
  const next = series.events[idx + 1];

  return {
    id: series.id,
    name: series.name,
    color: resolveSeriesColor(series.icon),
    position: idx + 1,
    total: series.events.length,
    prev: prev ? { id: prev.id, title: prev.title } : null,
    next: next ? { id: next.id, title: next.title } : null,
    events,
    standings, tableSize,
    finalFirst: finalFirst ? { coins: finalFirst.coins, rankPoints: finalFirst.rankPoints } : null,
  };
}

/** Ausschnitt des Zeitstrahls um den aktuellen Termin (für die schmale Leiste): höchstens `size` Punkte. */
export function timelineWindow<T>(items: T[], index: number, size = 9): { items: T[]; start: number; hiddenBefore: number; hiddenAfter: number } {
  if (items.length <= size) return { items, start: 0, hiddenBefore: 0, hiddenAfter: 0 };
  const half = Math.floor(size / 2);
  const start = Math.min(Math.max(0, index - half), items.length - size);
  return { items: items.slice(start, start + size), start, hiddenBefore: start, hiddenAfter: items.length - start - size };
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSeriesManager } from "@/lib/roles";
import { POST as completeEventRoute } from "@/app/api/admin/events/[id]/complete/route";
import { buildRecompleteBody } from "@/lib/event-recomplete";
import { computeEventPoints, type StatConfig } from "@/lib/series-event-points";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Reihen, deren Endabrechnung schon gelaufen ist — dort würde ein Neuberechnen die Tabelle
 *  verändern, ohne die bereits vergebenen Endplatzierungs-Belohnungen anzupassen. */
const LOCKED_SERIES_STATUSES = ["finished", "closed", "archived"];

/**
 * POST /api/admin/series/[id]/recalculate
 *
 * Rechnet alle beendeten Events der Reihe mit den AKTUELLEN Reihen-Einstellungen neu — genau so,
 * als hätte man bei jedem Event auf der Ergebnis-Seite "Ergebnisse bestätigen" geklickt: derselbe
 * Abschluss-Endpunkt (gleiche Sperre, gleiche Diff-Buchung) mit den zuletzt gespeicherten Werten
 * (Sieger, Platzierung, MVP, Ausschlüsse, Umfrage-Sieger bleiben unverändert).
 * Antwort: Anzahl neu berechneter Events, Fehlschläge und die Summe der Änderungen.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: seriesId } = await ctx.params;
  await requireSeriesManager(seriesId);

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: { status: true, seriesStatConfig: true },
  });
  if (!series) return NextResponse.json({ error: "Reihe nicht gefunden" }, { status: 404 });
  if (LOCKED_SERIES_STATUSES.includes(series.status)) {
    return NextResponse.json({ error: "Die Reihe ist bereits abgeschlossen — Neuberechnen ist nur bei laufenden Reihen möglich." }, { status: 400 });
  }
  const cfg: StatConfig = (() => {
    try { return series.seriesStatConfig ? JSON.parse(series.seriesStatConfig) : { participationPoints: 0, stats: [] }; }
    catch { return { participationPoints: 0, stats: [] }; }
  })();

  const loadEvents = () => prisma.event.findMany({
    where: { seriesId, status: "finished", completionData: { not: null } },
    orderBy: { startAt: "asc" },
    select: {
      id: true, title: true, completionData: true, finalRankingNote: true,
      registrations: { select: { userId: true, role: true } },
      matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
    },
  });
  const events = await loadEvents();
  if (events.length === 0) return NextResponse.json({ ok: true, recalculated: 0, failed: [], delta: { coins: 0, rankPoints: 0, tablePoints: 0 } });

  // Vorher-Stand für die Zusammenfassung: Münzen/Rang-Punkte aller Beteiligten + Tabellenpunkte
  const userIds = [...new Set(events.flatMap(e => e.registrations.map(r => r.userId)))];
  const sumUsers = async () => {
    const agg = await prisma.user.aggregate({ where: { id: { in: userIds } }, _sum: { points: true, rankPoints: true } });
    return { coins: agg._sum.points ?? 0, rankPoints: agg._sum.rankPoints ?? 0 };
  };
  const sumTable = (evs: typeof events) => evs.reduce((total, ev) =>
    total + Object.values(computeEventPoints(ev, cfg).pointsByUser).reduce((a, b) => a + b, 0), 0);
  const before = { ...(await sumUsers()), tablePoints: sumTable(events) };

  let recalculated = 0;
  const failed: { id: string; title: string; error: string }[] = [];
  for (const ev of events) {
    const internalReq = new NextRequest(`http://internal.local/api/admin/events/${ev.id}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildRecompleteBody(ev.completionData, ev.finalRankingNote)),
    });
    try {
      const res = await completeEventRoute(internalReq, { params: Promise.resolve({ id: ev.id }) });
      if (res.ok) recalculated++;
      else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        failed.push({ id: ev.id, title: ev.title, error: err.error ?? `Fehler ${res.status}` });
      }
    } catch (e) {
      failed.push({ id: ev.id, title: ev.title, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const after = { ...(await sumUsers()), tablePoints: sumTable(await loadEvents()) };
  return NextResponse.json({
    ok: true,
    recalculated,
    failed,
    delta: {
      coins: after.coins - before.coins,
      rankPoints: after.rankPoints - before.rankPoints,
      tablePoints: after.tablePoints - before.tablePoints,
    },
  });
}

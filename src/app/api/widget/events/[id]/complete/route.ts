import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * POST /api/widget/events/[id]/complete
 * Body: { finalRanking?: string[] }  — optional; wenn weggelassen, wird die aktuelle
 * Live-Rangliste (gleiche Formel wie GET .../ranking) serverseitig berechnet und als
 * finalRanking verwendet.
 *
 * WICHTIG: Dieser Endpoint reimplementiert NICHT die Abschluss-Logik (Punktevergabe,
 * Discord-Post, Badges, Wanderpokal, Serien-Standings, Umfrage-Erzeugung, …) — das ist zu
 * riskant, um separat zu pflegen. Stattdessen wird der bestehende, produktiv genutzte
 * Admin-Endpoint /api/admin/events/[id]/complete intern aufgerufen, authentifiziert über
 * denselben CRON_SECRET-Mechanismus, den auch der Poll-Auto-Close-Cron nutzt (siehe
 * isSystemCall() in complete/route.ts). So bleibt exakt eine Implementierung der
 * Geschäftslogik bestehen.
 *
 * finalRanking gewinnt in JEDEM effectiveWinnerMode (siehe complete/route.ts): sowohl im
 * "manual"- als auch im "stat"-Modus wird bei gesetztem finalRanking dessen erster Eintrag
 * als Sieger verwendet — nur "bracket"-Modus ignoriert es (nutzt das bereits gespeicherte
 * finalRankingJson). Damit deckt eine simple Rangliste-basierte Reihenfolge alle Formate ab.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET ist nicht konfiguriert — Turnierabschluss ueber das Widget ist nicht moeglich." },
      { status: 500 }
    );
  }

  const { id: eventId } = await params;
  const body = await req.json().catch(() => ({}));
  let finalRanking: string[] | undefined = Array.isArray(body?.finalRanking) ? body.finalRanking : undefined;

  if (!finalRanking) {
    const rankingRes = await fetch(new URL(`/api/widget/events/${eventId}/ranking`, req.nextUrl.origin), {
      headers: { Authorization: req.headers.get("authorization") ?? "" },
    });
    if (rankingRes.ok) {
      const data = await rankingRes.json();
      finalRanking = (data.ranking as { userId: string }[]).map((r) => r.userId);
    }
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const upstream = await fetch(new URL(`/api/admin/events/${eventId}/complete`, req.nextUrl.origin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({
      finalRanking: finalRanking && finalRanking.length > 0 ? finalRanking : undefined,
    }),
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

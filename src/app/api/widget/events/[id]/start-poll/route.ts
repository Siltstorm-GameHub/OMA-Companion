import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { createPollsForEvent, parsePollsConfigJson } from "@/lib/event-polls";

/**
 * POST /api/widget/events/[id]/start-poll
 *
 * Startet die konfigurierten Umfragen (Event.pollsConfigJson, sonst Reihen-Konfiguration)
 * SOFORT ("jetzt" als Start-Anker, wie beim regulaeren Event-Abschluss — siehe Kommentar in
 * complete/route.ts) — unabhaengig vom vollen Turnierabschluss. Bewusst schlanker als
 * complete/route.ts: legt nur die EventPoll-Zeilen an und setzt den Event-Status auf
 * "umfrage", OHNE Punkte/Discord/Badges/Wanderpokal-Nebenwirkungen — das sind reine
 * Abschluss-Konzepte. Existierende, bereits genutzte Umfragen werden nicht angetastet
 * (createPollsForEvent ueberspringt Labels, die schon existieren).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      pollsConfigJson: true,
      series: { select: { pollsConfigJson: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  let pollsCfg = parsePollsConfigJson(event.pollsConfigJson);
  if (pollsCfg.length === 0) pollsCfg = parsePollsConfigJson(event.series?.pollsConfigJson);
  if (pollsCfg.length === 0) {
    return NextResponse.json(
      { error: "Fuer dieses Event/diese Reihe sind keine Umfragen konfiguriert." },
      { status: 400 }
    );
  }

  const existingLabels = new Set(
    (await prisma.eventPoll.findMany({ where: { eventId }, select: { label: true } })).map((p) => p.label)
  );
  const newLabels = pollsCfg.filter((c) => !existingLabels.has(c.label));
  if (newLabels.length === 0) {
    return NextResponse.json(
      { error: "Alle konfigurierten Umfragen fuer dieses Event laufen bereits oder wurden schon ausgewertet." },
      { status: 409 }
    );
  }

  await createPollsForEvent(eventId, new Date(), pollsCfg);

  if (event.status !== "umfrage" && event.status !== "finished") {
    await prisma.event.update({ where: { id: eventId }, data: { status: "umfrage" } });
  }

  const created = await prisma.eventPoll.findMany({
    where: { eventId, label: { in: newLabels.map((c) => c.label) } },
    select: { id: true, label: true, question: true, startAt: true, endAt: true },
  });

  return NextResponse.json({ success: true, polls: created }, { status: 201 });
}

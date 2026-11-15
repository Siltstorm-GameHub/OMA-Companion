import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEventIcs } from "@/lib/ics";

/**
 * GET /api/events/[id]/ics — Event als Kalender-Datei ("Zum Kalender hinzufügen").
 * Nur sichtbare Events (ausgeblendete Events und Events ausgeblendeter Reihen → 404).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, startAt: true, endAt: true, hidden: true, series: { select: { hidden: true } } },
  });
  if (!ev || ev.hidden || ev.series?.hidden) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const ics = buildEventIcs({
    id: ev.id,
    title: ev.title,
    description: ev.description,
    startAt: ev.startAt,
    endAt: ev.endAt,
    url: `${new URL(req.url).origin}/tournament/${ev.id}`,
  });
  const filename = ev.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "event";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}.ics"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/events?status=active|upcoming|all
 *
 * Für das Touchscreen-Widget: schlanke Liste aller Turnier-Events, ohne die Discord-/
 * Registrierungs-Extras aus /api/events. `status`:
 *   - "active"   → tournamentStatus === "active" (Turnier läuft gerade)
 *   - "upcoming" → tournamentStatus ist null oder "pending" (noch nicht gestartet)
 *   - "all"      → keine Einschränkung (Default)
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "all";

  const where: Record<string, unknown> = {};
  if (status === "active") {
    where.tournamentStatus = "active";
  } else if (status === "upcoming") {
    where.tournamentStatus = { in: [null, "pending"] };
  }

  const events = await prisma.event.findMany({
    where,
    include: { _count: { select: { participants: true } } },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      name: e.title,
      format: e.format,
      tournamentStatus: e.tournamentStatus,
      date: e.startAt,
      participantCount: e._count.participants,
    })),
  });
}

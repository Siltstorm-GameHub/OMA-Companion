import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/events/[id]/candidates
 *
 * Alle User mit EventRegistration für dieses Event, die noch KEINEN TournamentParticipant-
 * Eintrag haben — die Kandidatenliste, aus der am Touchscreen neue Teilnehmer eingetragen
 * werden.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const [registrations, participants] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, username: true } } },
    }),
    prisma.tournamentParticipant.findMany({
      where: { eventId },
      select: { userId: true },
    }),
  ]);

  const participantUserIds = new Set(participants.map((p) => p.userId));

  const candidates = registrations
    .filter((r) => !participantUserIds.has(r.userId))
    .map((r) => ({
      userId: r.userId,
      displayName: r.user.username ?? r.user.name ?? "Unbekannt",
    }));

  return NextResponse.json({ candidates });
}

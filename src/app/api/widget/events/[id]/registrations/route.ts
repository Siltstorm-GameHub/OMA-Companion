import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/events/[id]/registrations
 *
 * Alle An-/Abmeldungen (EventRegistration) fuer dieses Event — das ist die tatsaechliche
 * "wer ist dabei"-Liste in OMA-Companion (Rolle "player"|"spectator"), unabhaengig vom
 * Turnierformat. Ersetzt fuers Widget die vorherige TournamentParticipant-basierte Sicht,
 * die fuer ffa/coop_stats/avg_stats ohnehin leer war (siehe Kommentar in ../route.ts).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId },
    include: { user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    registrations: registrations.map((r) => ({
      userId: r.userId,
      displayName: r.user.username ?? r.user.name ?? "Unbekannt",
      image: r.user.image ?? null,
      rankPoints: r.user.rankPoints ?? 0,
      role: r.role,
    })),
  });
}

/**
 * POST /api/widget/events/[id]/registrations
 * Body: { userId: string, role?: "player" | "spectator" }  (Default: "player")
 *
 * Identische Semantik zu POST /api/events/[id]/bulk-register (nur fuer einen User statt
 * eines Arrays). 409 bei bereits bestehender Registrierung.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const { userId, role } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
  const registrationRole = role === "spectator" ? "spectator" : "player";

  const existing = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits angemeldet" }, { status: 409 });

  await prisma.eventRegistration.create({ data: { userId, eventId, role: registrationRole } });
  return NextResponse.json({ success: true }, { status: 201 });
}

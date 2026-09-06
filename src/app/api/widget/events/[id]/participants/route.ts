import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * POST /api/widget/events/[id]/participants
 * Body: { userId: string }
 *
 * Trägt einen Teilnehmer ein (seed = aktueller Max-Seed + 1, oder 1 falls noch keiner
 * existiert). 409 bei Doppel-Eintragung (@@unique([eventId, userId]) auf
 * TournamentParticipant) statt eines rohen Prisma-Fehlers.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  const maxSeedRow = await prisma.tournamentParticipant.findFirst({
    where: { eventId },
    orderBy: { seed: "desc" },
    select: { seed: true },
  });
  const nextSeed = (maxSeedRow?.seed ?? 0) + 1;

  try {
    const participant = await prisma.tournamentParticipant.create({
      data: { eventId, userId, seed: nextSeed },
      include: { user: { select: { id: true, name: true, username: true } } },
    });

    return NextResponse.json(
      {
        id: participant.id,
        userId: participant.userId,
        displayName: participant.user.username ?? participant.user.name ?? "Unbekannt",
        seed: participant.seed,
        eliminated: participant.eliminated,
        finalRank: participant.finalRank,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Bereits Teilnehmer" }, { status: 409 });
    }
    throw err;
  }
}

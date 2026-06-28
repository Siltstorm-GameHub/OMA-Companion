import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// POST /api/lul/polls/[id]/vote — Stimme abgeben oder ändern (UPSERT, kein DELETE)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: pollId } = await params;
  const { targetId } = await req.json() as { targetId: string };
  if (!targetId) return NextResponse.json({ error: "targetId fehlt" }, { status: 400 });

  const poll = await prisma.lulPoll.findUnique({ where: { id: pollId } });
  if (!poll) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  if (poll.status === "closed") return NextResponse.json({ error: "Umfrage bereits geschlossen" }, { status: 409 });
  if (poll.endsAt < new Date()) return NextResponse.json({ error: "Abstimmung beendet" }, { status: 409 });

  // Prüfen ob targetId ein gültiger Kandidat ist (nicht ausgeschlossen)
  const excluded: string[] = poll.excludedUserIds
    ? (JSON.parse(poll.excludedUserIds) as string[])
    : [];
  if (excluded.includes(targetId)) {
    return NextResponse.json({ error: "Dieser Nutzer ist von der Abstimmung ausgeschlossen" }, { status: 400 });
  }

  // Prüfen ob targetId in den Spieltag-Entries mit passendem role vorhanden ist
  const entry = await prisma.lulEntry.findFirst({
    where: { spieltagId: poll.spieltagId, userId: targetId, role: poll.type },
  });
  if (!entry) {
    return NextResponse.json({ error: "Ungültiger Kandidat" }, { status: 400 });
  }

  const vote = await prisma.lulPollVote.upsert({
    where:  { pollId_voterId: { pollId, voterId: session.user.id } },
    create: { pollId, voterId: session.user.id, targetId },
    update: { targetId },
  });

  return NextResponse.json(vote);
}

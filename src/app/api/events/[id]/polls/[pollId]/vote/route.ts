import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pollId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id: eventId, pollId } = await params;
  const userId = session.user.id;

  const { targetId } = await req.json() as { targetId: string };
  if (!targetId) return NextResponse.json({ error: "targetId fehlt" }, { status: 400 });

  const poll = await prisma.eventPoll.findUnique({ where: { id: pollId } });
  if (!poll || poll.eventId !== eventId) {
    return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  }

  const now = new Date();
  if (now < poll.startAt || now > poll.endAt) {
    return NextResponse.json({ error: "Abstimmung ist nicht aktiv" }, { status: 409 });
  }

  // Check voter eligibility
  if (poll.voterEligibility !== "all") {
    const reg = await prisma.eventRegistration.findFirst({
      where: { eventId, userId },
    });
    if (!reg) {
      return NextResponse.json({ error: "Keine Teilnahme-Berechtigung" }, { status: 403 });
    }
    if (poll.voterEligibility === "players" && reg.role !== "player") {
      return NextResponse.json({ error: "Nur Spieler dürfen abstimmen" }, { status: 403 });
    }
    if (poll.voterEligibility === "spectators" && reg.role !== "spectator") {
      return NextResponse.json({ error: "Nur Zuschauer dürfen abstimmen" }, { status: 403 });
    }
    if (poll.voterEligibility === "participants" && reg.role !== "player" && reg.role !== "spectator") {
      return NextResponse.json({ error: "Nur Teilnehmer dürfen abstimmen" }, { status: 403 });
    }
  }

  // Ausgeschlossene Kandidaten sind auch dann keine gültige Wahl, wenn sie noch registriert sind
  let excludedUserIds: string[] = [];
  try { excludedUserIds = poll.excludedUserIds ? JSON.parse(poll.excludedUserIds) : []; } catch { /* ignore */ }
  if (excludedUserIds.includes(targetId)) {
    return NextResponse.json({ error: "Dieser Kandidat wurde von der Wahl ausgeschlossen" }, { status: 400 });
  }

  // Validate targetId is a valid option
  if (poll.answerType === "players" || poll.answerType === "spectators") {
    const targetRole = poll.answerType === "players" ? "player" : "spectator";
    const targetReg = await prisma.eventRegistration.findFirst({
      where: { eventId, userId: targetId, role: targetRole },
    });
    if (!targetReg) {
      return NextResponse.json({ error: "Ungültiger Kandidat" }, { status: 400 });
    }
  } else if (poll.answerType === "custom") {
    let customAnswers: string[] = [];
    try { customAnswers = poll.customAnswers ? JSON.parse(poll.customAnswers) : []; } catch { /* ignore */ }
    if (!customAnswers.includes(targetId)) {
      return NextResponse.json({ error: "Ungültige Antwort" }, { status: 400 });
    }
  }

  const existingVote = await prisma.eventPollVote.findUnique({
    where: { pollId_voterId: { pollId, voterId: userId } },
  });
  const changed = !!existingVote && existingVote.targetId !== targetId;

  await prisma.eventPollVote.upsert({
    where:  { pollId_voterId: { pollId, voterId: userId } },
    create: { pollId, voterId: userId, targetId },
    update: { targetId },
  });

  return NextResponse.json({ ok: true, targetId, changed });
}

import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { applyMatchResult, ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const { title, round, position, player1Id, player2Id, scheduledAt, notes, entries } = await req.json();

  const resolvedRound = round ?? 1;
  let resolvedPosition = position;
  if (!resolvedPosition) {
    const count = await prisma.match.count({ where: { eventId, round: resolvedRound } });
    resolvedPosition = count + 1;
  }

  const match = await prisma.match.create({
    data: {
      eventId,
      round: resolvedRound,
      position: resolvedPosition,
      title: title ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes ?? null,
      player1Id: player1Id ?? null,
      player2Id: player2Id ?? null,
      entries: entries?.length
        ? {
            create: entries.map((e: { userId?: string; teamId?: string }) => ({
              userId: e.userId ?? null,
              teamId: e.teamId ?? null,
            })),
          }
        : undefined,
    },
    include: { entries: true },
  });

  return NextResponse.json(match, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const body = await req.json();
  const { matchId, winnerId, score1, score2, isDraw, entries, action } = body;

  try {
    const result = await applyMatchResult({ eventId, matchId, winnerId, score1, score2, isDraw, entries, action });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApplyMatchResultError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const { matchId } = await req.json();
  await prisma.match.delete({ where: { id: matchId } });
  return NextResponse.json({ ok: true });
}

/** Spieler zu einem (auch laufenden) Match hinzufügen oder daraus entfernen. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const { matchId, action, userId } = await req.json();
  if (!matchId || !userId || (action !== "add" && action !== "remove")) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }
  const match = await prisma.match.findFirst({ where: { id: matchId, eventId }, select: { id: true } });
  if (!match) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (action === "add") {
    // Später angemeldete Spieler sind evtl. noch keine Turnier-Teilnehmer → hier automatisch aufnehmen.
    let newParticipant = null;
    const participant = await prisma.tournamentParticipant.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { userId: true },
    });
    if (!participant) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });
      const count = await prisma.tournamentParticipant.count({ where: { eventId } });
      newParticipant = await prisma.tournamentParticipant.create({
        data: { eventId, userId, seed: count + 1 },
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      });
    }
    const existing = await prisma.matchEntry.findFirst({ where: { matchId, userId }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Bereits im Match" }, { status: 409 });
    const entry = await prisma.matchEntry.create({ data: { matchId, userId } });
    return NextResponse.json({ entry, participant: newParticipant }, { status: 201 });
  }

  await prisma.matchEntry.deleteMany({ where: { matchId, userId } });
  return NextResponse.json({ ok: true });
}

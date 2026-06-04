import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/app/api/tournaments/route";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const { status, pointsConfig, statFields, generateMatches } = await req.json();

  // Auto-generate round-robin matches from existing participants
  if (generateMatches === "round_robin") {
    const existing = await prisma.match.count({ where: { tournamentId: id } });
    if (existing > 0) {
      return NextResponse.json({ error: "Es existieren bereits Matches. Zuerst alle löschen." }, { status: 409 });
    }
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: id },
      select: { userId: true },
    });
    if (participants.length < 2) {
      return NextResponse.json({ error: "Mindestens 2 Teilnehmer benötigt." }, { status: 400 });
    }
    const matchData = generateRoundRobin(participants.map(p => p.userId), id);
    await prisma.match.createMany({ data: matchData });
    return NextResponse.json({ generated: matchData.length });
  }

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(status       !== undefined && { status }),
      ...(pointsConfig !== undefined && { pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null }),
      ...(statFields   !== undefined && { statFields:   statFields   ? JSON.stringify(statFields)   : null }),
    },
  });

  return NextResponse.json(tournament);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { eventId: true },
  });
  if (!tournament) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Delete in dependency order; MatchEntry cascades from Match, TeamMember from Team
  await prisma.match.deleteMany({ where: { tournamentId: id } });
  await prisma.team.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: id } });
  await prisma.tournament.delete({ where: { id } });

  await prisma.event.update({
    where: { id: tournament.eventId },
    data: { status: "open", type: "community" },
  });

  return NextResponse.json({ ok: true });
}

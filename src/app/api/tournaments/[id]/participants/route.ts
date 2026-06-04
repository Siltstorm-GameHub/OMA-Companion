import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: tournamentId } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  const existing = await prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits Teilnehmer" }, { status: 409 });

  const count = await prisma.tournamentParticipant.count({ where: { tournamentId } });
  const participant = await prisma.tournamentParticipant.create({
    data: { tournamentId, userId, seed: count + 1 },
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
  });
  return NextResponse.json(participant, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: tournamentId } = await params;
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  await prisma.tournamentParticipant.delete({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  return NextResponse.json({ ok: true });
}

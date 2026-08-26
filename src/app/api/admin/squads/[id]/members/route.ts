import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: squadId } = await params;
  await requireModeratorOrSquadCaptain(squadId);
  const { userId, role } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  const existing = await prisma.squadMembership.findUnique({
    where: { squadId_userId: { squadId, userId } },
  });
  if (existing) return NextResponse.json({ error: "Bereits Mitglied" }, { status: 400 });

  const membership = await prisma.squadMembership.create({
    data: { squadId, userId, role: role === "captain" ? "captain" : "member" },
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
  });
  return NextResponse.json(membership, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: squadId } = await params;
  await requireModeratorOrSquadCaptain(squadId);
  const { userId, role } = await req.json();
  if (!userId || (role !== "member" && role !== "captain")) {
    return NextResponse.json({ error: "userId/role fehlt oder ungültig" }, { status: 400 });
  }

  const membership = await prisma.squadMembership.update({
    where: { squadId_userId: { squadId, userId } },
    data: { role },
  });
  return NextResponse.json(membership);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: squadId } = await params;
  await requireModeratorOrSquadCaptain(squadId);
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId fehlt" }, { status: 400 });

  await prisma.squadMembership.deleteMany({ where: { squadId, userId } });
  return NextResponse.json({ ok: true });
}

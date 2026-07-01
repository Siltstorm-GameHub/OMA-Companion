import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { countOccupiedSlots } from "@/lib/gameservers";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: serverId } = await params;
  const body = await req.json().catch(() => ({}));
  const message: string | null = typeof body?.message === "string" ? body.message.trim().slice(0, 500) || null : null;

  const server = await prisma.gameServer.findUnique({ where: { id: serverId } });
  if (!server || !server.isActive) return NextResponse.json({ error: "Server nicht gefunden" }, { status: 404 });

  const existing = await prisma.serverApplication.findUnique({
    where: { serverId_userId: { serverId, userId } },
  });

  const hasActive =
    existing &&
    (existing.status === "pending" ||
      (existing.status === "approved" && (!existing.expiresAt || existing.expiresAt > new Date())));
  if (hasActive) return NextResponse.json({ error: "Bereits beworben oder freigeschaltet" }, { status: 400 });

  const occupied = await countOccupiedSlots(serverId);
  if (occupied >= server.maxSlots) return NextResponse.json({ error: "Server ist voll" }, { status: 400 });

  const application = await prisma.serverApplication.upsert({
    where: { serverId_userId: { serverId, userId } },
    create: { serverId, userId, message },
    update: {
      status: "pending",
      message,
      adminNote: null,
      decidedAt: null,
      decidedBy: null,
      expiresAt: null,
      expiryNotifiedAt: null,
      appliedAt: new Date(),
    },
  });

  return NextResponse.json(application, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id: serverId } = await params;

  await prisma.serverApplication.deleteMany({
    where: { serverId, userId, status: "pending" },
  });

  return NextResponse.json({ ok: true });
}

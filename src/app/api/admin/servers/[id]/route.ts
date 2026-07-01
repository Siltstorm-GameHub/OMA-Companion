import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { countOccupiedSlots, trafficLight } from "@/lib/gameservers";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = (await req.json()) as Partial<{
    name: string;
    game: string;
    description: string | null;
    icon: string | null;
    host: string;
    port: string | null;
    password: string | null;
    connectInfo: string | null;
    maxSlots: number;
    isActive: boolean;
  }>;

  const server = await prisma.gameServer.update({ where: { id }, data: body });
  const occupied = await countOccupiedSlots(server.id);
  return NextResponse.json({ ...server, occupied, light: trafficLight(server.maxSlots - occupied, server.maxSlots) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.gameServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

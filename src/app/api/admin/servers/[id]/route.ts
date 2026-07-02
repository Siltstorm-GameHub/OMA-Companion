import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { countOccupiedSlots, countPendingApplications, trafficLight } from "@/lib/gameservers";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = (await req.json()) as Partial<{
    name: string;
    game: string;
    description: string | null;
    host: string;
    port: string | null;
    password: string | null;
    connectInfo: string | null;
    maxSlots: number;
    isActive: boolean;
  }>;

  const server = await prisma.gameServer.update({ where: { id }, data: body });
  const [occupied, pendingCount] = await Promise.all([countOccupiedSlots(server.id), countPendingApplications(server.id)]);
  return NextResponse.json({ ...server, occupied, pendingCount, light: trafficLight(server.maxSlots - occupied, server.maxSlots) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.gameServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

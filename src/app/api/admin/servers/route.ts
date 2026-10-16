import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { getServersWithAdminCounts, trafficLight } from "@/lib/gameservers";
import { pickServerFields, validateServerInput } from "@/lib/gameserver-input";

export async function GET() {
  await requireRole("moderator");
  return NextResponse.json(await getServersWithAdminCounts());
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("moderator");
  const body = await req.json().catch(() => null);

  const result = validateServerInput(pickServerFields(body));
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const server = await prisma.gameServer.create({
    data: { ...result.data, createdBy: admin.id },
  });

  return NextResponse.json({ ...server, occupied: 0, pendingCount: 0, light: trafficLight(server.maxSlots, server.maxSlots) }, { status: 201 });
}

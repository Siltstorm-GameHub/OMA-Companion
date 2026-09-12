import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const basePoseId = req.nextUrl.searchParams.get("basePoseId");
  const items = await prisma.heroPoseSlot.findMany({
    where: basePoseId ? { basePoseId } : undefined,
    orderBy: { slot: "asc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");

  const body = await req.json() as {
    basePoseId?: string;
    slot?: string;
    anchorX?: number;
    anchorY?: number;
    rotation?: number;
  };

  if (!body.basePoseId?.trim() || !body.slot?.trim()) {
    return NextResponse.json({ error: "basePoseId und slot sind Pflichtfelder" }, { status: 400 });
  }

  const anchorX = Number.isFinite(body.anchorX) ? Math.min(1, Math.max(0, body.anchorX!)) : 0.5;
  const anchorY = Number.isFinite(body.anchorY) ? Math.min(1, Math.max(0, body.anchorY!)) : 0.5;
  const rotation = Number.isFinite(body.rotation) ? ((body.rotation! % 360) + 360) % 360 : 0;

  const item = await prisma.heroPoseSlot.upsert({
    where: { basePoseId_slot: { basePoseId: body.basePoseId.trim(), slot: body.slot.trim() } },
    create: { id: randomUUID(), basePoseId: body.basePoseId.trim(), slot: body.slot.trim(), anchorX, anchorY, rotation },
    update: { anchorX, anchorY, rotation },
  });

  return NextResponse.json({ item });
}

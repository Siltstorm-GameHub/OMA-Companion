import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireRole("admin");
  const items = await prisma.heroAccessory.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await auth();
  const adminId = (session?.user as { id?: string })?.id;
  if (!adminId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    slot?: string;
    imageUrl?: string;
    pivotX?: number;
    pivotY?: number;
  };

  if (!body.name?.trim() || !body.slot?.trim() || !body.imageUrl?.trim()) {
    return NextResponse.json({ error: "name, slot und imageUrl sind Pflichtfelder" }, { status: 400 });
  }

  const pivotX = Number.isFinite(body.pivotX) ? Math.min(1, Math.max(0, body.pivotX!)) : 0;
  const pivotY = Number.isFinite(body.pivotY) ? Math.min(1, Math.max(0, body.pivotY!)) : 0.5;

  const item = await prisma.heroAccessory.create({
    data: {
      id:        randomUUID(),
      name:      body.name.trim(),
      slot:      body.slot.trim(),
      imageUrl:  body.imageUrl.trim(),
      pivotX,
      pivotY,
      createdBy: adminId,
    },
  });

  return NextResponse.json({ item });
}

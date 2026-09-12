import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const basePoseId = req.nextUrl.searchParams.get("basePoseId");
  const items = await prisma.heroAccessory.findMany({
    where: basePoseId ? { basePoseId } : undefined,
    orderBy: { createdAt: "desc" },
  });
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
    basePoseId?: string;
    anchorX?: number;
    anchorY?: number;
    width?: number;
    height?: number;
  };

  if (!body.name?.trim() || !body.slot?.trim() || !body.imageUrl?.trim() || !body.basePoseId?.trim() || !body.width || !body.height) {
    return NextResponse.json({ error: "name, slot, imageUrl, basePoseId, width und height sind Pflichtfelder" }, { status: 400 });
  }

  const anchorX = Number.isFinite(body.anchorX) ? Math.min(1, Math.max(0, body.anchorX!)) : 0.5;
  const anchorY = Number.isFinite(body.anchorY) ? Math.min(1, Math.max(0, body.anchorY!)) : 0.5;

  const item = await prisma.heroAccessory.create({
    data: {
      id:         randomUUID(),
      name:       body.name.trim(),
      slot:       body.slot.trim(),
      imageUrl:   body.imageUrl.trim(),
      width:      Math.round(body.width),
      height:     Math.round(body.height),
      basePoseId: body.basePoseId.trim(),
      anchorX,
      anchorY,
      createdBy:  adminId,
    },
  });

  return NextResponse.json({ item });
}

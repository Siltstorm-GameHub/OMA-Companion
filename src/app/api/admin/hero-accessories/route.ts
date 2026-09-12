import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  await requireRole("admin");
  const slot = req.nextUrl.searchParams.get("slot");
  const items = await prisma.heroAccessory.findMany({
    where: slot ? { slot } : undefined,
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
    width?: number;
    height?: number;
  };

  if (!body.name?.trim() || !body.slot?.trim() || !body.imageUrl?.trim() || !body.width || !body.height) {
    return NextResponse.json({ error: "name, slot, imageUrl, width und height sind Pflichtfelder" }, { status: 400 });
  }

  const item = await prisma.heroAccessory.create({
    data: {
      id:        randomUUID(),
      name:      body.name.trim(),
      slot:      body.slot.trim(),
      imageUrl:  body.imageUrl.trim(),
      width:     Math.round(body.width),
      height:    Math.round(body.height),
      createdBy: adminId,
    },
  });

  return NextResponse.json({ item });
}

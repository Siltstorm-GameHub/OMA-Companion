import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireRole("admin");
  const items = await prisma.heroBasePose.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await auth();
  const adminId = (session?.user as { id?: string })?.id;
  if (!adminId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json() as {
    classKey?: string;
    name?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
  };

  if (!body.classKey?.trim() || !body.name?.trim() || !body.imageUrl?.trim() || !body.width || !body.height) {
    return NextResponse.json({ error: "classKey, name, imageUrl, width und height sind Pflichtfelder" }, { status: 400 });
  }

  const item = await prisma.heroBasePose.upsert({
    where: { classKey: body.classKey.trim() },
    create: {
      id:        randomUUID(),
      classKey:  body.classKey.trim(),
      name:      body.name.trim(),
      imageUrl:  body.imageUrl.trim(),
      width:     Math.round(body.width),
      height:    Math.round(body.height),
      createdBy: adminId,
    },
    update: {
      name:     body.name.trim(),
      imageUrl: body.imageUrl.trim(),
      width:    Math.round(body.width),
      height:   Math.round(body.height),
    },
  });

  return NextResponse.json({ item });
}

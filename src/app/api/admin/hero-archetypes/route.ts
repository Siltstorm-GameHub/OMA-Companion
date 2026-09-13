import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export async function GET() {
  await requireRole("admin");
  const items = await prisma.heroArchetype.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const session = await auth();
  const adminId = (session?.user as { id?: string })?.id;
  if (!adminId) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json() as { classKey?: string; name?: string };

  if (!body.classKey?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "classKey und name sind Pflichtfelder" }, { status: 400 });
  }

  const item = await prisma.heroArchetype.create({
    data: { id: randomUUID(), classKey: body.classKey.trim(), name: body.name.trim(), createdBy: adminId },
  });

  return NextResponse.json({ item });
}

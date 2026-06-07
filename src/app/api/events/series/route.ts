import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const series = await prisma.eventSeries.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const series = await prisma.eventSeries.create({
    data: { name: name.trim(), description: description?.trim() || null },
  });
  return NextResponse.json(series);
}

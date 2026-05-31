import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const events = await prisma.event.findMany({
    where: status ? { status } : undefined,
    include: { _count: { select: { registrations: true } } },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const body = await req.json();
  const { title, description, game, startAt, maxPlayers, pointReward, type } = body;

  if (!title || !startAt) {
    return NextResponse.json({ error: "Titel und Datum sind Pflichtfelder" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      game,
      startAt: new Date(startAt),
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      pointReward: pointReward ? Number(pointReward) : 50,
      type: type ?? "community",
    },
  });
  return NextResponse.json(event, { status: 201 });
}

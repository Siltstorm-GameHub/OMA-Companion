import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { seasonId, number, game, gameType, platform, scheduledAt, pointsConfig } = await req.json();
  if (!seasonId || !number || !game)
    return NextResponse.json({ error: "seasonId, number und game sind Pflicht" }, { status: 400 });

  const spieltag = await prisma.lulSpieltag.create({
    data: {
      seasonId,
      number,
      game,
      gameType:    gameType    ?? null,
      platform:    platform    ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : JSON.stringify({ "1": 10, "2": 5, "3": 3 }),
      status: "upcoming",
    },
  });
  return NextResponse.json(spieltag, { status: 201 });
}

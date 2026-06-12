import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { seasonId, number, game, gameType, platform, scheduledAt, pointsConfig, isSpecial, title, description, maxPlayers } = await req.json();
  if (!seasonId || !number || (!isSpecial && !game))
    return NextResponse.json({ error: "seasonId, number und game sind Pflicht" }, { status: 400 });

  const spieltag = await prisma.lulSpieltag.create({
    data: {
      seasonId,
      number,
      game:        isSpecial ? (game || null) : game,
      gameType:    gameType    ?? null,
      platform:    platform    ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : JSON.stringify({ "1": 10, "2": 5, "3": 3 }),
      status:      "upcoming",
      isSpecial:   isSpecial   ?? false,
      title:       title       ?? null,
      description: description ?? null,
      maxPlayers:  maxPlayers  ?? null,
    },
  });
  return NextResponse.json(spieltag, { status: 201 });
}

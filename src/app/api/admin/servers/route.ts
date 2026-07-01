import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { countOccupiedSlots, trafficLight } from "@/lib/gameservers";

export async function GET() {
  await requireRole("moderator");

  const servers = await prisma.gameServer.findMany({ orderBy: { createdAt: "desc" } });
  const withCounts = await Promise.all(
    servers.map(async (server) => {
      const occupied = await countOccupiedSlots(server.id);
      return { ...server, occupied, light: trafficLight(server.maxSlots - occupied, server.maxSlots) };
    })
  );

  return NextResponse.json(withCounts);
}

export async function POST(req: NextRequest) {
  const admin = await requireRole("moderator");
  const body = (await req.json()) as {
    name?: string;
    game?: string;
    description?: string;
    host?: string;
    port?: string;
    password?: string;
    connectInfo?: string;
    maxSlots?: number;
  };

  if (!body.name?.trim() || !body.game?.trim() || !body.host?.trim() || !body.maxSlots || body.maxSlots < 1) {
    return NextResponse.json({ error: "Name, Spiel, Host und maxSlots (>=1) sind erforderlich" }, { status: 400 });
  }

  const server = await prisma.gameServer.create({
    data: {
      name: body.name.trim(),
      game: body.game.trim(),
      description: body.description?.trim() || null,
      host: body.host.trim(),
      port: body.port?.trim() || null,
      password: body.password?.trim() || null,
      connectInfo: body.connectInfo?.trim() || null,
      maxSlots: body.maxSlots,
      createdBy: admin.id,
    },
  });

  return NextResponse.json({ ...server, occupied: 0, light: trafficLight(server.maxSlots, server.maxSlots) }, { status: 201 });
}

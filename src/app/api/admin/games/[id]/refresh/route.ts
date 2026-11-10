import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { enrichGame } from "@/lib/games/service";

/** Steam-Daten eines Spiels neu laden (von Hand gesetzte Angaben bleiben). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });
  return NextResponse.json({ outcome: await enrichGame(game) });
}

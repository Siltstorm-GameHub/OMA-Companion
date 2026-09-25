import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runStoryTick } from "@/lib/dnd/story";

/**
 * Eigenständiger Story-Tick-Endpoint für den eigenen Charakter (Ankunfts-
 * Commit + Location-Filter + Story-Ziehung + advanceDndQuestObjective) —
 * für Aufrufer, die nicht ohnehin schon GET /api/dnd/location/[slug] laden
 * (z.B. ein Reise-Status-Widget auf der Weltkarte). Lazy, kein Cron.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const card = user?.discordId ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } }) : null;
  if (!card?.dndCreatedAt) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  const result = await runStoryTick(card.id);
  return NextResponse.json(result);
}

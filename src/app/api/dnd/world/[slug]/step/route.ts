import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { commitArrivalIfDue } from "@/lib/dnd/travel";
import { advanceWorldQuestStep } from "@/lib/dnd/quests";
import { getTracker } from "@/lib/dnd/quest-log";
import { resolveWorld } from "@/lib/dnd/custom-worlds";

/**
 * Quest-Schritt in der begehbaren Welt einer Location melden. Input: { quest, from } = Quest-Slug und der
 * Schritt, der gerade abgeschlossen wurde. Der Server prüft nur Ort und Reihenfolge; der Client meldet, was er
 * im Spiel getan hat — deshalb gibt es dafür ausschließlich XP, keine Coins.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { slug } = await params;
  if (!(await resolveWorld(slug))) return NextResponse.json({ error: "Unbekannte Welt" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const questSlug = typeof body?.quest === "string" ? body.quest : "";
  const from = Number(body?.from);
  if (!Number.isInteger(from) || from < 0) return NextResponse.json({ error: "Ungültiger Schritt" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card?.dndCreatedAt) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id }, include: { currentLocation: { select: { slug: true } } } });
  if (!fresh || fresh.travelToCol != null || fresh.currentLocation?.slug !== slug) {
    return NextResponse.json({ error: "Du bist nicht an diesem Ort" }, { status: 403 });
  }

  const result = await advanceWorldQuestStep(card.id, slug, questSlug, from);
  if (!result) return NextResponse.json({ error: "Quest nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ...result, tracker: await getTracker(card.id) });
}

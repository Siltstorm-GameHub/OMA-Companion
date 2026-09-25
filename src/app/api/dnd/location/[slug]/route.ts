import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLocationEventLog, runStoryTick } from "@/lib/dnd/story";
import { commitArrivalIfDue } from "@/lib/dnd/travel";
import { getWorldQuestStep } from "@/lib/dnd/quests";
import { defaultTeConfig, sanitizeTeConfig } from "@/lib/te-character";

/**
 * Zustand einer Location für die begehbare Welt: darf der User hier sein (Charakter ist angekommen),
 * wer ist noch hier (mit Charakter + Profilbild), gespeicherter Quest-Schritt, Story-Verlauf.
 * Der Story-Tick für den EIGENEN Charakter läuft hier als "erster Schritt" mit (Ankunfts-Commit +
 * Story-Ziehung) — resolve/commit-on-read, kein Cron.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { slug } = await params;
  const location = await prisma.dndLocation.findUnique({ where: { slug } });
  if (!location) return NextResponse.json({ error: "Location nicht gefunden" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  let myCard = user?.discordId ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } }) : null;

  // Eine fällige Ankunft zuerst festschreiben, sonst steht die Karte noch am Abreiseort.
  if (myCard?.dndCreatedAt) {
    await commitArrivalIfDue(myCard.id);
    myCard = await prisma.card.findUnique({ where: { id: myCard.id } });
  }

  const inTransit = myCard?.travelToCol != null;
  const canEnter = !!myCard?.dndCreatedAt && !inTransit && myCard.currentLocationId === location.id;

  let tickResult: Awaited<ReturnType<typeof runStoryTick>> | null = null;
  if (canEnter && myCard) tickResult = await runStoryTick(myCard.id);

  const present = await prisma.card.findMany({
    where: { currentLocationId: location.id, travelToCol: null, dndCreatedAt: { not: null }, ...(myCard ? { id: { not: myCard.id } } : {}) },
    select: { id: true, name: true, linkedDiscordId: true, teCharacter: true },
    take: 12,
  });
  const linkedIds = present.map((c) => c.linkedDiscordId).filter((v): v is string => !!v);
  const avatarUsers = linkedIds.length
    ? await prisma.user.findMany({ where: { discordId: { in: linkedIds } }, select: { discordId: true, image: true } })
    : [];
  const avatarByDiscordId = new Map(avatarUsers.map((u) => [u.discordId!, u.image]));

  const eventLog = await getLocationEventLog(location.id);

  return NextResponse.json({
    location: { id: location.id, slug: location.slug, name: location.name, description: location.description, locationType: location.locationType },
    canEnter,
    inTransit,
    myCardId: myCard?.id ?? null,
    myCharacter: sanitizeTeConfig(myCard?.teCharacter) ?? defaultTeConfig(),
    hasCharacter: !!sanitizeTeConfig(myCard?.teCharacter),
    questStep: canEnter && myCard ? await getWorldQuestStep(myCard.id, slug) : 0,
    present: present.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.linkedDiscordId ? avatarByDiscordId.get(c.linkedDiscordId) ?? null : null,
      character: sanitizeTeConfig(c.teCharacter),
    })),
    eventLog: eventLog.map((e) => ({
      id: e.id, title: e.title, text: e.text, xpGained: e.xpGained, occurredAt: e.occurredAt, cardName: e.card.name,
    })),
    storyTick: tickResult,
  });
}

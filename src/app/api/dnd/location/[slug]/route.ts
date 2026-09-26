import { companionView } from "@/lib/dnd/companion-server";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLocationEventLog, runStoryTick } from "@/lib/dnd/story";
import { commitArrivalIfDue } from "@/lib/dnd/travel";
import { completeVisitSteps, ensureDndQuestsSeeded, getWorldQuestSteps } from "@/lib/dnd/quests";
import { getTracker } from "@/lib/dnd/quest-log";
import { getInventory } from "@/lib/dnd/rpg-server";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import { hasMinRole } from "@/lib/roles";
import { biomeOfTerrain, levelOf } from "@/lib/te-map/rpg";
import { terrainAt } from "@/lib/dnd/hex/world";
import { getPublishedCustomWorld } from "@/lib/dnd/custom-worlds";
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
    select: { id: true, name: true, linkedDiscordId: true, teCharacter: true, dndXp: true },
    take: 12,
  });
  const linkedIds = present.map((c) => c.linkedDiscordId).filter((v): v is string => !!v);
  const avatarUsers = linkedIds.length
    ? await prisma.user.findMany({ where: { discordId: { in: linkedIds } }, select: { discordId: true, image: true } })
    : [];
  const avatarByDiscordId = new Map(avatarUsers.map((u) => [u.discordId!, u.image]));

  const eventLog = await getLocationEventLog(location.id);
  const modUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, points: true } });

  // Quests: Besuchs-Schritte, die hier spielen, zählen jetzt; danach Stand aller Quests dieser Welt + HUD-Liste
  let visits: Awaited<ReturnType<typeof completeVisitSteps>> = [];
  let questSteps: Record<string, number> = {};
  let tracker: Awaited<ReturnType<typeof getTracker>> = [];
  if (canEnter && myCard) {
    await ensureDndQuestsSeeded();
    visits = await completeVisitSteps(myCard.id, slug);
    questSteps = await getWorldQuestSteps(myCard.id, slug);
    tracker = await getTracker(myCard.id);
  }

  // Feste Welten kennt der Client selbst; Editor-Welten (auch bearbeitete feste) kommen als Daten mit und haben Vorrang.
  const customWorld = await getPublishedCustomWorld(slug);

  return NextResponse.json({
    customWorld,
    location: { id: location.id, slug: location.slug, name: location.name, description: location.description, locationType: location.locationType },
    canEnter,
    inTransit,
    myCardId: myCard?.id ?? null,
    myCharacter: sanitizeTeConfig(myCard?.teCharacter) ?? defaultTeConfig(),
    myCompanion: myCard ? companionView(myCard).equipped : null,
    hasCharacter: !!sanitizeTeConfig(myCard?.teCharacter),
    questSteps,
    tracker,
    visits,
    biome: biomeOfTerrain(terrainAt({ col: location.hexCol, row: location.hexRow })),
    isGm: (await getBuilderAccess(session.user.id)).allowed,
    isMod: !!modUser && hasMinRole(modUser.role, "moderator"),
    coins: modUser?.points ?? 0,
    rpg: canEnter && myCard
      ? {
          flags: Array.isArray(myCard.dndFlags) ? (myCard.dndFlags as unknown[]).filter((f) => typeof f === "string") : [],
          gold: myCard.dndGold, xp: myCard.dndXp, level: levelOf(myCard.dndXp),
          abilityScores: myCard.abilityScores,
          inventory: (await getInventory(myCard.id)).map((e) => ({ key: e.key, qty: e.qty, equipped: e.equipped })),
        }
      : null,
    present: present.map((c) => ({
      id: c.id,
      name: c.name,
      level: levelOf(c.dndXp),
      avatarUrl: c.linkedDiscordId ? avatarByDiscordId.get(c.linkedDiscordId) ?? null : null,
      character: sanitizeTeConfig(c.teCharacter),
    })),
    eventLog: eventLog.map((e) => ({
      id: e.id, title: e.title, text: e.text, xpGained: e.xpGained, occurredAt: e.occurredAt, cardName: e.card.name,
    })),
    storyTick: tickResult,
  });
}

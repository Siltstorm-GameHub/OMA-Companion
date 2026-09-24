import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getLocationScene, spawnPointFor } from "@/lib/dnd/location-scenes";
import { getLocationEventLog, runStoryTick } from "@/lib/dnd/story";

/**
 * Location-Szene: wer ist gerade hier + aktiver Story-Content gefiltert nach
 * locationId (plan Abschnitt 3.2). Der Story-Tick für den EIGENEN Charakter
 * läuft hier als "erster Schritt" mit (Ankunfts-Commit + Story-Ziehung),
 * bevor die Szene zusammengestellt wird — resolve/commit-on-read, kein Cron.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { slug } = await params;
  const location = await prisma.dndLocation.findUnique({ where: { slug } });
  if (!location) return NextResponse.json({ error: "Location nicht gefunden" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const myCard = user?.discordId
    ? await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } })
    : null;

  let tickResult: Awaited<ReturnType<typeof runStoryTick>> | null = null;
  if (myCard?.dndCreatedAt && myCard.currentLocationId === location.id) {
    tickResult = await runStoryTick(myCard.id);
  }

  const scene = getLocationScene(location.slug);
  const present = await prisma.card.findMany({
    where: { currentLocationId: location.id, travelRouteId: null, dndCreatedAt: { not: null } },
    select: { id: true, name: true, linkedDiscordId: true, dndClass: true },
  });

  const linkedIds = present.map((c) => c.linkedDiscordId).filter((v): v is string => !!v);
  const avatarUsers = linkedIds.length
    ? await prisma.user.findMany({ where: { discordId: { in: linkedIds } }, select: { discordId: true, image: true } })
    : [];
  const avatarByDiscordId = new Map(avatarUsers.map((u) => [u.discordId!, u.image]));

  const spawned = present.map((c) => ({
    ...c,
    avatarUrl: c.linkedDiscordId ? avatarByDiscordId.get(c.linkedDiscordId) ?? null : null,
    spawnPoint: spawnPointFor(scene, c.id),
  }));
  const eventLog = await getLocationEventLog(location.id);

  const outgoingRoutes = await prisma.dndRoute.findMany({
    where: { fromId: location.id },
    include: { to: { select: { slug: true, name: true } } },
  });

  return NextResponse.json({
    location,
    scene,
    present: spawned,
    eventLog: eventLog.map((e) => ({
      id: e.id,
      title: e.title,
      text: e.text,
      xpGained: e.xpGained,
      occurredAt: e.occurredAt,
      cardName: e.card.name,
    })),
    routes: outgoingRoutes.map((r) => ({ id: r.id, toSlug: r.to.slug, toName: r.to.name, travelMinutes: r.travelMinutes })),
    storyTick: tickResult,
    myCardId: myCard?.id ?? null,
    myCardInTransit: !!myCard?.travelRouteId,
  });
}

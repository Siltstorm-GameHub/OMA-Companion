import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDndWorldSeeded } from "@/lib/dnd/locations";
import { resolveCharacterLocation } from "@/lib/dnd/travel";
import { sanitizePixelConfig } from "@/lib/pixel-character";

/**
 * Weltkarte: alle Locations + aufgelöste Position jeder Charakter-Karte.
 * Client pollt alle 20-30s (kein SSE, plan Abschnitt 3.1). Resolve-on-Read:
 * "in Transit" wird live aus now() vs. travelDepartedAt/travelArrivesAt
 * berechnet, kein Schreibvorgang hier (Commit passiert lazy an anderer
 * Stelle — story-tick/location-Aufruf des jeweils betroffenen Charakters).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  await ensureDndWorldSeeded();

  const [locations, cards] = await Promise.all([
    prisma.dndLocation.findMany({ orderBy: { order: "asc" } }),
    prisma.card.findMany({
      where: { rarity: "COMMUNITY", dndCreatedAt: { not: null } },
      select: {
        id: true,
        name: true,
        linkedDiscordId: true,
        pixelCharacter: true, // Spielfigur (Editor: /battle-cards/my-card)
        currentLocationId: true,
        travelRouteId: true,
        travelFromLocationId: true,
        travelDepartedAt: true,
        travelArrivesAt: true,
        travelRoute: { select: { toId: true } },
      },
    }),
  ]);

  const characters = cards.map((c) => {
    const resolved = resolveCharacterLocation(c);
    return {
      cardId: c.id,
      name: c.name,
      discordId: c.linkedDiscordId,
      inTransit: resolved.inTransit,
      locationId: resolved.locationId,
      fromId: resolved.fromId ?? null,
      toId: resolved.inTransit ? c.travelRoute?.toId ?? null : null,
      departedAt: resolved.departedAt ?? null,
      arrivesAt: resolved.arrivesAt ?? null,
      progress: resolved.progress ?? null,
      pixel: sanitizePixelConfig(c.pixelCharacter),
    };
  });

  return NextResponse.json({ locations, characters });
}

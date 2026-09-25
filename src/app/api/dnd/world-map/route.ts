import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureDndWorldSeeded } from "@/lib/dnd/locations";
import { resolveCharacterPosition } from "@/lib/dnd/travel";
import { sanitizePixelConfig } from "@/lib/pixel-character";

/**
 * Weltkarte: alle Locations (mit Hex-Feld) + aufgelöste Position jeder Charakter-Karte.
 * Client pollt alle 20-30s (kein SSE, plan Abschnitt 3.1). Resolve-on-Read:
 * "unterwegs" wird live aus now() vs. travelDepartedAt/travelArrivesAt
 * berechnet, kein Schreibvorgang hier (Commit passiert lazy an anderer
 * Stelle — story-tick/location-Aufruf des jeweils betroffenen Charakters).
 * Gelände und Kartenbild sind statisch (src/lib/dnd/hex) und stehen nicht in der Antwort.
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
        currentHexCol: true,
        currentHexRow: true,
        travelToCol: true,
        travelToRow: true,
        travelPath: true,
        travelDepartedAt: true,
        travelArrivesAt: true,
      },
    }),
  ]);
  const locById = new Map(locations.map((l) => [l.id, l]));

  const characters = cards.flatMap((c) => {
    const resolved = resolveCharacterPosition(c);
    // Alt-Charaktere ohne Hex-Position stehen auf dem Feld ihrer Location.
    const loc = c.currentLocationId ? locById.get(c.currentLocationId) : undefined;
    const hex = resolved.hex ?? (loc ? { col: loc.hexCol, row: loc.hexRow } : null);
    if (!hex) return [];
    return [{
      cardId: c.id,
      name: c.name,
      discordId: c.linkedDiscordId,
      hex,
      locationId: resolved.inTransit ? null : c.currentLocationId,
      inTransit: resolved.inTransit,
      path: resolved.inTransit ? resolved.path!.map((h) => [h.col, h.row]) : null,
      departedAt: resolved.departedAt ?? null,
      arrivesAt: resolved.arrivesAt ?? null,
      pixel: sanitizePixelConfig(c.pixelCharacter),
    }];
  });

  return NextResponse.json({
    now: new Date().toISOString(),
    locations: locations.map((l) => ({
      id: l.id, slug: l.slug, name: l.name, description: l.description,
      locationType: l.locationType, hexCol: l.hexCol, hexRow: l.hexRow,
    })),
    characters,
  });
}

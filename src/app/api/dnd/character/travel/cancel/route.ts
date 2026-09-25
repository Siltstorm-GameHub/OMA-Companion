import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { locationAtHex, resolveCharacterPosition } from "@/lib/dnd/travel";

/** Reise abbrechen: der Charakter bleibt auf dem zuletzt erreichten Feld des Pfads
 *  stehen (kein Zurückteleportieren, keine Zeit-Rückerstattung). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (card?.travelToCol == null) return NextResponse.json({ error: "Keine aktive Reise" }, { status: 400 });

  const pos = resolveCharacterPosition(card);
  // Schon fällig angekommen → wie eine normale Ankunft am Ziel stehen bleiben.
  const stopAt = pos.inTransit && pos.path && pos.pathIndex != null
    ? pos.path[pos.pathIndex]
    : { col: card.travelToCol, row: card.travelToRow! };
  const location = await locationAtHex(stopAt);

  await prisma.card.update({
    where: { id: card.id },
    data: {
      currentHexCol: stopAt.col,
      currentHexRow: stopAt.row,
      currentLocationId: location?.id ?? null,
      travelToCol: null,
      travelToRow: null,
      travelPath: Prisma.DbNull,
      travelDepartedAt: null,
      travelArrivesAt: null,
    },
  });

  return NextResponse.json({ hex: stopAt, currentLocationId: location?.id ?? null });
}

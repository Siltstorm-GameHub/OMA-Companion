import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Reise abbrechen: Rückkehr zum Startpunkt, keine Teilrückerstattung der
 *  Zeit (plan Abschnitt 3.3 / "Reisen sind abbrechbar"). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card?.travelRouteId) return NextResponse.json({ error: "Keine aktive Reise" }, { status: 400 });

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      // currentLocationId bleibt bereits der Abreisepunkt (wird während der
      // Reise nicht verändert) — nur die Reisefelder werden geleert.
      travelRouteId: null,
      travelFromLocationId: null,
      travelDepartedAt: null,
      travelArrivesAt: null,
    },
  });

  return NextResponse.json({ currentLocationId: updated.currentLocationId });
}

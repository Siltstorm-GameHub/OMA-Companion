import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { commitArrivalIfDue } from "@/lib/dnd/travel";

/** Reise antreten (plan Abschnitt 3.3). Input: { routeId }. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const routeId: string | undefined = body?.routeId;
  if (!routeId) return NextResponse.json({ error: "routeId fehlt" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card?.dndCreatedAt) return NextResponse.json({ error: "Kein D&D-Charakter" }, { status: 400 });

  // Fällige Ankunft zuerst committen, sonst könnte eine neue Reise auf einer
  // veralteten currentLocationId starten.
  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id } });
  if (!fresh) return NextResponse.json({ error: "Charakter nicht gefunden" }, { status: 404 });

  if (fresh.travelRouteId) {
    return NextResponse.json({ error: "Bereits unterwegs" }, { status: 400 });
  }

  const route = await prisma.dndRoute.findUnique({ where: { id: routeId } });
  if (!route) return NextResponse.json({ error: "Route nicht gefunden" }, { status: 404 });
  if (route.fromId !== fresh.currentLocationId) {
    return NextResponse.json({ error: "Diese Route führt nicht von deiner aktuellen Location aus" }, { status: 400 });
  }

  const now = new Date();
  const arrivesAt = new Date(now.getTime() + route.travelMinutes * 60 * 1000);

  const updated = await prisma.card.update({
    where: { id: fresh.id },
    data: {
      travelRouteId: route.id,
      travelFromLocationId: fresh.currentLocationId,
      travelDepartedAt: now,
      travelArrivesAt: arrivesAt,
    },
  });

  return NextResponse.json({
    travelRouteId: updated.travelRouteId,
    travelDepartedAt: updated.travelDepartedAt,
    travelArrivesAt: updated.travelArrivesAt,
  });
}

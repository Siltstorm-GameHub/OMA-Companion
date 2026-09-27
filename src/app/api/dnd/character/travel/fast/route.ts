import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { commitArrivalIfDue } from "@/lib/dnd/travel";
import { positionOfCard } from "@/lib/dnd/position";
import { hasFinishedMainStory } from "@/lib/dnd/quests";
import { fastTravelCostTo, fastTravelDestinations } from "@/lib/dnd/fast-travel";
import { LOCATION_HEXES } from "@/lib/dnd/hex/world";

async function myCard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return null;
  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  return card?.dndCreatedAt ? card : null;
}

/** Schnellreise-Angebot: freigeschaltet? aktuelles Gold? Preis zu jeder der anderen 9 festen Locations. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await myCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  const unlocked = await hasFinishedMainStory(card.id);
  if (!unlocked) return NextResponse.json({ unlocked: false });

  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id } });
  if (!fresh) return NextResponse.json({ error: "Charakter nicht gefunden" }, { status: 404 });
  const from = await positionOfCard(fresh);
  if (!from) return NextResponse.json({ unlocked: true, gold: fresh.dndGold, destinations: [] });

  const locations = await prisma.dndLocation.findMany({ where: { slug: { in: Object.keys(LOCATION_HEXES) } }, select: { slug: true, name: true } });
  const names = new Map(locations.map((l) => [l.slug, l.name]));
  const destinations = fastTravelDestinations(from).map((d) => ({ slug: d.slug, name: names.get(d.slug) ?? d.slug, cost: d.cost, minutes: d.minutes }));
  return NextResponse.json({ unlocked: true, gold: fresh.dndGold, destinations, inTransit: fresh.travelToCol != null });
}

/** Schnellreise antreten: sofort, kostet Gold statt Zeit. Input: { slug }. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await myCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  if (!(await hasFinishedMainStory(card.id))) {
    return NextResponse.json({ error: "Schnellreise ist erst nach der Hauptgeschichte freigeschaltet." }, { status: 403 });
  }

  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id } });
  if (!fresh) return NextResponse.json({ error: "Charakter nicht gefunden" }, { status: 404 });
  if (fresh.travelToCol != null) return NextResponse.json({ error: "Bereits unterwegs" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const target = LOCATION_HEXES[slug];
  if (!target) return NextResponse.json({ error: "Unbekanntes Ziel" }, { status: 400 });

  const from = await positionOfCard(fresh);
  if (!from) return NextResponse.json({ error: "Keine Startposition — bitte Seite neu laden" }, { status: 400 });
  if (from.col === target.col && from.row === target.row) return NextResponse.json({ error: "Du bist schon dort." }, { status: 400 });

  const cost = fastTravelCostTo(from, target);
  if (cost === null) return NextResponse.json({ error: "Kein Weg zu diesem Ziel." }, { status: 400 });

  const location = await prisma.dndLocation.findFirst({ where: { hexCol: target.col, hexRow: target.row }, select: { id: true } });
  const paid = await prisma.card.updateMany({
    where: { id: fresh.id, dndGold: { gte: cost } },
    data: { dndGold: { decrement: cost }, currentHexCol: target.col, currentHexRow: target.row, currentLocationId: location?.id ?? null },
  });
  if (paid.count === 0) return NextResponse.json({ error: `Nicht genug Gold (${cost} nötig).` }, { status: 400 });

  return NextResponse.json({ ok: true, cost, gold: fresh.dndGold - cost, slug, locationId: location?.id ?? null });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { publishEvent } from "@/lib/event-publish";

/** "Erneut versuchen": holt fehlgeschlagene Veröffentlichungs-Schritte eines sichtbaren Events nach. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  await requireModeratorOrEventSquadCaptain(eventId);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hidden: true } });
  if (!event) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  if (event.hidden) return NextResponse.json({ error: "Das Event ist noch unsichtbar — erst sichtbar schalten" }, { status: 400 });
  return NextResponse.json(await publishEvent(eventId));
}

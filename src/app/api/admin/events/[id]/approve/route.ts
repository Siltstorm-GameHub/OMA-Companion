import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { approveEvent } from "@/lib/community-events";

/** Mod-Freigabe eines Community-Events: erst danach Discord-Ankündigung, Discord-Event und Push. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;
  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  const event = await approveEvent(eventId);
  return NextResponse.json({ ok: true, approvalStatus: "approved", hidden: event.hidden });
}

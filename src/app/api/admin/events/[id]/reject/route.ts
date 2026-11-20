import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { rejectEvent } from "@/lib/community-events";

/** Mod lehnt ein Mitglieder-Event ab (mit Grund): ausgeblendet, Ersteller wird benachrichtigt. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reason) return NextResponse.json({ error: "Bitte einen Grund angeben" }, { status: 400 });
  const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Event nicht gefunden" }, { status: 404 });
  await rejectEvent(eventId, reason);
  return NextResponse.json({ ok: true, approvalStatus: "rejected" });
}

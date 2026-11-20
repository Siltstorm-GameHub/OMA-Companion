import { NextRequest, NextResponse } from "next/server";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { APPROVAL_REJECTED, resubmitEvent } from "@/lib/community-events";

/** Ersteller reicht ein abgelehntes Event nach dem Überarbeiten erneut zur Freigabe ein. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id: eventId } = await params;
  if (!(await canManageEvent(user, eventId))) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { approvalStatus: true } });
  if (event?.approvalStatus !== APPROVAL_REJECTED) {
    return NextResponse.json({ error: "Dieses Event ist nicht abgelehnt" }, { status: 409 });
  }
  await resubmitEvent(eventId);
  return NextResponse.json({ ok: true, approvalStatus: "pending" });
}

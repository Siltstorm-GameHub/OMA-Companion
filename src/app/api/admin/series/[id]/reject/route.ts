import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { rejectSeries } from "@/lib/community-events";

/** Mod lehnt eine Mitglieder-Reihe ab (mit Grund): Reihe und Termine ausgeblendet, Ersteller benachrichtigt. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: seriesId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
  if (!reason) return NextResponse.json({ error: "Bitte einen Grund angeben" }, { status: 400 });
  const exists = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  await rejectSeries(seriesId, reason);
  return NextResponse.json({ ok: true, approvalStatus: "rejected" });
}

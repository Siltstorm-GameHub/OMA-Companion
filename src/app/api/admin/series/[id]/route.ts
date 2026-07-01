import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteEventRecord } from "@/lib/delete-event";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    select: { id: true, events: { select: { id: true } } },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const revertCoins = body?.revertCoins === true;
  const revertRankPoints = body?.revertRankPoints === true;

  // Alle zugehörigen Events samt Anmeldungen/Turnieren/Matches vollständig löschen
  for (const { id: eventId } of series.events) {
    await deleteEventRecord(eventId, { revertCoins, revertRankPoints, reasonLabel: "Reihe gelöscht" });
  }

  await prisma.eventSeries.delete({ where: { id } });

  return NextResponse.json({ ok: true, deletedEvents: series.events.length });
}

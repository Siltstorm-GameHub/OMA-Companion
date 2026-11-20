import { requireSeriesManager, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { deleteEventRecord } from "@/lib/delete-event";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSeriesManager(id);
  const isModerator = hasMinRole(user.role, "moderator");

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    select: { id: true, status: true, events: { select: { id: true, completionData: true } } },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Mitglieder (Ersteller, Captains) dürfen ihre Reihe nur löschen, solange noch nichts ausgezahlt wurde:
  // kein abgeschlossener Termin, keine abgeschlossene Saison. Sonst entscheidet ein Mod.
  if (!isModerator && (series.status !== "active" || series.events.some(e => e.completionData))) {
    return NextResponse.json({ error: "Diese Reihe hat schon abgeschlossene Termine. Löschen kann sie nur ein Mod." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const revertCoins = isModerator && body?.revertCoins === true;
  const revertRankPoints = isModerator && body?.revertRankPoints === true;

  // Alle zugehörigen Events samt Anmeldungen/Turnieren/Matches vollständig löschen
  for (const { id: eventId } of series.events) {
    await deleteEventRecord(eventId, { revertCoins, revertRankPoints, reasonLabel: "Reihe gelöscht" });
  }

  await prisma.eventSeries.delete({ where: { id } });

  return NextResponse.json({ ok: true, deletedEvents: series.events.length });
}

import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const series = await prisma.eventSeries.findUnique({ where: { id } });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Alle zugehörigen Events zu Standalone machen
  await prisma.event.updateMany({
    where: { seriesId: id },
    data:  { seriesId: null },
  });

  await prisma.eventSeries.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

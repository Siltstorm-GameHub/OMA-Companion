import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { countOccupiedSlots, countPendingApplications, promoteWaitlistedIntoFreeSlots, trafficLight } from "@/lib/gameservers";
import { pickServerFields, validateServerInput } from "@/lib/gameserver-input";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const existing = await prisma.gameServer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Server nicht gefunden" }, { status: 404 });

  // Teil-Updates (z.B. nur isActive) werden mit dem bestehenden Datensatz zusammengeführt
  // und dann komplett validiert, damit nie ein ungültiger Zustand gespeichert wird.
  const result = validateServerInput({ ...existing, ...pickServerFields(body) });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const server = await prisma.gameServer.update({ where: { id }, data: result.data });

  // Mehr Plätze → Warteliste rückt in die frei gewordenen Plätze nach.
  if (server.maxSlots > existing.maxSlots) await promoteWaitlistedIntoFreeSlots(server.id);

  const [occupied, pendingCount] = await Promise.all([countOccupiedSlots(server.id), countPendingApplications(server.id)]);
  return NextResponse.json({ ...server, occupied, pendingCount, light: trafficLight(server.maxSlots - occupied, server.maxSlots) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.gameServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

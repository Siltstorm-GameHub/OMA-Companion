import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { approveSeries } from "@/lib/community-events";

/** Mod-Freigabe einer Community-Reihe samt aller wartenden Termine (offene werden angekündigt). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: seriesId } = await params;
  const exists = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  const { published } = await approveSeries(seriesId);
  return NextResponse.json({ ok: true, approvalStatus: "approved", published });
}

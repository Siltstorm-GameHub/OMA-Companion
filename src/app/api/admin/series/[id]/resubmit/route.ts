import { NextRequest, NextResponse } from "next/server";
import { canManageSeries, getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { APPROVAL_REJECTED, resubmitSeries } from "@/lib/community-events";

/** Ersteller reicht eine abgelehnte Reihe nach dem Überarbeiten erneut zur Freigabe ein. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id: seriesId } = await params;
  if (!(await canManageSeries(user, seriesId))) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { approvalStatus: true } });
  if (series?.approvalStatus !== APPROVAL_REJECTED) {
    return NextResponse.json({ error: "Diese Reihe ist nicht abgelehnt" }, { status: 409 });
  }
  await resubmitSeries(seriesId);
  return NextResponse.json({ ok: true, approvalStatus: "pending" });
}

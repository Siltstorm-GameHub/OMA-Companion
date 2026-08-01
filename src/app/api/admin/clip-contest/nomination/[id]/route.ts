import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const nomination = await prisma.clipNomination.findUnique({
    where: { id },
    include: { contest: true },
  });
  if (!nomination) return NextResponse.json({ error: "Einreichung nicht gefunden" }, { status: 404 });
  if (nomination.contest.status !== "voting") {
    return NextResponse.json({ error: "Nur Clips laufender Abstimmungen können ausgeschlossen werden" }, { status: 400 });
  }

  await prisma.clipNomination.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

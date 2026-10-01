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

// Community-Titel setzen/zurücksetzen. Der Twitch-Titel (clipTitle) bleibt unverändert.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.customTitle === "string" ? body.customTitle.trim() : "";
  if (raw.length > 100) return NextResponse.json({ error: "Titel darf höchstens 100 Zeichen lang sein" }, { status: 400 });

  const nomination = await prisma.clipNomination.findUnique({ where: { id }, select: { id: true } });
  if (!nomination) return NextResponse.json({ error: "Einreichung nicht gefunden" }, { status: 404 });

  const customTitle = raw === "" ? null : raw;
  await prisma.clipNomination.update({ where: { id }, data: { customTitle } });

  return NextResponse.json({ ok: true, customTitle });
}

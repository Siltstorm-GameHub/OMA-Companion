import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { reviewTip } from "@/lib/games/drop";

/** Empfehlung für den Drop der Woche prüfen: { action: "approve" | "reject" } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => null) as { action?: unknown } | null;
  const result = await reviewTip(id, user.id, body?.action);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.gameTip.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

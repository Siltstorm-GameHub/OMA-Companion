import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { updateGameAdmin } from "@/lib/games/service";

/** Spiel bearbeiten: { name?, status?, steamAppId?, igdbId?, fields? } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const result = await updateGameAdmin(id, body);
  if (!result.ok) return NextResponse.json({ error: result.error, slug: result.slug }, { status: result.status });
  return NextResponse.json({ ok: true, slug: result.slug });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.game.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

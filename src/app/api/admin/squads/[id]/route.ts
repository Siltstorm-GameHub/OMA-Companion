import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireModeratorOrSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireModeratorOrSquadCaptain(id);
  const squad = await prisma.squad.findUnique({
    where: { id },
    include: {
      memberships: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
    },
  });
  if (!squad) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(squad);
}

// Squad-Stammdaten (Name/Spiel/Beschreibung/Icon/Sichtbarkeit) bleiben Admin-Sache — Captains
// pflegen nur das Roster (siehe members/route.ts), nicht die Squad-Identität selbst.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const body = await req.json();
  const { name, game, description, icon, color, hidden } = body;

  const squad = await prisma.squad.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(game !== undefined && { game: game?.trim() || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(icon !== undefined && { icon: icon || null }),
      ...(color !== undefined && { color: color || null }),
      ...(hidden !== undefined && { hidden }),
    },
  });
  return NextResponse.json(squad);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await prisma.squad.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

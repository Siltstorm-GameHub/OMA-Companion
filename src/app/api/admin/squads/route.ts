import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const squads = await prisma.squad.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { memberships: true } } },
  });
  return NextResponse.json(squads);
}

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json();
  const { name, game, description, icon, color, hidden } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });

  const squad = await prisma.squad.create({
    data: {
      name: name.trim(),
      game: game?.trim() || null,
      description: description?.trim() || null,
      icon: icon || null,
      color: color || null,
      hidden: hidden ?? false,
    },
  });
  return NextResponse.json(squad, { status: 201 });
}

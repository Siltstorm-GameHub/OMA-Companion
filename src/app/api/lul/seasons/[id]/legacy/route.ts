import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

type LegacyRow = {
  userId:      string;
  totalPts:    number;
  asPlayer:    number;
  asSpectator: number;
  wins:        number;
  champs:      number;
  trost:       number;
  dominion:    number;
  votes:       number;
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: seasonId } = await params;
  const entries = await prisma.lulLegacyEntry.findMany({
    where: { seasonId },
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
    orderBy: { totalPts: "desc" },
  });
  return NextResponse.json(entries);
}

// Bulk upsert: replaces all legacy entries for this season
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: seasonId } = await params;
  const { entries }: { entries: LegacyRow[] } = await req.json();

  if (!entries?.length) {
    await prisma.lulLegacyEntry.deleteMany({ where: { seasonId } });
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.lulLegacyEntry.deleteMany({ where: { seasonId } }),
    prisma.lulLegacyEntry.createMany({
      data: entries.map(e => ({ seasonId, ...e })),
    }),
  ]);

  // Mark season as archived after saving legacy data
  await prisma.lulSeason.update({
    where: { id: seasonId },
    data: { isLegacy: true, status: "archived" },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: seasonId } = await params;
  await prisma.lulLegacyEntry.deleteMany({ where: { seasonId } });
  return NextResponse.json({ ok: true });
}

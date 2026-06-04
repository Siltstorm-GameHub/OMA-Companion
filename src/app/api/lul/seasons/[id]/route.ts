import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const season = await prisma.lulSeason.findUnique({
    where: { id },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
      },
    },
  });
  if (!season) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(season);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const { status, name, period, totalSpieltage } = await req.json();
  const season = await prisma.lulSeason.update({
    where: { id },
    data: {
      ...(status           !== undefined && { status }),
      ...(name             !== undefined && { name }),
      ...(period           !== undefined && { period }),
      ...(totalSpieltage   !== undefined && { totalSpieltage }),
    },
  });
  return NextResponse.json(season);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await prisma.lulSeason.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

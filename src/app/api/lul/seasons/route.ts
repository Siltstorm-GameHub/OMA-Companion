import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const seasons = await prisma.lulSeason.findMany({
    orderBy: { number: "desc" },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
      },
      legacyEntries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { totalPts: "desc" },
      },
    },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { number, name, period, totalSpieltage } = await req.json();
  if (!number) return NextResponse.json({ error: "number ist Pflicht" }, { status: 400 });

  const season = await prisma.lulSeason.create({
    data: {
      number,
      name:          name ?? null,
      period:        period ?? null,
      totalSpieltage: totalSpieltage ?? 8,
      status:        "upcoming",
    },
  });
  return NextResponse.json(season, { status: 201 });
}

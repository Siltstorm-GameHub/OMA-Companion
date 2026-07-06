import { NextResponse } from "next/server";
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

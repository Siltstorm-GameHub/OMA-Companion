import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Öffentliche Monats-Historie aller aufgelösten Duelle — unabhängig vom aktuellen User sichtbar. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const take = Math.min(50, parseInt(req.nextUrl.searchParams.get("take") ?? "20", 10) || 20);
  const skip = Math.max(0, parseInt(req.nextUrl.searchParams.get("skip") ?? "0", 10) || 0);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const userSelect = { id: true, username: true, name: true, image: true } as const;

  const [duels, total] = await Promise.all([
    prisma.duelChallenge.findMany({
      where: { status: "resolved", resolvedAt: { gte: startOfMonth } },
      include: { challenger: { select: userSelect }, opponent: { select: userSelect } },
      orderBy: { resolvedAt: "desc" },
      take,
      skip,
    }),
    prisma.duelChallenge.count({ where: { status: "resolved", resolvedAt: { gte: startOfMonth } } }),
  ]);

  return NextResponse.json({ duels, total, hasMore: skip + duels.length < total });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWidgetKey } from "@/lib/widgetAuth";

/**
 * GET /api/widget/users/search?q=...
 * Identische Semantik zu /api/admin/users/search, nur mit Widget-Key statt Moderator-Session
 * (fuers Antippen einer Person am Touchscreen, die noch nicht fuer das Event angemeldet ist).
 */
export async function GET(req: NextRequest) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true, image: true, rankPoints: true },
    take: 10,
    orderBy: { username: "asc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      userId: u.id,
      displayName: u.username ?? u.name ?? "Unbekannt",
      image: u.image ?? null,
      rankPoints: u.rankPoints ?? 0,
    })),
  });
}

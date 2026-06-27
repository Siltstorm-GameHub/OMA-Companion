import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  await requireRole("moderator");
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, username: true, image: true, twitchLogin: true },
    take: 10,
    orderBy: { username: "asc" },
  });

  return NextResponse.json(users);
}

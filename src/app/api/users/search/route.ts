import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      id:  { not: session.user.id }, // sich selbst ausschließen
      OR:  [
        { username: { contains: q, mode: "insensitive" } },
        { name:     { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, username: true, name: true, image: true, points: true },
    take: 8,
  });

  return NextResponse.json(users);
}

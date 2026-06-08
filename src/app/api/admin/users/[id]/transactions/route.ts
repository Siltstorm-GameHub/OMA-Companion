import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireRole("admin");
  const { id } = await params;

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true },
    }),
    prisma.pointTransaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  return NextResponse.json({ user, transactions });
}

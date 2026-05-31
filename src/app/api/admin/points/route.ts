import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getLevel } from "@/lib/points";

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const { userId, amount, reason } = await req.json();
  if (!userId || !amount || !reason) {
    return NextResponse.json({ error: "userId, amount und reason sind Pflicht" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const newPoints = Math.max(0, user.points + Number(amount));
  const [transaction, updated] = await prisma.$transaction([
    prisma.pointTransaction.create({ data: { userId, amount: Number(amount), reason } }),
    prisma.user.update({
      where: { id: userId },
      data: { points: newPoints, level: getLevel(newPoints) },
      select: { id: true, points: true, level: true },
    }),
  ]);
  return NextResponse.json({ transaction, user: updated });
}

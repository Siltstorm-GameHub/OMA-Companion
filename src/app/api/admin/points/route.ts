import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  await requireRole("admin");
  const { userId, amount, reason } = await req.json();
  if (!userId || !amount || !reason)
    return NextResponse.json({ error: "userId, amount und reason sind Pflicht" }, { status: 400 });

  const [transaction, updated] = await prisma.$transaction([
    prisma.pointTransaction.create({ data: { userId, amount: Number(amount), reason } }),
    prisma.user.update({
      where:  { id: userId },
      data:   { points: { increment: Number(amount) } },
      select: { id: true, points: true },
    }),
  ]);
  return NextResponse.json({ transaction, user: updated });
}

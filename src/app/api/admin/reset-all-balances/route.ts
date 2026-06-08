import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/reset-all-balances
 * Setzt user.points + user.rankPoints aller User auf 0
 * und löscht alle PointTransactions.
 */
export async function POST() {
  await requireRole("admin");

  const [{ count: deletedTx }] = await prisma.$transaction([
    prisma.pointTransaction.deleteMany(),
    prisma.user.updateMany({ data: { points: 0, rankPoints: 0 } }),
  ]);

  return NextResponse.json({ ok: true, deletedTransactions: deletedTx });
}

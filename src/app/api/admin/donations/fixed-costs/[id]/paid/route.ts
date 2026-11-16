import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { advanceDueDate } from "@/lib/donation-pool";
import { formatBerlinDate } from "@/lib/time";

/**
 * "Bezahlt": bucht die fällige Zahlung als Ausgabe (verknüpft mit der Position) und schiebt
 * die nächste Fälligkeit um ein Intervall weiter.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cost = await prisma.poolFixedCost.findUnique({ where: { id } });
  if (!cost) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const amount = Number(body?.amount) > 0 ? Number(body.amount) : cost.amount;
  const date = body?.date && !Number.isNaN(new Date(body.date).getTime()) ? new Date(body.date) : new Date();
  const period = cost.interval === "yearly"
    ? formatBerlinDate(cost.nextDueAt, { year: "numeric" })
    : formatBerlinDate(cost.nextDueAt, { month: "long", year: "numeric" });

  const [expense, updated] = await prisma.$transaction([
    prisma.poolExpense.create({
      data: { title: `${cost.title} · ${period}`, description: cost.description, amount, date, fixedCostId: cost.id },
    }),
    prisma.poolFixedCost.update({
      where: { id },
      data: { nextDueAt: advanceDueDate(cost.nextDueAt, cost.interval) },
    }),
  ]);
  return NextResponse.json({ expense, cost: updated });
}

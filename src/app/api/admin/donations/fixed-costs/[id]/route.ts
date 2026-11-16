import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const { title, description, amount, interval, nextDueAt, active } = await req.json();
  if (interval !== undefined && interval !== "monthly" && interval !== "yearly") {
    return NextResponse.json({ error: "Ungültiges Intervall" }, { status: 400 });
  }
  const cost = await prisma.poolFixedCost.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title).trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(amount !== undefined && Number(amount) > 0 && { amount: Number(amount) }),
      ...(interval !== undefined && { interval }),
      ...(nextDueAt !== undefined && !Number.isNaN(new Date(nextDueAt).getTime()) && { nextDueAt: new Date(nextDueAt) }),
      ...(active !== undefined && { active: !!active }),
    },
  });
  return NextResponse.json(cost);
}

/** Löscht die Position; bereits bezahlte Ausgaben bleiben im Kassenbuch (fixedCostId → null). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.poolFixedCost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

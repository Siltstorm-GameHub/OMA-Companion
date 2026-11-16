import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const INTERVALS = new Set(["monthly", "yearly"]);

export async function GET() {
  await requireRole("moderator");
  const costs = await prisma.poolFixedCost.findMany({ orderBy: { nextDueAt: "asc" } });
  return NextResponse.json(costs);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { title, description, amount, interval, nextDueAt } = await req.json();
  const value = Number(amount);
  const due = new Date(nextDueAt);
  if (!title?.trim() || !(value > 0) || !INTERVALS.has(interval) || Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: "Titel, Betrag, Intervall und Fälligkeit sind Pflicht" }, { status: 400 });
  }
  const cost = await prisma.poolFixedCost.create({
    data: { title: title.trim(), description: description?.trim() || null, amount: value, interval, nextDueAt: due },
  });
  return NextResponse.json(cost);
}

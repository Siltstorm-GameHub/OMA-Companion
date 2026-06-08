import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireRole("moderator");
  const expenses = await prisma.poolExpense.findMany({
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { title, description, amount, date } = await req.json();

  if (!title || !amount || !date) {
    return NextResponse.json({ error: "title, amount und date sind Pflicht" }, { status: 400 });
  }

  const expense = await prisma.poolExpense.create({
    data: {
      title,
      description: description || null,
      amount: Number(amount),
      date: new Date(date),
    },
  });

  return NextResponse.json(expense);
}

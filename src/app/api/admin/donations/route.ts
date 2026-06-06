import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Admin: alle Spenden mit Beträgen
export async function GET() {
  await requireRole("admin");
  const donations = await prisma.donation.findMany({
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(donations);
}

// Admin: Spende eintragen
export async function POST(req: NextRequest) {
  await requireRole("admin");
  const { userId, amount, month, year, note } = await req.json();

  if (!userId || !amount || !month || !year) {
    return NextResponse.json({ error: "userId, amount, month und year sind Pflicht" }, { status: 400 });
  }

  const donation = await prisma.donation.upsert({
    where: { userId_month_year: { userId, month: Number(month), year: Number(year) } },
    create: { userId, amount: Number(amount), month: Number(month), year: Number(year), note: note || null },
    update: { amount: Number(amount), note: note || null },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json(donation);
}

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

  let donation;
  try {
    donation = await prisma.donation.create({
      data: { userId, amount: Number(amount), month: Number(month), year: Number(year), note: note || null },
      include: { user: { select: { id: true, name: true } } },
    });
  } catch (err) {
    console.error("[donations POST]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  // 1 Münze pro gespendetem Cent
  const coins = Math.round(Number(amount) * 100);
  if (coins > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { points: { increment: coins } },
    });
    await prisma.pointTransaction.create({
      data: {
        userId,
        amount: coins,
        reason: `Spende ${Number(amount).toFixed(2)} € (${month}/${year})`,
      },
    });
  }

  return NextResponse.json(donation);
}

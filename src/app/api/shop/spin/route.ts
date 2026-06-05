import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Gewichtete Preistabelle
const PRIZES = [
  { type: "points", value: "10",  label: "10 Punkte",   weight: 30 },
  { type: "points", value: "25",  label: "25 Punkte",   weight: 25 },
  { type: "points", value: "50",  label: "50 Punkte",   weight: 20 },
  { type: "points", value: "100", label: "100 Punkte",  weight: 12 },
  { type: "points", value: "200", label: "200 Punkte",  weight: 8  },
  { type: "points", value: "500", label: "500 Punkte",  weight: 4  },
  { type: "nothing", value: "0", label: "Kein Glück",  weight: 1  },
] as const;

function rollPrize() {
  const total  = PRIZES.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of PRIZES) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return PRIZES[0];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const existing = await prisma.dailySpin.findUnique({
    where: { userId_date: { userId: session.user.id, date: todayStr() } },
  }).catch(() => null);

  return NextResponse.json({
    alreadySpun: !!existing,
    result: existing ?? null,
    prizes: PRIZES.map(p => ({ label: p.label, type: p.type })), // für UI-Animation
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  // Bereits heute gedreht?
  const existing = await prisma.dailySpin.findUnique({
    where: { userId_date: { userId, date: todayStr() } },
  }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Heute bereits gedreht", result: existing }, { status: 400 });

  const prize = rollPrize();
  const amount = parseInt(prize.value);

  await prisma.$transaction(async tx => {
    await tx.dailySpin.create({
      data: { userId, date: todayStr(), prizeType: prize.type, prizeValue: prize.value, prizeLabel: prize.label },
    });
    if (prize.type === "points" && amount > 0) {
      await tx.user.update({ where: { id: userId }, data: { points: { increment: amount } } });
      await tx.pointTransaction.create({ data: { userId, amount, reason: `Tages-Spin 🎰: ${prize.label}` } });
    }
  });

  return NextResponse.json({ ok: true, prize: { type: prize.type, value: prize.value, label: prize.label } });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/quests";
import { grantPack } from "@/lib/battle-cards/packs";
import { getShopConfig, type WheelPrize } from "@/lib/shop-config";

function rollPrize(prizes: WheelPrize[]): WheelPrize {
  const total = prizes.reduce((s, p) => s + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return prizes[0];
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

  const { wheelPrizes } = await getShopConfig();

  return NextResponse.json({
    alreadySpun: !!existing,
    result: existing ?? null,
    prizes: wheelPrizes.map(p => ({ label: p.label, type: p.type })), // für UI-Animation
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

  const { wheelPrizes } = await getShopConfig();
  const prize = rollPrize(wheelPrizes);
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

  updateQuestProgress(userId, "DAILY_SPIN", 1).catch(() => {});

  // Pack landet nur im Inventar, löst sich nicht auf — Öffnen passiert
  // manuell auf /battle-cards.
  if (prize.type === "pack") {
    await grantPack(userId, "WHEEL");
  }

  return NextResponse.json({
    ok: true,
    prize: { type: prize.type, value: prize.value, label: prize.label },
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { countPacksPurchasedToday, grantPack, PACK_DAILY_PURCHASE_LIMIT } from "@/lib/battle-cards/packs";
import { getShopConfig } from "@/lib/shop-config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const purchasedToday = await countPacksPurchasedToday(userId);
  if (purchasedToday >= PACK_DAILY_PURCHASE_LIMIT) {
    return NextResponse.json(
      { error: `Heutiges Limit erreicht (max. ${PACK_DAILY_PURCHASE_LIMIT} Packs pro Tag).` },
      { status: 400 }
    );
  }

  const { packCost } = await getShopConfig();

  // Atomarer Guard gegen doppelte Käufe (z.B. Doppelklick): das WHERE mit
  // points >= packCost läuft in derselben Query wie das Decrement, kann
  // also nicht doppelt "durchrutschen" wie ein separates Lesen+Schreiben.
  const debit = await prisma.user.updateMany({
    where: { id: userId, points: { gte: packCost } },
    data: { points: { decrement: packCost } },
  });
  if (debit.count === 0) {
    return NextResponse.json({ error: "Nicht genug Münzen" }, { status: 400 });
  }
  await prisma.pointTransaction.create({
    data: { userId, amount: -packCost, reason: "Karten-Pack gekauft" },
  });

  await grantPack(userId, "PURCHASE");

  return NextResponse.json({ ok: true, remainingToday: PACK_DAILY_PURCHASE_LIMIT - purchasedToday - 1 });
}

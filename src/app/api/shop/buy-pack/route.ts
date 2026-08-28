import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { openStandardPack } from "@/lib/battle-cards/packs";
import { getShopConfig } from "@/lib/shop-config";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

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

  const result = await openStandardPack(userId);

  return NextResponse.json({
    ok: true,
    card: { id: result.card.id, name: result.card.name, title: result.card.title, class: result.card.class },
    isNewCard: result.isNewCard,
    duplicates: result.duplicates,
  });
}

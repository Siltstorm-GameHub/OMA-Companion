import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getShopConfig } from "@/lib/shop-config";

/**
 * Shop-Item: 1 zusätzlicher D&D-Re-Roll-Credit (Rasse+Klasse+Attribute neu
 * würfeln, siehe /api/dnd/character/create). Nutzt dieselbe atomare
 * Guard-Konvention wie buy-pack (WHERE points >= cost im selben Update).
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId }, select: { id: true, dndCreatedAt: true } });
  if (!card?.dndCreatedAt) {
    return NextResponse.json({ error: "Noch kein D&D-Charakter erstellt" }, { status: 400 });
  }

  const { dndRerollCost } = await getShopConfig();

  const debit = await prisma.user.updateMany({
    where: { id: userId, points: { gte: dndRerollCost } },
    data: { points: { decrement: dndRerollCost } },
  });
  if (debit.count === 0) {
    return NextResponse.json({ error: "Nicht genug Münzen" }, { status: 400 });
  }
  await prisma.pointTransaction.create({
    data: { userId, amount: -dndRerollCost, reason: "D&D-Charakter-Re-Roll gekauft" },
  });

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: { dndRerollCredits: { increment: 1 } },
    select: { dndRerollCredits: true },
  });

  return NextResponse.json({ ok: true, dndRerollCredits: updated.dndRerollCredits });
}

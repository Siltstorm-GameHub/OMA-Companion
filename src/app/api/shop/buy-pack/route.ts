import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  countPacksPurchasedToday,
  grantPack,
  communityCardPoolSize,
  PACK_DAILY_PURCHASE_LIMIT,
  type PackKind,
} from "@/lib/battle-cards/packs";
import { getShopConfig } from "@/lib/shop-config";

const VALID_KINDS: PackKind[] = ["STANDARD", "PREMIUM", "COMMUNITY"];

const PACK_LABEL: Record<PackKind, string> = {
  STANDARD: "Standard-Pack",
  PREMIUM: "Premium-Pack",
  COMMUNITY: "Community-Pack",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json().catch(() => ({}));
  const kind: PackKind = VALID_KINDS.includes(body?.kind) ? body.kind : "STANDARD";

  const purchasedToday = await countPacksPurchasedToday(userId);
  if (purchasedToday >= PACK_DAILY_PURCHASE_LIMIT) {
    return NextResponse.json(
      { error: `Heutiges Limit erreicht (max. ${PACK_DAILY_PURCHASE_LIMIT} Packs pro Tag).` },
      { status: 400 }
    );
  }

  if (kind === "COMMUNITY" && (await communityCardPoolSize()) === 0) {
    return NextResponse.json({ error: "Aktuell sind keine Community-Karten verfügbar." }, { status: 400 });
  }

  const { packPrices } = await getShopConfig();
  const cost = packPrices[kind];

  // Atomarer Guard gegen doppelte Käufe (z.B. Doppelklick): das WHERE mit
  // points >= cost läuft in derselben Query wie das Decrement, kann
  // also nicht doppelt "durchrutschen" wie ein separates Lesen+Schreiben.
  const debit = await prisma.user.updateMany({
    where: { id: userId, points: { gte: cost } },
    data: { points: { decrement: cost } },
  });
  if (debit.count === 0) {
    return NextResponse.json({ error: "Nicht genug Münzen" }, { status: 400 });
  }
  await prisma.pointTransaction.create({
    data: { userId, amount: -cost, reason: `${PACK_LABEL[kind]} gekauft` },
  });

  await grantPack(userId, "PURCHASE", kind);

  return NextResponse.json({ ok: true, remainingToday: PACK_DAILY_PURCHASE_LIMIT - purchasedToday - 1 });
}

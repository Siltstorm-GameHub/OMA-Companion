import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Abgelaufene Auktionen auflösen
async function resolveExpiredAuctions() {
  const expired = await prisma.shopAuction.findMany({
    where:   { status: "active", endsAt: { lt: new Date() } },
    include: { item: true },
  });

  for (const auction of expired) {
    if (auction.currentBidderId && auction.currentBid > 0) {
      // Gewinner bekommt das Item
      await prisma.$transaction([
        prisma.shopAuction.update({
          where: { id: auction.id },
          data:  { status: "ended", winnerId: auction.currentBidderId },
        }),
        prisma.shopPurchase.create({
          data: { userId: auction.currentBidderId, itemId: auction.itemId, price: auction.currentBid },
        }),
        prisma.pointTransaction.create({
          data: { userId: auction.currentBidderId, amount: -auction.currentBid, reason: `Auktion gewonnen: ${auction.item.name}` },
        }),
      ]);
    } else {
      // Keine Gebote — Auktion endet ohne Gewinner
      await prisma.shopAuction.update({ where: { id: auction.id }, data: { status: "ended" } });
    }
  }
}

export async function GET() {
  await resolveExpiredAuctions();

  const auctions = await prisma.shopAuction.findMany({
    where:   { status: "active" },
    include: {
      item:          { select: { id: true, name: true, icon: true, rarity: true, description: true } },
      currentBidder: { select: { username: true, name: true } },
      bids:          { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { username: true, name: true } } } },
    },
    orderBy: { endsAt: "asc" },
  });

  return NextResponse.json(auctions);
}

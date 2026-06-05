import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "admin" || user?.role === "moderator" ? user : null;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { itemId, startPrice, minBidStep, durationHours } = await req.json();
  if (!itemId || !startPrice || !durationHours)
    return NextResponse.json({ error: "itemId, startPrice und durationHours sind Pflicht" }, { status: 400 });

  const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
  if (!item) return NextResponse.json({ error: "Item nicht gefunden" }, { status: 404 });

  const endsAt = new Date(Date.now() + Number(durationHours) * 3600 * 1000);

  const auction = await prisma.shopAuction.create({
    data: {
      itemId,
      startPrice:  Number(startPrice),
      minBidStep:  Number(minBidStep ?? 50),
      currentBid:  0,
      endsAt,
      status:      "active",
    },
  });

  return NextResponse.json({ ok: true, auction });
}

export async function DELETE(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const { id } = await req.json();
  const auction = await prisma.shopAuction.findUnique({ where: { id }, include: { bids: true } });
  if (!auction) return NextResponse.json({ error: "Auktion nicht gefunden" }, { status: 404 });

  // Punkte aller Bieter zurückgeben
  if (auction.currentBidderId && auction.currentBid > 0) {
    await prisma.user.update({ where: { id: auction.currentBidderId }, data: { points: { increment: auction.currentBid } } });
  }
  await prisma.auctionBid.deleteMany({ where: { auctionId: id } });
  await prisma.shopAuction.update({ where: { id }, data: { status: "cancelled" } });

  return NextResponse.json({ ok: true });
}

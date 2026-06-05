import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const userId = session.user.id;
  const { id: auctionId } = await params;

  const { amount } = await req.json();
  const bid = Number(amount);

  const [auction, user] = await Promise.all([
    prisma.shopAuction.findUnique({ where: { id: auctionId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);

  if (!auction || auction.status !== "active") return NextResponse.json({ error: "Auktion nicht aktiv" }, { status: 400 });
  if (auction.endsAt < new Date())             return NextResponse.json({ error: "Auktion abgelaufen" }, { status: 400 });
  if (auction.currentBidderId === userId)       return NextResponse.json({ error: "Du bist bereits Höchstbietender" }, { status: 400 });
  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const minBid = Math.max(auction.startPrice, auction.currentBid + auction.minBidStep);
  if (bid < minBid) return NextResponse.json({ error: `Mindestgebot: ${minBid.toLocaleString("de")} Punkte` }, { status: 400 });
  if (user.points < bid) return NextResponse.json({ error: "Nicht genug Punkte" }, { status: 400 });

  const previousBidderId = auction.currentBidderId;

  // Punkte des alten Höchstbietenden zurückbuchen
  await prisma.$transaction(async tx => {
    if (previousBidderId) {
      await tx.user.update({ where: { id: previousBidderId }, data: { points: { increment: auction.currentBid } } });
      await tx.pointTransaction.create({ data: { userId: previousBidderId, amount: auction.currentBid, reason: `Gebot zurück: ${auction.id}` } });
    }
    // Neues Gebot abziehen
    await tx.user.update({ where: { id: userId }, data: { points: { decrement: bid } } });
    await tx.pointTransaction.create({ data: { userId, amount: -bid, reason: `Auktionsgebot: ${auctionId}` } });
    // Auktion updaten
    await tx.shopAuction.update({ where: { id: auctionId }, data: { currentBid: bid, currentBidderId: userId } });
    // Gebot protokollieren
    await tx.auctionBid.create({ data: { auctionId, userId, amount: bid } });
  });

  // Überboten-Benachrichtigung via Bot-API (optional)
  if (previousBidderId) {
    const prevUser = await prisma.user.findUnique({ where: { id: previousBidderId }, select: { discordId: true } });
    if (prevUser?.discordId) {
      // Fire-and-forget — kein await, damit die Response schnell kommt
      fetch(`${process.env.NEXTAUTH_URL}/api/internal/auction-outbid`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_SECRET ?? "" },
        body: JSON.stringify({ discordId: prevUser.discordId, itemName: "Auktion", newBid: bid }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, bid, minNextBid: bid + auction.minBidStep });
}

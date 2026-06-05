import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Gavel } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/shop";
import AuctionCard from "./AuctionCard";

// Abgelaufene Auktionen auflösen (Server-seitig beim Page-Load)
async function resolveExpiredAuctions() {
  const expired = await prisma.shopAuction.findMany({
    where:   { status: "active", endsAt: { lt: new Date() } },
    include: { item: true },
  });
  for (const auction of expired) {
    if (auction.currentBidderId && auction.currentBid > 0) {
      await prisma.$transaction([
        prisma.shopAuction.update({ where: { id: auction.id }, data: { status: "ended", winnerId: auction.currentBidderId } }),
        prisma.shopPurchase.create({ data: { userId: auction.currentBidderId, itemId: auction.itemId, price: auction.currentBid } }),
        prisma.pointTransaction.create({ data: { userId: auction.currentBidderId, amount: -auction.currentBid, reason: `Auktion gewonnen: ${auction.item.name}` } }),
      ]);
    } else {
      await prisma.shopAuction.update({ where: { id: auction.id }, data: { status: "ended" } });
    }
  }
}

export default async function AuctionsPage() {
  await resolveExpiredAuctions().catch(() => {});

  const session = await auth();
  const userId  = session?.user?.id;

  const [auctions, me, recentlyEnded] = await Promise.all([
    prisma.shopAuction.findMany({
      where:   { status: "active" },
      include: {
        item:          { select: { id: true, name: true, icon: true, rarity: true, description: true } },
        currentBidder: { select: { username: true, name: true } },
        bids:          { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { username: true, name: true } } } },
      },
      orderBy: { endsAt: "asc" },
    }).catch(() => [] as never[]),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { points: true } }) : null,
    prisma.shopAuction.findMany({
      where:   { status: "ended" },
      include: {
        item:   { select: { name: true, icon: true } },
        winner: { select: { username: true, name: true } },
      },
      orderBy: { endsAt: "desc" },
      take: 5,
    }).catch(() => [] as never[]),
  ]);

  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Gavel className="w-4 h-4 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Auktionen</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">Biete auf limitierte Items — Höchstbietender gewinnt</p>
        </div>
        {me && (
          <div className="glass-heavy rounded-2xl px-5 py-3 text-center border border-amber-500/15">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Mein Guthaben</p>
            <p className="text-xl font-black text-amber-400">{me.points.toLocaleString("de-DE")}</p>
            <p className="text-[9px] text-gray-600">Punkte</p>
          </div>
        )}
      </div>

      {/* Aktive Auktionen */}
      {auctions.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center border border-white/[0.05]">
          <p className="text-4xl mb-3">🔨</p>
          <p className="text-white font-semibold mb-1">Keine aktiven Auktionen</p>
          <p className="text-sm text-gray-500">Schau später wieder vorbei — Admins erstellen regelmäßig neue Auktionen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {auctions.map(auction => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              myPoints={me?.points ?? 0}
              userId={userId ?? null}
              rarityConfig={RARITY_CONFIG}
            />
          ))}
        </div>
      )}

      {/* Kürzlich beendet */}
      {recentlyEnded.length > 0 && (
        <section>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">✅ Kürzlich beendet</h2>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {recentlyEnded.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{a.item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{a.item.name}</p>
                  <p className="text-xs text-gray-500">
                    {a.winner ? `Gewonnen von ${a.winner.username ?? a.winner.name}` : "Keine Gebote"}
                  </p>
                </div>
                {a.currentBid > 0 && (
                  <span className="text-sm font-bold text-amber-400">{a.currentBid.toLocaleString("de-DE")} Pts</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

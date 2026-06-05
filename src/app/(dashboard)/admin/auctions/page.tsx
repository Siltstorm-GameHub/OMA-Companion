import { prisma } from "@/lib/prisma";
import AuctionManager from "./AuctionManager";

export default async function AdminAuctionsPage() {
  const [items, auctions] = await Promise.all([
    prisma.shopItem.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, icon: true } }),
    prisma.shopAuction.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        item:          { select: { name: true, icon: true } },
        currentBidder: { select: { username: true, name: true } },
      },
    }),
  ]);

  return <AuctionManager items={items} auctions={auctions} />;
}

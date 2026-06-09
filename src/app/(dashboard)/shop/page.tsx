import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, Coins } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import CollectiblesShop from "./CollectiblesShop";
import DailySpin from "./DailySpin";
import { effectivePrice } from "@/lib/collectibles";

export default async function ShopPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [user, collections, ownedRaw, lulItems, todaySpin] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true } })
      : null,

    prisma.collectibleCollection.findMany({
      where:   { active: true },
      orderBy: { name: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),

    userId
      ? prisma.userCollectible.findMany({
          where:  { userId },
          select: { collectibleItemId: true },
        })
      : [],

    // LUL-Vorschlag (falls noch aktives Item existiert)
    userId
      ? prisma.shopPurchase.findMany({
          where:   { userId, item: { type: "lul_suggest" } },
          include: { item: { select: { id: true, name: true, icon: true, price: true } } },
        }).catch(() => [])
      : [],

    // Tages-Spin Status
    userId
      ? prisma.dailySpin.findFirst({
          where: { userId, date: new Date().toISOString().slice(0, 10) },
        }).catch(() => null)
      : null,
  ]);

  const RARITY_ORDER: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
  const now = new Date();
  const sortedCollections = collections.map(col => ({
    ...col,
    items: col.items
      .filter(i => i.active)
      .map(i => ({
        ...i,
        // effektiven Preis vorberechnen (Rabatt läuft ggf. ab)
        displayPrice:   effectivePrice(i),
        originalPrice:  i.price,
        onSale: i.salePrice != null && (i.saleUntil == null || now <= new Date(i.saleUntil)),
      }))
      .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0)),
  }));

  const myPoints  = user?.points ?? 0;
  const ownedSet  = new Set((ownedRaw as { collectibleItemId: string }[]).map(o => o.collectibleItemId));

  return (
    <div className="px-5 pb-5 pt-3 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="card-cut surface relative overflow-hidden p-5 accent-amber"
        style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.10), 0 4px 24px rgba(0,0,0,0.5)" }}>
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.20), transparent)" }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="card-cut-sm w-10 h-10 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black text-white tracking-tight">Shop</h1>
              <p className="text-[11px] text-gray-600">Sammle exklusive Figuren und vervollständige Sammlungen</p>
            </div>
          </div>
          {userId && (
            <div className="card-cut-sm flex items-center gap-2 px-4 py-2 bg-amber-500/8 border border-amber-500/15">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                <CountUp to={myPoints} /> Münzen
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tages-Spin */}
      {userId && (
        <DailySpin alreadySpun={!!todaySpin} lastResult={null} />
      )}

      {/* Sammlungen */}
      <CollectiblesShop
        collections={sortedCollections as Parameters<typeof CollectiblesShop>[0]["collections"]}
        ownedIds={[...ownedSet]}
        myPoints={myPoints}
        isLoggedIn={!!userId}
      />
    </div>
  );
}

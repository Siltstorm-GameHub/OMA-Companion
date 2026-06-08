import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, Coins } from "lucide-react";
import { CountUp } from "@/components/CountUp";
import CollectiblesShop from "./CollectiblesShop";
import DailySpin from "./DailySpin";

export default async function ShopPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [user, collections, ownedRaw, lulItems, todaySpin] = await Promise.all([
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { points: true } })
      : null,

    prisma.collectibleCollection.findMany({
      where:   { active: true },
      orderBy: { sortOrder: "asc" },
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

  const myPoints  = user?.points ?? 0;
  const ownedSet  = new Set((ownedRaw as { collectibleItemId: string }[]).map(o => o.collectibleItemId));

  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Shop</h1>
              <p className="text-xs text-gray-500">Sammle exklusive Figuren und vervollständige Sammlungen</p>
            </div>
          </div>
          {userId && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
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
        collections={collections as Parameters<typeof CollectiblesShop>[0]["collections"]}
        ownedIds={[...ownedSet]}
        myPoints={myPoints}
        isLoggedIn={!!userId}
      />
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag } from "lucide-react";
import { RARITY_CONFIG, CATEGORY_CONFIG, PROFILE_THEMES } from "@/lib/shop";
import { CountUp } from "@/components/CountUp";
import ShopItemCard from "./ShopItemCard";

export default async function ShopPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [items, me, myPurchases] = await Promise.all([
    prisma.shopItem.findMany({
      where:   { active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    userId
      ? prisma.user.findUnique({
          where:  { id: userId },
          select: { points: true, activeTitle: true, profileTheme: true, xpBoostUntil: true, streakShield: true },
        })
      : null,
    userId
      ? prisma.shopPurchase.findMany({
          where:  { userId },
          select: { itemId: true, consumed: true, expiresAt: true },
        })
      : [],
  ]);

  const purchasedIds  = new Set(myPurchases.map(p => p.itemId));
  const myPoints      = me?.points ?? 0;
  const xpBoostActive = me?.xpBoostUntil && me.xpBoostUntil > new Date();

  // Nach Kategorien gruppieren
  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categoryOrder = ["cosmetic", "boost", "privilege"];

  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Shop</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">Gib deine Punkte für exklusive Belohnungen aus</p>
        </div>

        {/* Mein Guthaben */}
        {me && (
          <div className="glass-heavy rounded-2xl px-5 py-3 text-center border border-amber-500/15">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-0.5">Mein Guthaben</p>
            <p className="text-2xl font-black text-amber-400 tabular-nums">
              <CountUp to={myPoints} duration={700} />
            </p>
            <p className="text-[9px] text-gray-600">Punkte</p>
          </div>
        )}
      </div>

      {/* Aktive Boosts Banner */}
      {(xpBoostActive || me?.streakShield) && (
        <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/[0.04]">
          <p className="text-xs font-semibold text-emerald-400 mb-2">✅ Aktive Belohnungen</p>
          <div className="flex gap-4 flex-wrap">
            {xpBoostActive && (
              <span className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                ⚡ XP-Boost aktiv bis {new Date(me!.xpBoostUntil!).toLocaleDateString("de-DE")}
              </span>
            )}
            {me?.streakShield && (
              <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                🛡️ Streak-Schutz aktiv
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Items nach Kategorie ─────────────────────────────────────── */}
      {categoryOrder.map(cat => {
        const catItems = byCategory[cat];
        if (!catItems?.length) return null;
        const cfg = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG];

        return (
          <div key={cat}>
            <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span>{cfg.icon}</span> {cfg.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catItems.map(item => {
                const owned    = purchasedIds.has(item.id);
                const canAfford = myPoints >= item.price;
                const soldOut  = item.stock !== null && item.stock <= 0;

                return (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    owned={owned}
                    canAfford={canAfford}
                    soldOut={soldOut}
                    myPoints={myPoints}
                    activeTitle={me?.activeTitle ?? null}
                    profileTheme={me?.profileTheme ?? "default"}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

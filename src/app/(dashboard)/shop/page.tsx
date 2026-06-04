import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ShoppingBag } from "lucide-react";
import { RARITY_CONFIG, TYPE_CONFIG } from "@/lib/shop";
import { CountUp } from "@/components/CountUp";
import ShopItemCard from "./ShopItemCard";

// Sektionen: jede hat einen Titel, Beschreibung und die Item-Typen die dazu gehören
const SECTIONS = [
  {
    key:   "cosmetic-titles",
    label: "Titel",
    icon:  "🎖️",
    desc:  "Zeige deinen Status neben deinem Namen — im Profil und im Leaderboard.",
    types: ["title"],
    grid:  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  },
  {
    key:   "cosmetic-badges",
    label: "Exklusive Abzeichen",
    icon:  "💎",
    desc:  "Shop-exklusive Badges die man nicht durch Aktivität verdienen kann.",
    types: ["badge"],
    grid:  "grid-cols-1 sm:grid-cols-3",
  },
  {
    key:   "cosmetic-themes",
    label: "Profil-Themes",
    icon:  "🎨",
    desc:  "Personalisiere deinen Hero-Banner mit einem eigenen Farbschema.",
    types: ["profile_theme"],
    grid:  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  },
  {
    key:   "cosmetic-colors",
    label: "Namens-Farben",
    icon:  "🖌️",
    desc:  "Hebe deinen Namen im Leaderboard mit einer exklusiven Farbe hervor.",
    types: ["name_color"],
    grid:  "grid-cols-2 sm:grid-cols-3",
  },
  {
    key:   "boosts",
    label: "Boosts",
    icon:  "⚡",
    desc:  "Temporäre oder einmalige Vorteile für mehr Punkte und Streak-Schutz.",
    types: ["xp_boost", "streak_shield"],
    grid:  "grid-cols-1 sm:grid-cols-2",
  },
  {
    key:   "privileges",
    label: "Privilegien",
    icon:  "🎟️",
    desc:  "Besondere Rechte und Aktionen die nur Shop-Käufer nutzen können.",
    types: ["event_slot", "discord_role", "lul_suggest", "tournament_sponsor", "status_message"],
    grid:  "grid-cols-1 sm:grid-cols-2",
  },
] as const;

export default async function ShopPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [items, me, myPurchases] = await Promise.all([
    prisma.shopItem.findMany({
      where:   { active: true },
      orderBy: [{ sortOrder: "asc" }],
    }),
    userId
      ? prisma.user.findUnique({
          where:  { id: userId },
          select: { points: true, activeTitle: true, profileTheme: true, nameColor: true, statusMessage: true, xpBoostUntil: true, streakShield: true },
        })
      : null,
    userId
      ? prisma.shopPurchase.findMany({
          where:  { userId },
          select: { id: true, itemId: true, consumed: true, expiresAt: true },
        })
      : [],
  ]);

  const purchasedIds      = new Set(myPurchases.map(p => p.itemId));
  const purchaseMap       = new Map(myPurchases.map(p => [p.itemId, p]));
  const myPoints          = me?.points ?? 0;
  const xpBoostActive     = me?.xpBoostUntil && me.xpBoostUntil > new Date();
  const ownsStatusMessage = myPurchases.some(p =>
    items.find(i => i.id === p.itemId)?.type === "status_message"
  );
  const now = new Date();

  // Rarity-Verteilung für den Header
  const ownedCount = purchasedIds.size;
  const totalCount = items.length;

  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto space-y-10 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Shop</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            Gib deine Punkte für exklusive Belohnungen aus
            {me && (
              <span className="ml-2 text-gray-600">· {ownedCount}/{totalCount} besessen</span>
            )}
          </p>
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
          <div className="flex gap-3 flex-wrap">
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

      {/* ── Sektionen ───────────────────────────────────────────────── */}
      {SECTIONS.map(section => {
        const sectionItems = items.filter(i =>
          (section.types as readonly string[]).includes(i.type) &&
          !(i.availableFrom && i.availableFrom > now && !purchasedIds.has(i.id)) // noch nicht verfügbar = trotzdem anzeigen, aber gesperrt
        );
        if (!sectionItems.length) return null;

        const ownedInSection = sectionItems.filter(i => purchasedIds.has(i.id)).length;

        return (
          <section key={section.key}>
            {/* Sektions-Header */}
            <div className="flex items-end justify-between mb-4 gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                  <span>{section.icon}</span>
                  {section.label}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">{section.desc}</p>
              </div>
              {me && (
                <span className="text-[10px] text-gray-600 shrink-0 mb-0.5">
                  {ownedInSection}/{sectionItems.length}
                </span>
              )}
            </div>

            {/* Trennlinie */}
            <div className="h-px bg-gradient-to-r from-white/[0.06] to-transparent mb-4" />

            {/* Item-Grid */}
            <div className={`grid gap-3 ${section.grid}`}>
              {sectionItems.map(item => {
                const owned     = purchasedIds.has(item.id);
                const canAfford = myPoints >= item.price;
                const soldOut   = item.stock !== null && item.stock <= 0;
                const purchase  = purchaseMap.get(item.id);

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
                    nameColor={me?.nameColor ?? null}
                    statusMessage={me?.statusMessage ?? null}
                    ownsStatusMessage={ownsStatusMessage}
                    purchaseId={purchase?.id}
                    consumed={purchase?.consumed}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

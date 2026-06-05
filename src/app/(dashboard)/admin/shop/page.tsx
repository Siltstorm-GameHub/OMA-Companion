import { prisma } from "@/lib/prisma";
import { RARITY_CONFIG, TYPE_CONFIG } from "@/lib/shop";
import ShopAdminPanel from "./ShopAdminPanel";

export default async function AdminShopPage() {
  const items = await prisma.shopItem.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });

  const stats = {
    total:    items.length,
    active:   items.filter(i => i.active).length,
    inactive: items.filter(i => !i.active).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Items gesamt", value: stats.total,    color: "text-white" },
          { label: "Aktiv",        value: stats.active,   color: "text-emerald-400" },
          { label: "Deaktiviert",  value: stats.inactive, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="glass card-shine rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <ShopAdminPanel items={items} rarityConfig={RARITY_CONFIG} typeConfig={TYPE_CONFIG} />
    </div>
  );
}

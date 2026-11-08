import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getShopConfig } from "@/lib/shop-config";
import { getCosmeticsConfig } from "@/lib/cosmetics/config";
import { ShopConfigPanel } from "./ShopConfigPanel";
import { CosmeticsConfigPanel } from "./CosmeticsConfigPanel";

export default async function AdminShopPage() {
  await requireRole("admin");
  const [config, cosmeticsConfig, owners] = await Promise.all([
    getShopConfig(),
    getCosmeticsConfig(),
    prisma.userCosmetic.groupBy({ by: ["itemId"], _count: { _all: true } }),
  ]);
  const ownerCounts = Object.fromEntries(owners.map(o => [o.itemId, o._count._all]));

  return (
    <div className="space-y-10 max-w-3xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          ✨ Kosmetik-Shop
        </h2>
        <CosmeticsConfigPanel initial={cosmeticsConfig} ownerCounts={ownerCounts} />
      </section>
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎰 Glücksrad
        </h2>
        <ShopConfigPanel initial={config} />
      </section>
    </div>
  );
}

import { requireRole } from "@/lib/roles";
import { getShopConfig } from "@/lib/shop-config";
import { ShopConfigPanel } from "./ShopConfigPanel";

export default async function AdminShopPage() {
  await requireRole("admin");
  const config = await getShopConfig();

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🛍️ Shop
        </h2>
        <ShopConfigPanel initial={config} />
      </section>
    </div>
  );
}

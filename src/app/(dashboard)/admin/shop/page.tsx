import { requireRole } from "@/lib/roles";
import { getShopConfig } from "@/lib/shop-config";
import { prisma } from "@/lib/prisma";
import { titleItems } from "@/lib/dnd/coin-shop";
import { ShopConfigPanel } from "./ShopConfigPanel";
import { TitlesPanel } from "./TitlesPanel";

export default async function AdminShopPage() {
  await requireRole("admin");
  const config = await getShopConfig();
  await titleItems(); // füllt den Titel-Katalog beim ersten Aufruf mit den Standard-Titeln
  const titles = await prisma.dndTitleDef.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🛍️ Shop
        </h2>
        <ShopConfigPanel initial={config} />
      </section>
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🏅 Ehrentitel (OMA Quest)
        </h2>
        <TitlesPanel initial={titles} />
      </section>
    </div>
  );
}

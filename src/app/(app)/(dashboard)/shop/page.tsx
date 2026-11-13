// ============================================
// /shop — Reiter „Shop“ des Games-Bereichs: tägliches Glücksrad und Kosmetik-Shop (Münzen gegen
// Rahmen, Auren, Profil-Hintergründe, Titel und Namensfarben)
// ============================================
// Katalog: lib/cosmetics/catalog.ts · Preise/Verfügbarkeit: /admin/shop · Logik: lib/cosmetics/service.ts
// Das Glücksrad steht oben, solange heute noch nicht gedreht wurde (Home verlinkt dann auf
// #gluecksrad), danach unter dem Shop.

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getShopState } from "@/lib/cosmetics/service";
import CosmeticsShop from "./CosmeticsShop";
import GamesSectionTabs from "@/components/games/GamesSectionTabs";
import DailySpin from "@/components/shop/DailySpin";
import { prisma } from "@/lib/prisma";
import { getShopConfig } from "@/lib/shop-config";
import { spinDateKey } from "@/lib/daily-spin";

export const metadata = {
  title: "Shop | OMA",
};

export default async function ShopPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/shop");

  const [state, todaySpin, shopConfig, user] = await Promise.all([
    getShopState(me.id),
    prisma.dailySpin.findUnique({ where: { userId_date: { userId: me.id, date: spinDateKey() } } }).catch(() => null),
    getShopConfig(),
    prisma.user.findUnique({ where: { id: me.id }, select: { points: true } }),
  ]);
  const wheel = (
    <section id="gluecksrad" className="scroll-mt-24">
      <DailySpin
        alreadySpun={!!todaySpin}
        lastResult={todaySpin ? { prizeLabel: todaySpin.prizeLabel, prizeType: todaySpin.prizeType } : null}
        initialPoints={user?.points ?? 0}
        prizes={shopConfig.wheelPrizes}
      />
    </section>
  );

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <GamesSectionTabs active="shop" userId={me.id} />
      {!todaySpin && wheel}
      <CosmeticsShop
        userId={me.id}
        displayName={me.username ?? me.name ?? "Du"}
        image={me.image}
        initial={state}
      />
      {todaySpin && wheel}
    </div>
  );
}

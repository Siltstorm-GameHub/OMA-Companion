// ============================================
// /shop — Kosmetik-Shop: Münzen gegen Rahmen, Auren, Profil-Hintergründe, Titel und Namensfarben
// ============================================
// Katalog: lib/cosmetics/catalog.ts · Preise/Verfügbarkeit: /admin/shop · Logik: lib/cosmetics/service.ts

import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/roles";
import { getShopState } from "@/lib/cosmetics/service";
import CosmeticsShop from "./CosmeticsShop";

export const metadata = {
  title: "Shop | OMA",
};

export default async function ShopPage() {
  const me = await getSessionUser();
  if (!me) redirect("/login?notice=login_required&callbackUrl=/shop");

  const state = await getShopState(me.id);

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <CosmeticsShop
        userId={me.id}
        displayName={me.username ?? me.name ?? "Du"}
        image={me.image}
        initial={state}
      />
    </div>
  );
}

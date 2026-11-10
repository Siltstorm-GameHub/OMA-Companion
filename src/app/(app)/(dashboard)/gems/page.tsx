// ============================================
// /gems — Games-Hub: OMA Gems und OMA Blocks (Umschalter oben, ?spiel=blocks öffnet OMA Blocks)
// ============================================
// OMA Gems: Edelsteine tauschen — klassisch (Level mit Zielen) oder als Tages-Herausforderung, mit Ranglisten
// und Monatswertung (siehe components/gems/GemsHubPanel). OMA Blocks siehe components/blocks/BlocksHubPanel.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { Gamepad2, ShoppingBag } from "@/components/icons";
import GamesSwitcher from "./GamesSwitcher";
import GameListBanner from "@/components/games/GameListBanner";
import BlocksHubPanel from "@/components/blocks/BlocksHubPanel";
import GemsHubPanel from "@/components/gems/GemsHubPanel";

export const metadata = {
  title: "Games | OMA",
};

export default async function GemsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems");
  }
  const userId = session.user.id;

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 sm:space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", boxShadow: "0 0 20px rgba(20,184,166,0.10)" }}
          >
            <Gamepad2 className="w-4.5 h-4.5 text-teal-400" />
          </div>
          <h1 className="font-display text-2xl font-black text-white tracking-tight">Games</h1>
        </div>
        <p className="text-xs text-gray-500 ml-11">Die Community-Spiele · OMA Gems und OMA Blocks mit Ranglisten und Monatswertungen</p>
      </div>
        <Link href="/shop" className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-amber-200 hover:text-amber-100 hover:bg-amber-500/10 transition-colors">
          <ShoppingBag className="w-4 h-4 text-amber-400" /> Münzen ausgeben im Shop
        </Link>
      </div>
      <GameListBanner />
      <GamesSwitcher gems={<GemsHubPanel userId={userId} />} blocks={<BlocksHubPanel userId={userId} />} />
    </div>
  );
}

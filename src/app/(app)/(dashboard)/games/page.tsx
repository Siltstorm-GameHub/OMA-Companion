// ============================================
// /games — Games-Hub der Community: OMA Blocks (siehe components/blocks/BlocksHubPanel), tägliches
// Glücksrad, Spieleliste mit aktuellen Angeboten
// ============================================
// Früher lag der Hub unter /gems und enthielt zusätzlich OMA Gems; alte Adressen leiten hierher um
// (next.config.ts). Das Glücksrad steht oben, solange heute noch nicht gedreht wurde (Home verlinkt
// dann auf #gluecksrad), danach am Seitenende.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { Gamepad2, ShoppingBag } from "@/components/icons";
import GameListBanner from "@/components/games/GameListBanner";
import BlocksHubPanel from "@/components/blocks/BlocksHubPanel";
import GameSalesStrip from "@/components/games/GameSalesStrip";
import DailySpin from "@/components/shop/DailySpin";
import { prisma } from "@/lib/prisma";
import { getShopConfig } from "@/lib/shop-config";
import { spinDateKey } from "@/lib/daily-spin";

export const metadata = {
  title: "Games | OMA",
};

export default async function GamesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/games");
  }
  const userId = session.user.id;
  const [todaySpin, shopConfig, user] = await Promise.all([
    prisma.dailySpin.findUnique({ where: { userId_date: { userId, date: spinDateKey() } } }).catch(() => null),
    getShopConfig(),
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
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
        <p className="text-xs text-gray-500 ml-11">Das Community-Spiel · OMA Blocks mit Ranglisten und Monatswertung</p>
      </div>
        <Link href="/shop" className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-medium text-amber-200 hover:text-amber-100 hover:bg-amber-500/10 transition-colors">
          <ShoppingBag className="w-4 h-4 text-amber-400" /> Münzen ausgeben im Shop
        </Link>
      </div>
      {!todaySpin && wheel}
      <GameListBanner />
      <GameSalesStrip userId={userId} />
      <BlocksHubPanel userId={userId} />
      {todaySpin && wheel}
    </div>
  );
}

import { getSessionUser } from "@/lib/roles";
import { ShoppingBag } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { CountUp } from "@/components/CountUp";
import DailySpin from "./DailySpin";
import BuyPack from "./BuyPack";
import { prisma } from "@/lib/prisma";
import { getShopConfig } from "@/lib/shop-config";

export default async function ShopPage() {
  const me     = await getSessionUser();
  const userId = me?.id;

  const todaySpin = userId
    ? await prisma.dailySpin.findFirst({
        where: { userId, date: new Date().toISOString().slice(0, 10) },
      }).catch(() => null)
    : null;

  const { packCost, wheelPrizes } = await getShopConfig();
  const myPoints  = me?.points ?? 0;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="card-cut surface relative overflow-hidden p-5 accent-amber"
        style={{ boxShadow: "0 0 0 1px rgba(245,158,11,0.10), 0 4px 24px rgba(0,0,0,0.5)" }}>
        <div className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.20), transparent)" }} />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="card-cut-sm w-10 h-10 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-black text-white tracking-tight">Shop</h1>
              <p className="text-[11px] text-gray-600">Tägliche Drehung um Münzen und Preise</p>
            </div>
          </div>
          {userId && (
            <div className="card-cut-sm flex items-center gap-2 px-4 py-2 bg-amber-500/8 border border-amber-500/15">
              <CoinIcon size={16} />
              <span className="text-sm font-bold text-amber-400 tabular-nums">
                <CountUp to={myPoints} /> Münzen
              </span>
            </div>
          )}
        </div>
      </div>

      {userId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Tages-Spin */}
          <DailySpin
            alreadySpun={!!todaySpin}
            lastResult={todaySpin
              ? { prizeLabel: todaySpin.prizeLabel, prizeType: todaySpin.prizeType }
              : null}
            initialPoints={myPoints}
            prizes={wheelPrizes}
          />
          <BuyPack cost={packCost} initialPoints={myPoints} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2, Package } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export default function BuyPack({
  cost,
  initialPoints,
  dailyLimit,
  purchasedToday,
}: {
  cost: number;
  initialPoints: number;
  dailyLimit: number;
  purchasedToday: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState(initialPoints);
  const [boughtToday, setBoughtToday] = useState(purchasedToday);

  const canAfford = points >= cost;
  const limitReached = boughtToday >= dailyLimit;

  async function handleBuy() {
    if (loading || !canAfford || limitReached) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/buy-pack", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Kauf");
        return;
      }
      setPoints((p) => p - cost);
      setBoughtToday((b) => b + 1);
      toast.success("🎴 Karten-Pack gekauft!", {
        description: "Öffne es auf der Battle-Cards-Seite.",
      });
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass card-shine rounded-2xl border border-violet-500/15 overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Karten-Pack</p>
            <p className="text-xs text-gray-500">Zufällige Standard-Karte — öffnen auf Battle Cards.</p>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading || !canAfford || limitReached}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            !canAfford || limitReached
              ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
              : loading
                ? "bg-violet-700/60 text-violet-300 cursor-wait"
                : "bg-violet-500 hover:bg-violet-400 text-black shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:shadow-[0_0_32px_rgba(139,92,246,0.5)] active:scale-[0.97]"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CoinIcon size={16} /> {cost} Münzen
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
          <Package className="w-3 h-3" />
          {boughtToday}/{dailyLimit} heute gekauft
        </div>

        {!canAfford && !limitReached && (
          <p className="text-[11px] text-gray-600 text-center">Nicht genug Münzen.</p>
        )}
        {limitReached && <p className="text-[11px] text-gray-600 text-center">Tageslimit erreicht — morgen wieder.</p>}
      </div>
    </div>
  );
}

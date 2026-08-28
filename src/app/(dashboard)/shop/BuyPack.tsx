"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Sparkles, Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

export default function BuyPack({ cost, initialPoints }: { cost: number; initialPoints: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState(initialPoints);

  const canAfford = points >= cost;

  async function handleBuy() {
    if (loading || !canAfford) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/buy-pack", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Kauf");
        return;
      }
      setPoints((p) => p - cost);
      toast.success(`🎴 ${data.card.name} erhalten!`, {
        description: data.isNewCard ? "Neue Karte für deine Sammlung." : `Duplikat (jetzt ${data.duplicates}x).`,
      });
      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.55 },
        colors: ["#8b5cf6", "#c4b5fd", "#ede9fe", "#ffffff"],
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
            <p className="text-xs text-gray-500">Zufällige Standard-Karte für deine Sammlung.</p>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading || !canAfford}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            !canAfford
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
        {!canAfford && !loading && (
          <p className="text-[11px] text-gray-600 text-center">Nicht genug Münzen.</p>
        )}
      </div>
    </div>
  );
}

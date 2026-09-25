"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dices, Loader2 } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";

export default function BuyDndReroll({
  cost,
  points,
  currentCredits,
  hasCharacter,
}: {
  cost: number;
  points: number;
  currentCredits: number;
  hasCharacter: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canAfford = points >= cost;

  async function handleBuy() {
    if (loading || !canAfford || !hasCharacter) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/buy-dnd-reroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Kauf");
        return;
      }
      toast.success("🎲 Re-Roll-Credit gekauft!", { description: "Nutzbar unter /dnd." });
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="moba-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Dices className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">D&D-Charakter neu würfeln</p>
          <p className="text-[11px] text-gray-500">Rasse, Klasse und Attribute zusammen neu auswürfeln.</p>
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Aktuell verfügbar: <span className="font-bold text-white">{currentCredits}</span>
      </p>

      <button
        type="button"
        onClick={handleBuy}
        disabled={loading || !canAfford || !hasCharacter}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-bold text-white transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CoinIcon size={16} />}
        {cost} Münzen
      </button>
      {!hasCharacter && (
        <p className="text-[10px] text-gray-600 text-center">Erst unter /dnd einen Charakter erstellen.</p>
      )}
    </div>
  );
}

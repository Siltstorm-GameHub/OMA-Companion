"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Loader2, Check, Star, Lock, Package } from "lucide-react";
import { RARITY_CONFIG } from "@/lib/shop";

interface ShopItem {
  id: string; name: string; icon: string; price: number;
  type: string; value: string; rarity: string;
}

interface BundleItem extends ShopItem {
  description: string;
  subItems:    { id: string; name: string; icon: string }[];
  normalPrice: number; // Summe der Einzelpreise
}

interface Props {
  item:       BundleItem;
  owned:      boolean;
  canAfford:  boolean;
  myPoints:   number;
}

export default function BundleCard({ item, owned, canAfford, myPoints }: Props) {
  const [loading, setLoading] = useState(false);
  const [localOwned, setOwned] = useState(owned);
  const router = useRouter();

  const rarity  = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG] ?? RARITY_CONFIG.common;
  const savings = item.normalPrice - item.price;
  const savePct = Math.round((savings / item.normalPrice) * 100);

  async function handleBuy() {
    if (localOwned || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/purchase", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
      setOwned(true);
      toast.success(`🎁 ${item.name} gekauft!`, { description: `${item.subItems.length} Items freigeschaltet.` });
      router.refresh();
    } catch { toast.error("Netzwerkfehler"); }
    finally  { setLoading(false); }
  }

  return (
    <div className={`card-shine glass relative overflow-hidden rounded-2xl border transition-all duration-200 ${rarity.border} ${rarity.glow ?? ""}`}>
      {/* Rarity glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rarity.bg} to-transparent pointer-events-none`} />
      {/* Top accent */}
      <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${
        item.rarity === "legendary" ? "via-amber-400/50" : item.rarity === "epic" ? "via-purple-400/40" : "via-blue-400/35"
      } to-transparent`} />

      {/* Ersparnis-Badge */}
      <div className="absolute top-3 right-3">
        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          -{savePct}%
        </span>
      </div>

      <div className="relative p-4">
        {/* Icon + Titel */}
        <div className="flex items-center gap-2.5 mb-3 pr-14">
          <span className="text-3xl leading-none">{item.icon}</span>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{item.name}</p>
            <span className={`text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.description}</p>

        {/* Enthaltene Items */}
        <div className="mb-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
            <Package className="w-3 h-3" /> Enthält
          </p>
          <div className="flex flex-wrap gap-1.5">
            {item.subItems.map(si => (
              <span key={si.id} className="text-xs px-2 py-0.5 rounded-lg glass border border-white/[0.08] text-gray-300">
                {si.icon} {si.name}
              </span>
            ))}
          </div>
        </div>

        {/* Preis + Kaufen */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className={`text-sm font-bold tabular-nums ${canAfford || localOwned ? "text-amber-400" : "text-red-400"}`}>
                {item.price.toLocaleString("de-DE")}
              </span>
            </div>
            <p className="text-[10px] text-gray-600 line-through ml-5">
              {item.normalPrice.toLocaleString("de-DE")} Punkte
            </p>
          </div>

          {localOwned ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <Check className="w-3 h-3" /> Besessen
            </span>
          ) : (
            <button onClick={handleBuy} disabled={loading || !canAfford}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all active:scale-[0.97] disabled:opacity-50 ${
                !canAfford
                  ? "bg-white/[0.04] text-red-400 border border-red-500/20 cursor-not-allowed"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.2)]"
              }`}>
              {loading      ? <Loader2 className="w-3 h-3 animate-spin" /> :
               !canAfford   ? <><Lock className="w-3 h-3" /> Zu teuer</> :
               <><ShoppingCart className="w-3 h-3" /> Bundle kaufen</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

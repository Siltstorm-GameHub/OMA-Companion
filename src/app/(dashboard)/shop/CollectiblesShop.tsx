"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ShoppingCart, Check, Loader2, Lock, Star, Package, ImageIcon, Tag } from "lucide-react";
import { RARITY_CONFIG, type Rarity } from "@/lib/collectibles";

interface CollectibleItem {
  id: string; name: string; description: string | null; imageUrl: string | null;
  rarity: string; stock: number | null; sortOrder: number;
  // vorberechnet vom Server
  displayPrice:  number;
  originalPrice: number;
  onSale:        boolean;
}
interface Collection {
  id: string; name: string; description: string | null; game: string | null;
  coverImageUrl: string | null; items: CollectibleItem[];
}

interface Props {
  collections: Collection[];
  ownedIds:    string[];
  myPoints:    number;
  isLoggedIn:  boolean;
}

export default function CollectiblesShop({ collections, ownedIds, myPoints, isLoggedIn }: Props) {
  const router = useRouter();
  const [open,       setOpen]       = useState<Record<string, boolean>>({});
  const [buying,     setBuying]     = useState<string | null>(null);
  const [localOwned, setLocalOwned] = useState<Set<string>>(new Set(ownedIds));

  const toggleOpen = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }));

  async function handleBuy(item: CollectibleItem) {
    if (!isLoggedIn) { toast.error("Bitte einloggen"); return; }
    if (localOwned.has(item.id)) return;
    if (myPoints < item.displayPrice) { toast.error("Nicht genug Münzen"); return; }

    setBuying(item.id);
    try {
      const res = await fetch("/api/shop/collectible", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ collectibleItemId: item.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
      setLocalOwned(s => new Set([...s, item.id]));
      toast.success(`${item.name} zur Sammlung hinzugefügt!`);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBuying(null);
    }
  }

  if (collections.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Noch keine Sammlungen verfügbar</p>
        <p className="text-xs text-gray-600 mt-1">Schau bald wieder vorbei!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {collections.map(col => {
        const isOpen     = open[col.id] ?? true;
        const ownedInCol = col.items.filter(i => localOwned.has(i.id)).length;
        const total      = col.items.length;
        const pct        = total > 0 ? Math.round((ownedInCol / total) * 100) : 0;
        const complete   = ownedInCol === total && total > 0;
        const saleCount  = col.items.filter(i => i.onSale && !localOwned.has(i.id)).length;

        return (
          <div key={col.id} className="glass card-shine rounded-2xl overflow-hidden">

            {/* Collection header */}
            <button
              onClick={() => toggleOpen(col.id)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                complete ? "bg-amber-500/15 border border-amber-500/30" : "bg-white/[0.04] border border-white/[0.08]"
              }`}>
                {col.coverImageUrl
                  ? <img src={col.coverImageUrl} alt={col.name} className="w-full h-full object-contain" />
                  : <ImageIcon className="w-6 h-6 text-gray-600" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white">{col.name}</h2>
                  {col.game && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">{col.game}</span>}
                  {complete && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-semibold">✓ Komplett</span>}
                  {saleCount > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 font-semibold flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> Sale</span>}
                </div>
                {col.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{col.description}</p>}

                {/* Progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${complete ? "bg-gradient-to-r from-amber-500 to-amber-300" : "bg-gradient-to-r from-indigo-500 to-purple-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{ownedInCol}/{total}</span>
                </div>
              </div>

              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
            </button>

            {/* Items grid */}
            {isOpen && (
              <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 border-t border-white/[0.04]">
                {col.items.map(item => {
                  const rarity    = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                  const owned     = localOwned.has(item.id);
                  const canAfford = myPoints >= item.displayPrice;
                  const soldOut   = item.stock !== null && item.stock <= 0;
                  const isLoading = buying === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${rarity.border} ${rarity.glow} ${owned ? "opacity-70" : ""}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-b ${rarity.bg} to-transparent pointer-events-none`} />

                      {/* Sale-Badge */}
                      {item.onSale && !owned && (
                        <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 z-10">
                          <Tag className="w-2.5 h-2.5 text-rose-400" />
                          <span className="text-[9px] font-bold text-rose-400">SALE</span>
                        </div>
                      )}

                      {/* Owned checkmark */}
                      {owned && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center z-10">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                      )}

                      <div className="relative p-3 flex flex-col items-center text-center gap-2">
                        {/* Bild */}
                        <div className="w-16 h-16 flex items-center justify-center mt-1">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" loading="lazy" />
                            : <ImageIcon className="w-8 h-8 text-gray-600" />
                          }
                        </div>

                        {/* Rarity stars */}
                        <div className="flex gap-0.5">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < rarity.stars ? rarity.color : "text-gray-700"}`} fill={i < rarity.stars ? "currentColor" : "none"} />
                          ))}
                        </div>

                        <p className="text-xs font-semibold text-white leading-tight">{item.name}</p>
                        {item.description && <p className="text-[10px] text-gray-500 leading-tight">{item.description}</p>}

                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${rarity.color} ${rarity.border} bg-white/[0.03]`}>
                          {rarity.label}
                        </span>

                        {/* Preis */}
                        {item.onSale && !owned && (
                          <p className="text-[10px] text-gray-500 line-through tabular-nums">
                            {item.originalPrice.toLocaleString("de-DE")} 🪙
                          </p>
                        )}

                        {/* Kauf-Button */}
                        {!owned ? (
                          <button
                            onClick={() => handleBuy(item)}
                            disabled={isLoading || soldOut || !canAfford || !isLoggedIn}
                            className={`w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all active:scale-[0.97] disabled:opacity-50 mt-1 ${
                              soldOut
                                ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
                                : !canAfford
                                ? "bg-white/[0.04] text-red-400 border border-red-500/15 cursor-not-allowed"
                                : !isLoggedIn
                                ? "bg-white/[0.04] text-gray-500 border border-white/[0.06] cursor-not-allowed"
                                : item.onSale
                                ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25"
                                : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25"
                            }`}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" />
                           : soldOut   ? <><Lock className="w-3 h-3" /> Ausverkauft</>
                           : !canAfford ? <><Lock className="w-3 h-3" /> {item.displayPrice.toLocaleString("de-DE")}</>
                           : <><ShoppingCart className="w-3 h-3" /> {item.displayPrice.toLocaleString("de-DE")}</>
                            }
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1">
                            <Check className="w-3 h-3" /> In Sammlung
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

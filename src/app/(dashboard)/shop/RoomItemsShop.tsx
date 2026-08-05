"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown, ChevronUp, ShoppingCart, Check, Loader2, Lock, Sofa, Briefcase,
} from "lucide-react";
import { RoomItemPreview } from "@/app/(dashboard)/zimmer/RoomItemSprite";
import { shopItems, isSurface, type RoomItemDef } from "@/lib/room-items";
import { jobsUnlockedBy } from "@/lib/jobs";
import { RANKS } from "@/lib/ranks";
import { cn } from "@/lib/utils";

interface Props {
  /** Besitzstand je itemKey (aufgestellt + im Lager). */
  owned:      Record<string, number>;
  myPoints:   number;
  /** Rangstufe 1–6 des Users — entscheidet, was schon kaufbar ist. */
  rankTier:   number;
  isLoggedIn: boolean;
}

/** Anzeigename der Rangstufe, z.B. "Rollator-Raser" — für gesperrte Möbel. */
function tierLabel(tier: number): string {
  return RANKS.find(r => r.tier === tier)?.label ?? `Stufe ${tier}`;
}

/**
 * Möbel-Bereich des Shops. Bewusst hier statt in einem eigenen Sheet im Zimmer:
 * Münzen ausgeben passiert in dieser App im Shop, und der Vergleich mit den
 * Sammlerstücken direkt darüber macht den Preis einordbar.
 */
export default function RoomItemsShop({ owned, myPoints, rankTier, isLoggedIn }: Props) {
  const router = useRouter();
  const groups = shopItems();

  const [open,   setOpen]   = useState<Record<string, boolean>>({});
  const [buying, setBuying] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>(owned);
  const [points, setPoints] = useState(myPoints);

  async function handleBuy(def: RoomItemDef) {
    if (!isLoggedIn) { toast.error("Bitte einloggen"); return; }

    setBuying(def.key);
    try {
      const res  = await fetch("/api/shop/room-item", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemKey: def.key }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }

      setCounts(c => ({ ...c, [def.key]: (c[def.key] ?? 0) + 1 }));
      setPoints(data.points ?? points - def.price);
      toast.success(
        isSurface(def)
          ? `${def.label} gekauft — im Zimmer unter "Einrichten" auswählen`
          : `${def.label} liegt jetzt in deinem Lager`,
        { action: { label: "Ins Zimmer", onClick: () => router.push("/zimmer") } },
      );
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBuying(null);
    }
  }

  return (
    <section id="moebel" className="space-y-4 scroll-mt-24">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sofa className="w-4 h-4 text-violet-400" />
          <h2 className="text-base font-bold text-white">Gaming-Zimmer</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
            Möbel &amp; Deko
          </span>
        </div>
        <Link href="/zimmer" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">
          Zimmer ansehen →
        </Link>
      </div>

      {groups.map(group => {
        const isOpen    = open[group.category] ?? false;
        const ownedHere = group.items.filter(i => (counts[i.key] ?? 0) > 0).length;
        const total     = group.items.length;
        const pct       = total > 0 ? Math.round((ownedHere / total) * 100) : 0;
        const complete  = ownedHere === total && total > 0;

        return (
          <div key={group.category} className="glass card-shine rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(o => ({ ...o, [group.category]: !isOpen }))}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border p-1.5",
                complete ? "bg-amber-500/15 border-amber-500/30" : "bg-white/[0.04] border-white/[0.08]"
              )}>
                <RoomItemPreview itemKey={group.items[0].key} size={36} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-white">{group.label}</h3>
                  {complete && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-semibold">
                      ✓ Komplett
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 bg-gradient-to-r",
                        complete ? "from-amber-500 to-amber-300" : "from-violet-500 to-teal-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 tabular-nums shrink-0">{ownedHere}/{total}</span>
                </div>
              </div>

              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-600 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-600 shrink-0" />}
            </button>

            {isOpen && (
              <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 border-t border-white/[0.04] pt-4">
                {group.items.map(def => (
                  <ItemCard
                    key={def.key}
                    def={def}
                    owned={counts[def.key] ?? 0}
                    points={points}
                    rankTier={rankTier}
                    isLoggedIn={isLoggedIn}
                    loading={buying === def.key}
                    onBuy={() => handleBuy(def)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ItemCard({
  def, owned, points, rankTier, isLoggedIn, loading, onBuy,
}: {
  def: RoomItemDef; owned: number; points: number; rankTier: number;
  isLoggedIn: boolean; loading: boolean; onBuy: () => void;
}) {
  const rankLocked = rankTier < def.minTier;
  const maxedOut   = owned >= def.maxOwned;
  const canAfford  = points >= def.price;
  const unlocks    = jobsUnlockedBy(def.key);

  const accentBorder = {
    violet: "border-violet-500/25", teal: "border-teal-500/25",
    amber:  "border-amber-500/25",  rose: "border-rose-500/25",
    slate:  "border-white/[0.08]",
  }[def.accent];

  return (
    <div className={cn(
      "relative rounded-xl border overflow-hidden transition-all duration-200 bg-white/[0.02]",
      accentBorder,
      (maxedOut || rankLocked) && "opacity-60"
    )}>
      {owned > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 z-10">
          <Check className="w-2.5 h-2.5 text-emerald-400" />
          {def.maxOwned > 1 && <span className="text-[9px] font-bold text-emerald-400">{owned}</span>}
        </div>
      )}

      <div className="relative p-3 flex flex-col items-center text-center gap-2">
        <div className="h-16 flex items-center justify-center mt-1">
          <RoomItemPreview itemKey={def.key} size={58} />
        </div>

        <p className="text-xs font-semibold text-white leading-tight">{def.label}</p>
        <p className="text-[10px] text-gray-500 leading-snug line-clamp-2">{def.description}</p>

        <p className="text-[9px] text-gray-600">
          {isSurface(def)
            ? (def.category === "tapete" ? "Wandfläche" : "Bodenfläche")
            : `${def.zone === "wall" ? "Wand" : "Boden"} · ${def.w}×${def.h} Felder`}
        </p>

        {unlocks.length > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center gap-1 leading-tight">
            <Briefcase className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">
              {unlocks.length === 1 ? unlocks[0].label : `${unlocks.length} Jobs`}
            </span>
          </span>
        )}

        {maxedOut ? (
          <div className="w-full flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1 py-1.5">
            <Check className="w-3 h-3" /> {def.maxOwned > 1 ? "Genug davon" : "Besitzt du"}
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={loading || rankLocked || !canAfford || !isLoggedIn}
            title={rankLocked ? `Ab Rang ${tierLabel(def.minTier)}` : undefined}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2 py-1.5 rounded-lg transition-all active:scale-[0.97] disabled:cursor-not-allowed mt-1",
              rankLocked  ? "bg-white/[0.04] text-gray-500 border border-white/[0.06]"
            : !canAfford  ? "bg-white/[0.04] text-red-400 border border-red-500/15"
            : !isLoggedIn ? "bg-white/[0.04] text-gray-500 border border-white/[0.06]"
            :               "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25"
            )}
          >
            {loading      ? <Loader2 className="w-3 h-3 animate-spin" />
           : rankLocked   ? <><Lock className="w-3 h-3" /> {tierLabel(def.minTier)}</>
           : !canAfford   ? <><Lock className="w-3 h-3" /> {def.price.toLocaleString("de-DE")}</>
           :                <><ShoppingCart className="w-3 h-3" /> {def.price.toLocaleString("de-DE")}</>}
          </button>
        )}
      </div>
    </div>
  );
}

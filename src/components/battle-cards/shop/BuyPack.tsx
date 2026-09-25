"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Package } from "@/components/icons";
import { Loader2 } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import type { PackKind, PackPrices } from "@/lib/shop-config";
import { PackCoverArt } from "@/components/battle-cards/pack-visuals";

const PACK_INFO: Record<PackKind, { label: string; description: string; accent: string; glow: string }> = {
  STANDARD: {
    label: "Standard-Pack",
    description: "1 Karte — sehr geringe Chance auf eine Community-Karte.",
    accent: "violet",
    glow: "rgba(139,92,246,0.35)",
  },
  PREMIUM: {
    label: "Premium-Pack",
    description: "5 Karten — deutlich erhöhte Chance (~25%) auf eine Community-Karte.",
    accent: "sky",
    glow: "rgba(56,189,248,0.35)",
  },
  COMMUNITY: {
    label: "Community-Pack",
    description: "1 Karte — garantiert eine Community-Karte!",
    accent: "amber",
    glow: "rgba(245,158,11,0.4)",
  },
};

const ACCENT_CLASSES: Record<string, { button: string }> = {
  violet: { button: "bg-violet-500 hover:bg-violet-400 text-black" },
  sky: { button: "bg-sky-500 hover:bg-sky-400 text-black" },
  amber: { button: "bg-amber-500 hover:bg-amber-400 text-black" },
};

const PACK_ORDER: PackKind[] = ["STANDARD", "PREMIUM", "COMMUNITY"];

function PackCard({
  kind,
  cost,
  points,
  limitReached,
  onBought,
}: {
  kind: PackKind;
  cost: number;
  points: number;
  limitReached: boolean;
  onBought: (kind: PackKind, cost: number) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const info = PACK_INFO[kind];
  const accent = ACCENT_CLASSES[info.accent];
  const canAfford = points >= cost;

  async function handleBuy() {
    if (loading || !canAfford || limitReached) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/buy-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Kauf");
        return;
      }
      onBought(kind, cost);
      toast.success(`🎴 ${info.label} gekauft!`, {
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
    <div className="group relative rounded-2xl overflow-hidden">
      {/* MOBA-Kit-Shop-Karte statt generischer "glass"-Kachel (Assets/UI/MOBA
          Style/PNG/DIALOGS/CARD & FRAME/shop & Character/item) — Rahmen
          wechselt bei Hover auf die Gold-Glow-Variante, exakt das gleiche
          Stretch-Muster (objectFit:"fill") wie MOBA_CARD_FRAME_IMAGE bei den
          Battle-Cards selbst. */}
      <img src="/battle-cards/moba/shop-card/bg.png" alt="" aria-hidden className="absolute inset-0 w-full h-full z-0" style={{ objectFit: "fill" }} />
      <img
        src="/battle-cards/moba/shop-card/frame.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full z-10 pointer-events-none transition-opacity group-hover:opacity-0"
        style={{ objectFit: "fill" }}
      />
      <img
        src="/battle-cards/moba/shop-card/frame-hovered.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full z-10 pointer-events-none opacity-0 transition-opacity group-hover:opacity-100"
        style={{ objectFit: "fill" }}
      />
      {limitReached && (
        <img src="/battle-cards/moba/shop-card/locked.png" alt="" aria-hidden className="absolute inset-0 w-full h-full z-20 pointer-events-none" style={{ objectFit: "fill" }} />
      )}

      <div className="relative z-30 p-5 flex flex-col items-center gap-4 text-center">
        <PackCoverArt kind={kind} showLabel={false} className={`w-32 h-[178px] shrink-0 ${limitReached ? "opacity-30" : ""}`} />
        <div>
          <p className="text-sm font-semibold text-white">{info.label}</p>
          <p className="text-xs text-gray-500 mt-1">{info.description}</p>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading || !canAfford || limitReached}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            !canAfford || limitReached
              ? "bg-white/[0.04] text-gray-600 border border-white/[0.06] cursor-not-allowed"
              : loading
                ? "opacity-60 cursor-wait " + accent.button
                : `active:scale-[0.97] ${accent.button}`
          }`}
          style={!loading && canAfford && !limitReached ? { boxShadow: `0 0 24px ${info.glow}` } : undefined}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CoinIcon size={16} /> {cost} Münzen
            </>
          )}
        </button>

        {!canAfford && !limitReached && <p className="text-[11px] text-gray-600 text-center">Nicht genug Münzen.</p>}
      </div>
    </div>
  );
}

export default function BuyPack({
  packPrices,
  initialPoints,
  dailyLimit,
  purchasedToday,
}: {
  packPrices: PackPrices;
  initialPoints: number;
  dailyLimit: number;
  purchasedToday: number;
}) {
  const [points, setPoints] = useState(initialPoints);
  const [boughtToday, setBoughtToday] = useState(purchasedToday);
  const limitReached = boughtToday >= dailyLimit;

  function handleBought(_kind: PackKind, cost: number) {
    setPoints((p) => p - cost);
    setBoughtToday((b) => b + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
        <Package className="w-3 h-3" />
        {boughtToday}/{dailyLimit} Packs heute gekauft
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PACK_ORDER.map((kind) => (
          <PackCard
            key={kind}
            kind={kind}
            cost={packPrices[kind]}
            points={points}
            limitReached={limitReached}
            onBought={handleBought}
          />
        ))}
      </div>
      {limitReached && <p className="text-[11px] text-gray-600 text-center">Tageslimit erreicht — morgen wieder.</p>}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import {
  ShoppingCart, Check, Loader2, Lock, Briefcase, Clock, RefreshCw, RotateCw,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { isSurface, type RoomItemDef } from "@/lib/room-items";
import { jobsUnlockedBy } from "@/lib/jobs";
import { cn } from "@/lib/utils";

// R3F/Three.js laufen ausschließlich im Browser (WebGL-Kontext).
const RoomItem3DPreview = dynamic(
  () => import("./RoomItem3DPreview").then(m => m.RoomItem3DPreview),
  { ssr: false, loading: () => <div className="w-48 sm:w-56 aspect-square mx-auto rounded-xl bg-[#0d0b12] animate-pulse" /> },
);

interface Props {
  def: RoomItemDef | null;
  onClose: () => void;
  owned: number;
  points: number;
  isLoggedIn: boolean;
  loading: boolean;
  onBuy: () => void;
  currentSlotItemLabel?: string;
}

export function ItemDetailModal({
  def, onClose, owned, points, isLoggedIn, loading, onBuy, currentSlotItemLabel,
}: Props) {
  if (!def) return null;

  const maxedOut  = owned >= def.maxOwned;
  const canAfford = points >= def.price;
  const unlocks   = jobsUnlockedBy(def.key);
  const isUpgrade = !maxedOut && !!currentSlotItemLabel;

  return (
    <Modal open={!!def} onClose={onClose} title={def.label} size="md">
      <div className="space-y-4">
        <div className="relative">
          <RoomItem3DPreview def={def} />
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[9px] text-gray-300">
            <RotateCw className="w-2.5 h-2.5" /> Ziehen zum Drehen
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-400 leading-relaxed">{def.description}</p>
          <p className="text-[11px] text-gray-500">
            {isSurface(def)
              ? (def.category === "tapete" ? "Wandfläche" : "Bodenfläche")
              : `${def.zone === "wall" ? "Wand" : "Boden"} · ${def.w}×${def.h} Felder`}
          </p>
        </div>

        {unlocks.length > 0 && (
          <div className="glass rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-3 h-3" /> Wird für diese Jobs gebraucht
            </p>
            <div className="space-y-1.5">
              {unlocks.map(job => (
                <div key={job.key} className="flex items-center gap-2 text-xs">
                  <span className="text-base leading-none">{job.emoji}</span>
                  <span className="text-gray-300 font-medium">{job.label}</span>
                  <span className="text-gray-600 ml-auto tabular-nums">{job.coinsPerHour}/h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isUpgrade && (
          <p className="text-xs text-amber-400/80 leading-snug flex items-start gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Ersetzt &quot;{currentSlotItemLabel}&quot; — wandert automatisch ins Lager</span>
          </p>
        )}

        {def.season && (
          <span className="inline-flex text-[10px] px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 items-center gap-1.5">
            <Clock className="w-3 h-3 shrink-0" /> Zeitlich begrenzt erhältlich
          </span>
        )}

        {maxedOut ? (
          <div className="w-full flex items-center justify-center gap-1.5 text-sm text-emerald-400 font-semibold py-2.5">
            <Check className="w-4 h-4" /> {def.maxOwned > 1 ? "Genug davon" : "Besitzt du bereits"}
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={loading || !canAfford || !isLoggedIn}
            className={cn(
              "w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed",
              !canAfford  ? "bg-white/[0.04] text-red-400 border border-red-500/15"
            : !isLoggedIn ? "bg-white/[0.04] text-gray-500 border border-white/[0.06]"
            :               "bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25"
            )}
          >
            {loading      ? <Loader2 className="w-4 h-4 animate-spin" />
           : !canAfford   ? <><Lock className="w-4 h-4" /> {def.price.toLocaleString("de-DE")} — zu wenig Münzen</>
           :                <><ShoppingCart className="w-4 h-4" /> Für {def.price.toLocaleString("de-DE")} Münzen kaufen</>}
          </button>
        )}
      </div>
    </Modal>
  );
}

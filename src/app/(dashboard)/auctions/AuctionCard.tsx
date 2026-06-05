"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Gavel, Clock } from "lucide-react";

interface Auction {
  id: string;
  startPrice: number;
  minBidStep: number;
  currentBid: number;
  endsAt: Date | string;
  currentBidder: { username: string | null; name: string | null } | null;
  item: { id: string; name: string; icon: string; rarity: string; description: string };
  bids: { amount: number; user: { username: string | null; name: string | null }; createdAt: Date | string }[];
}

interface Props {
  auction:     Auction;
  myPoints:    number;
  userId:      string | null;
  rarityConfig: Record<string, { label: string; color: string; border: string; bg: string; glow?: string }>;
}

function useCountdown(endsAt: Date | string) {
  const end = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState(end - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(end - Date.now()), 1000);
    return () => clearInterval(id);
  }, [end]);

  if (remaining <= 0) return "Abgelaufen";
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AuctionCard({ auction, myPoints, userId, rarityConfig }: Props) {
  const router  = useRouter();
  const rarity  = rarityConfig[auction.item.rarity] ?? rarityConfig.common;
  const countdown = useCountdown(auction.endsAt);
  const isExpired = countdown === "Abgelaufen";
  const isLeading = auction.currentBidder && userId && auction.currentBidder.username === undefined;

  const minBid   = Math.max(auction.startPrice, auction.currentBid + auction.minBidStep);
  const [bid,    setBid]    = useState(minBid);
  const [loading, setLoading] = useState(false);
  const [showBids, setShowBids] = useState(false);

  const amILeading = auction.currentBidder !== null && userId !== null && auction.currentBid > 0;

  async function placeBid() {
    if (loading || isExpired) return;
    if (bid < minBid) { toast.error(`Mindestgebot: ${minBid.toLocaleString("de")} Punkte`); return; }
    if (bid > myPoints) { toast.error("Nicht genug Punkte"); return; }

    setLoading(true);
    try {
      const res  = await fetch(`/api/auctions/${auction.id}/bid`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ amount: bid }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(`✅ Gebot von ${bid.toLocaleString("de")} Punkten platziert!`);
      setBid(data.minNextBid);
      router.refresh();
    } catch { toast.error("Netzwerkfehler"); }
    finally  { setLoading(false); }
  }

  return (
    <div className={`card-shine glass relative overflow-hidden rounded-2xl border ${rarity.border} ${rarity.glow ?? ""}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${rarity.bg} to-transparent pointer-events-none`} />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl leading-none">{auction.item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">{auction.item.name}</p>
            <span className={`text-[10px] font-semibold ${rarity.color}`}>{rarity.label}</span>
          </div>
          {/* Countdown */}
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
            isExpired ? "text-gray-600 border-white/[0.06]" :
            countdown.includes("s") && !countdown.includes("m") ? "text-red-400 border-red-500/25 bg-red-500/10 animate-pulse" :
            "text-amber-400 border-amber-500/20 bg-amber-500/[0.08]"
          }`}>
            <Clock className="w-3 h-3" />
            {countdown}
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4 leading-relaxed">{auction.item.description}</p>

        {/* Gebots-Info */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Aktuelles Gebot</p>
            <p className="text-lg font-black text-amber-400">
              {auction.currentBid > 0 ? `${auction.currentBid.toLocaleString("de")} Pts` : `Ab ${auction.startPrice.toLocaleString("de")} Pts`}
            </p>
            {auction.currentBidder && (
              <p className="text-[10px] text-gray-500">von {auction.currentBidder.username ?? auction.currentBidder.name}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Mindestgebot</p>
            <p className="text-sm font-bold text-white">{minBid.toLocaleString("de")} Pts</p>
          </div>
        </div>

        {/* Bid Input */}
        {!isExpired && userId && (
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min={minBid}
              step={auction.minBidStep}
              value={bid}
              onChange={e => setBid(Number(e.target.value))}
              className="flex-1 text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500/40"
            />
            <button onClick={placeBid} disabled={loading || bid < minBid || bid > myPoints}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
              Bieten
            </button>
          </div>
        )}

        {isExpired && (
          <p className="text-xs text-gray-600 text-center py-2">Auktion beendet — Seite neu laden für Ergebnis</p>
        )}

        {/* Gebot-Verlauf */}
        {auction.bids.length > 0 && (
          <div>
            <button onClick={() => setShowBids(b => !b)} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              {showBids ? "▲" : "▼"} {auction.bids.length} Gebote
            </button>
            {showBids && (
              <div className="mt-2 space-y-1">
                {auction.bids.map((b, i) => (
                  <div key={i} className="flex justify-between text-[10px] text-gray-500">
                    <span>{b.user.username ?? b.user.name}</span>
                    <span className="text-amber-400 font-medium">{b.amount.toLocaleString("de")} Pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

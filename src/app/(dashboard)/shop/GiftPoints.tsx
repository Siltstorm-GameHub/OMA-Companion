"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Send, Loader2, Gift, X } from "lucide-react";
import Image from "next/image";
import { GIFT_MIN, GIFT_MAX_SINGLE, GIFT_MONTHLY_LIMIT } from "@/lib/shop";

interface User { id: string; username: string | null; name: string | null; image: string | null; points: number }

interface Props {
  myPoints:      number;
  alreadyGifted: number; // bereits diesen Monat verschenkt
}

export default function GiftPoints({ myPoints, alreadyGifted }: Props) {
  const router = useRouter();
  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<User[]>([]);
  const [selected,  setSelected]  = useState<User | null>(null);
  const [amount,    setAmount]    = useState(100);
  const [loading,   setLoading]   = useState(false);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const remaining = GIFT_MONTHLY_LIMIT - alreadyGifted;

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } finally { setSearching(false); }
    }, 300);
  }, [query]);

  async function handleSend() {
    if (!selected || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shop/gift", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipientId: selected.id, amount }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`🎁 ${amount} Punkte an ${data.recipientName} geschickt!`);
      setOpen(false); setSelected(null); setQuery(""); setAmount(100);
      router.refresh();
    } catch { toast.error("Netzwerkfehler"); }
    finally  { setLoading(false); }
  }

  const canSend = selected && amount >= GIFT_MIN && amount <= Math.min(GIFT_MAX_SINGLE, remaining, myPoints);

  return (
    <div className="glass card-shine rounded-2xl border border-rose-500/10 overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/15 flex items-center justify-center shrink-0">
            <Gift className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Punkte verschenken</p>
            <p className="text-xs text-gray-500">
              Noch <span className="text-amber-400 font-medium">{remaining.toLocaleString("de-DE")}</span> Punkte diesen Monat verschenkbar
            </p>
          </div>
        </div>
        <span className={`text-xs text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="border-t border-white/[0.05] p-4 space-y-4">
          {remaining <= 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">
              Du hast dein monatliches Limit von {GIFT_MONTHLY_LIMIT} Punkten erreicht.
            </p>
          ) : (
            <>
              {/* Empfänger suchen */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Empfänger</label>
                {selected ? (
                  <div className="flex items-center gap-2 px-3 py-2 glass rounded-xl border border-emerald-500/20">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-white/[0.05]">
                      {selected.image
                        ? <Image src={selected.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">{(selected.username ?? selected.name ?? "?")[0].toUpperCase()}</div>}
                    </div>
                    <span className="text-sm text-white flex-1">{selected.username ?? selected.name}</span>
                    <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    <input
                      type="text" value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Username eingeben..."
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/30"
                    />
                    {/* Dropdown */}
                    {(results.length > 0 || searching) && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/[0.08] rounded-xl overflow-hidden shadow-xl z-20">
                        {searching && <p className="text-xs text-gray-600 px-3 py-2">Suche...</p>}
                        {results.map(u => (
                          <button key={u.id} onClick={() => { setSelected(u); setQuery(""); setResults([]); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.05] transition-colors text-left">
                            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-white/[0.05]">
                              {u.image
                                ? <Image src={u.image} alt="" width={28} height={28} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">{(u.username ?? u.name ?? "?")[0].toUpperCase()}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{u.username ?? u.name}</p>
                              <p className="text-[10px] text-gray-600">{u.points.toLocaleString("de-DE")} Punkte</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Betrag */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Betrag <span className="text-gray-600 normal-case">({GIFT_MIN}–{Math.min(GIFT_MAX_SINGLE, remaining)} Punkte)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={GIFT_MIN} max={Math.min(GIFT_MAX_SINGLE, remaining)} step={50}
                    value={amount} onChange={e => setAmount(Number(e.target.value))}
                    className="flex-1 accent-rose-500"
                  />
                  <span className="text-sm font-bold text-amber-400 w-14 text-right tabular-nums">
                    {amount.toLocaleString("de-DE")}
                  </span>
                </div>
                {/* Quick-Buttons */}
                <div className="flex gap-2 mt-2">
                  {[100, 250, 500].filter(v => v <= Math.min(GIFT_MAX_SINGLE, remaining)).map(v => (
                    <button key={v} onClick={() => setAmount(v)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${amount === v ? "bg-rose-500/15 border-rose-500/30 text-rose-300" : "glass border-white/[0.08] text-gray-500 hover:text-white"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Senden */}
              <button onClick={handleSend} disabled={!canSend || loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-medium text-sm bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {amount.toLocaleString("de-DE")} Punkte verschenken
              </button>

              <p className="text-[10px] text-gray-600 text-center">
                Monatliches Limit: {alreadyGifted.toLocaleString("de-DE")} / {GIFT_MONTHLY_LIMIT.toLocaleString("de-DE")} Punkte genutzt
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

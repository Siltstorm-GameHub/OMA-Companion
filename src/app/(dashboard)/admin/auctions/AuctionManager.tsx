"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Clock } from "lucide-react";

interface ShopItem { id: string; name: string; icon: string }
interface Auction {
  id: string; status: string; startPrice: number; currentBid: number;
  endsAt: Date | string;
  item: { name: string; icon: string };
  currentBidder: { username: string | null; name: string | null } | null;
}

const STATUS_STYLE: Record<string, string> = {
  active:    "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
  ended:     "text-gray-500 border-white/[0.08] bg-white/[0.04]",
  cancelled: "text-red-400 border-red-500/20 bg-red-500/10",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv", ended: "Beendet", cancelled: "Abgebrochen",
};

export default function AuctionManager({ items, auctions }: { items: ShopItem[]; auctions: Auction[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ itemId: items[0]?.id ?? "", startPrice: 500, minBidStep: 50, durationHours: 24 });

  async function createAuction() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auctions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success("✅ Auktion erstellt!");
      router.refresh();
    } catch { toast.error("Netzwerkfehler"); }
    finally  { setLoading(false); }
  }

  async function cancelAuction(id: string) {
    if (!confirm("Auktion abbrechen? Punkte werden zurückerstattet.")) return;
    setLoading(true);
    try {
      await fetch("/api/admin/auctions", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      toast.success("Auktion abgebrochen");
      router.refresh();
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Neue Auktion */}
      <div className="glass card-shine rounded-2xl border border-rose-500/15 p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-rose-400" /> Neue Auktion erstellen
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Item</label>
            <select value={form.itemId} onChange={e => setForm(f => ({ ...f, itemId: e.target.value }))}
              className="w-full text-sm bg-gray-900 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500/40">
              {items.map(i => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Startpreis (Pts)</label>
            <input type="number" min={1} value={form.startPrice} onChange={e => setForm(f => ({ ...f, startPrice: Number(e.target.value) }))}
              className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Mindest-Erhöhung</label>
            <input type="number" min={1} value={form.minBidStep} onChange={e => setForm(f => ({ ...f, minBidStep: Number(e.target.value) }))}
              className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500/40" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Laufzeit (Stunden)</label>
            <input type="number" min={1} max={168} value={form.durationHours} onChange={e => setForm(f => ({ ...f, durationHours: Number(e.target.value) }))}
              className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500/40" />
          </div>
        </div>
        <button onClick={createAuction} disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Auktion starten
        </button>
      </div>

      {/* Auktionen-Liste */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Alle Auktionen</h2>
        <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {auctions.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-8">Noch keine Auktionen erstellt.</p>
          )}
          {auctions.map(a => {
            const endsAt = new Date(a.endsAt);
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl">{a.item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{a.item.name}</p>
                  <p className="text-xs text-gray-500">
                    Start: {a.startPrice.toLocaleString("de")} Pts
                    {a.currentBid > 0 && ` · Höchstgebot: ${a.currentBid.toLocaleString("de")} Pts`}
                    {a.currentBidder && ` (${a.currentBidder.username ?? a.currentBidder.name})`}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0 hidden sm:flex">
                  <Clock className="w-3 h-3" />
                  {endsAt.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_STYLE[a.status] ?? ""}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
                {a.status === "active" && (
                  <button onClick={() => cancelAuction(a.id)} disabled={loading}
                    className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/[0.06] transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Star, Loader2, ChevronRight } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  points: number;
  rankPoints: number;
}

interface Props {
  userId: string;
  userName: string;
  userImage?: string | null;
}

function groupByMonth(txs: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const d = new Date(tx.createdAt);
    const key = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups);
}

export default function UserPointsHistoryModal({ userId, userName, userImage }: Props) {
  const [open, setOpen]                 = useState(false);
  const [loading, setLoading]           = useState(false);
  const [user, setUser]                 = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter]             = useState<"all" | "pos" | "neg">("all");

  const load = useCallback(async () => {
    if (loading || user) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/users/${userId}/transactions`);
      const data = await res.json();
      setUser(data.user);
      setTransactions(data.transactions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, loading, user]);

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const filtered = transactions.filter(tx =>
    filter === "all" ? true :
    filter === "pos" ? tx.amount > 0 :
    tx.amount < 0
  );

  const totalPos = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalNeg = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const grouped  = groupByMonth(filtered);

  const displayName = user?.username ?? user?.name ?? userName;
  const avatarSrc   = user?.image ?? userImage;

  return (
    <>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        title="Punkte-Verlauf anzeigen"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/15 transition-colors"
      >
        <Star className="w-3.5 h-3.5" />
        Verlauf
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-gray-950 border-l border-white/[0.06] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="w-9 h-9 rounded-full ring-1 ring-white/10 shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300 shrink-0">
              {(displayName ?? "?")[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-gray-500">Punkte-Verlauf</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        {user && (
          <div className="grid grid-cols-3 gap-px bg-white/[0.04] border-b border-white/[0.06] shrink-0">
            {[
              { label: "Gesamt",   value: user.points.toLocaleString("de-DE"),    color: "text-amber-400" },
              { label: "Verdient", value: `+${totalPos.toLocaleString("de-DE")}`, color: "text-emerald-400" },
              { label: "Ausgaben", value: totalNeg.toLocaleString("de-DE"),       color: "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-gray-950 px-4 py-3 text-center">
                <p className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 px-4 py-3 border-b border-white/[0.06] shrink-0">
          {(["all", "pos", "neg"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/20"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`}
            >
              {f === "all" ? `Alle (${transactions.length})` :
               f === "pos" ? `Gutschriften (${transactions.filter(t => t.amount > 0).length})` :
                             `Abzüge (${transactions.filter(t => t.amount < 0).length})`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40 gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Lade Transaktionen…</span>
            </div>
          )}

          {!loading && transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600">
              <Star className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">Keine Transaktionen vorhanden</p>
            </div>
          )}

          {!loading && grouped.map(([month, txs]) => (
            <div key={month}>
              {/* Month header */}
              <div className="flex items-center gap-3 px-4 py-2 sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{month}</span>
                <div className="flex-1 h-px bg-white/[0.04]" />
                <span className="text-[10px] text-gray-600 tabular-nums">
                  {txs.reduce((s, t) => s + t.amount, 0) > 0 ? "+" : ""}
                  {txs.reduce((s, t) => s + t.amount, 0).toLocaleString("de-DE")} Pts
                </span>
              </div>

              {/* Transactions */}
              <div className="divide-y divide-white/[0.03]">
                {txs.map(tx => {
                  const isPos = tx.amount > 0;
                  const d = new Date(tx.createdAt);
                  const dateStr = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
                  const timeStr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                        isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {isPos ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200 truncate">{tx.reason}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{dateStr} · {timeStr}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold tabular-nums ${
                        isPos
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/15"
                          : "bg-red-500/10 text-red-400 ring-1 ring-red-500/15"
                      }`}>
                        {isPos ? "+" : ""}{tx.amount.toLocaleString("de-DE")}
                        <span className="text-[10px] font-normal opacity-60">Pts</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        {!loading && transactions.length > 0 && (
          <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-[10px] text-gray-600 text-center">
              {transactions.length} Transaktionen insgesamt · max. 200 werden angezeigt
            </p>
          </div>
        )}
      </div>
    </>
  );
}

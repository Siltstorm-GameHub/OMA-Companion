"use client";

import { useState, useCallback, useEffect } from "react";
import { X, TrendingUp, TrendingDown, Star, Loader2, Settings2, Trash2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

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
  defaultOpen?: boolean;
  onClose?: () => void;
}

// Erkennt anhand des Grundes ob eine Transaktion Rang-Punkte (nicht Münzen) vergibt
const RANK_KEYWORDS = ["LUL Spieltag", "Turniersieg", "Turnierfinale", "Top-3-Platzierung", "Rang-Punkte"];
function isRankPointsTx(reason: string) {
  return RANK_KEYWORDS.some(kw => reason.includes(kw));
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

export default function UserPointsHistoryModal({ userId, userName, userImage, defaultOpen = false, onClose }: Props) {
  const [open, setOpen]                 = useState(defaultOpen);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [user, setUser]                 = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab]                   = useState<"history" | "edit">("history");
  const [filter, setFilter]             = useState<"all" | "pos" | "neg">("all");

  // Edit form state
  const [editCoins,      setEditCoins]      = useState("");
  const [editRank,       setEditRank]       = useState("");
  const [reasonCoins,    setReasonCoins]    = useState("");
  const [reasonRank,     setReasonRank]     = useState("");
  const [clearHistory,   setClearHistory]   = useState(false);
  const [confirmClear,   setConfirmClear]   = useState(false);

  const load = useCallback(async (force = false) => {
    if (loading) return;
    if (user && !force) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/users/${userId}/transactions`);
      const data = await res.json();
      setUser(data.user);
      setTransactions(data.transactions);
      setEditCoins(String(data.user.points));
      setEditRank(String(data.user.rankPoints));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId, loading, user]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const handleOpen = () => {
    setOpen(true);
    setTab("history");
    load();
  };

  // Auto-load when opened via defaultOpen
  useEffect(() => {
    if (defaultOpen) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const filtered = transactions.filter(tx =>
    filter === "all" ? true :
    filter === "pos" ? tx.amount > 0 :
    tx.amount < 0
  );

  const grouped = groupByMonth(filtered);
  const displayName = user?.username ?? user?.name ?? userName;
  const avatarSrc   = user?.image ?? userImage;

  async function handleSave() {
    const coinsNum = parseInt(editCoins);
    const rankNum  = parseInt(editRank);
    if (isNaN(coinsNum) || isNaN(rankNum) || coinsNum < 0 || rankNum < 0) {
      toast.error("Ungültige Werte – nur ganze Zahlen ≥ 0 erlaubt");
      return;
    }
    if (clearHistory && !confirmClear) {
      setConfirmClear(true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          coins:        coinsNum,
          rankPoints:   rankNum,
          clearHistory,
          reasonCoins:  reasonCoins.trim() || undefined,
          reasonRank:   reasonRank.trim()  || undefined,
        }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      toast.success(`✅ Werte für ${displayName} gespeichert`);
      setConfirmClear(false);
      setClearHistory(false);
      setReasonCoins("");
      setReasonRank("");
      await load(true);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Trigger — nur wenn nicht extern gesteuert */}
      {!defaultOpen && (
        <button
          onClick={handleOpen}
          title="Verlauf & Anpassen"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/15 transition-colors"
        >
          <Star className="w-3.5 h-3.5" />
          Verlauf
        </button>
      )}

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      )}

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-gray-950 border-l border-white/[0.06] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}>

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
            <p className="text-xs text-gray-500">Admin · Verlauf & Anpassung</p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        {user && (
          <div className="grid grid-cols-2 gap-px bg-white/[0.04] border-b border-white/[0.06] shrink-0">
            {[
              { label: "🪙 Münzen",      value: user.points.toLocaleString("de-DE"),     color: "text-amber-400" },
              { label: "🏆 Rang-Punkte", value: user.rankPoints.toLocaleString("de-DE"), color: "text-rose-400"  },
            ].map(s => (
              <div key={s.label} className="bg-gray-950 px-3 py-4 text-center">
                <p className={`text-xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2.5 border-b border-white/[0.06] shrink-0">
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "history"
                ? "bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Verlauf ({transactions.length})
          </button>
          <button
            onClick={() => setTab("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === "edit"
                ? "bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/20"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Anpassen
          </button>
        </div>

        {/* ── HISTORY TAB ─────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            {/* Filter */}
            <div className="flex gap-1 px-4 py-2 border-b border-white/[0.06] shrink-0">
              {(["all", "pos", "neg"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-white/[0.08] text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                  }`}
                >
                  {f === "all" ? `Alle (${transactions.length})` :
                   f === "pos" ? `Gutschriften (${transactions.filter(t => t.amount > 0).length})` :
                                 `Abzüge (${transactions.filter(t => t.amount < 0).length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center h-40 gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Lade…</span>
                </div>
              )}
              {!loading && transactions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                  <Star className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Keine Transaktionen</p>
                </div>
              )}
              {!loading && grouped.map(([month, txs]) => (
                <div key={month}>
                  <div className="flex items-center gap-3 px-4 py-2 sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{month}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                    <span className="text-[10px] text-gray-600 tabular-nums">
                      {txs.reduce((s, t) => s + t.amount, 0) > 0 ? "+" : ""}
                      {txs.reduce((s, t) => s + t.amount, 0).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {txs.map(tx => {
                      const isPos   = tx.amount > 0;
                      const isRank  = isRankPointsTx(tx.reason);
                      const d = new Date(tx.createdAt);

                      // Farben: Rang-Punkte = rose/amber, Münzen = emerald/red
                      const iconBg  = isRank
                        ? (isPos ? "bg-rose-500/10 text-rose-400"   : "bg-red-500/10 text-red-400")
                        : (isPos ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400");
                      const amtCls  = isRank
                        ? (isPos ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/15"     : "bg-red-500/10 text-red-400 ring-1 ring-red-500/15")
                        : (isPos ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/15"  : "bg-red-500/10 text-red-400 ring-1 ring-red-500/15");

                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                          {/* Typ-Icon */}
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-base leading-none ${iconBg}`}>
                            {isRank ? "🏆" : "🪙"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm text-gray-200 truncate">{tx.reason}</p>
                              {/* Typ-Badge */}
                              <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                                isRank
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>
                                {isRank ? "Punkte" : "Münzen"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              {" · "}
                              {d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>

                          {/* Betrag */}
                          <span className={`shrink-0 px-2 py-1 rounded-lg text-sm font-bold tabular-nums ${amtCls}`}>
                            {isPos ? "+" : ""}{tx.amount.toLocaleString("de-DE")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {!loading && transactions.length > 0 && (
              <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
                <p className="text-[10px] text-gray-600 text-center">
                  {transactions.length} Transaktionen · max. 200 angezeigt
                </p>
              </div>
            )}
          </>
        )}

        {/* ── EDIT TAB ────────────────────────────────────────────── */}
        {tab === "edit" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Münzen */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🪙</span>
                <p className="text-sm font-semibold text-white">Münzen (Shop-Währung)</p>
                {user && (
                  <span className="ml-auto text-xs text-gray-500 tabular-nums">Aktuell: {user.points.toLocaleString("de-DE")}</span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={editCoins}
                onChange={e => setEditCoins(e.target.value)}
                className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
                placeholder="Neuer Münzen-Stand"
              />
              <input
                type="text"
                value={reasonCoins}
                onChange={e => setReasonCoins(e.target.value)}
                className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/20"
                placeholder="Grund (optional) – z.B. LUL Season 1 Münzen"
              />
            </div>

            {/* Rang-Punkte */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🏆</span>
                <p className="text-sm font-semibold text-white">Rang-Punkte (Gesamtrangliste)</p>
                {user && (
                  <span className="ml-auto text-xs text-gray-500 tabular-nums">Aktuell: {user.rankPoints.toLocaleString("de-DE")}</span>
                )}
              </div>
              <input
                type="number"
                min="0"
                value={editRank}
                onChange={e => setEditRank(e.target.value)}
                className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/40"
                placeholder="Neuer Rang-Punkte-Stand"
              />
              <input
                type="text"
                value={reasonRank}
                onChange={e => setReasonRank(e.target.value)}
                className="w-full text-sm bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-rose-500/20"
                placeholder="Grund (optional) – z.B. LUL Season 1 Platz 3"
              />
            </div>

            {/* Verlauf löschen */}
            <div className="glass rounded-2xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={clearHistory}
                    onChange={e => { setClearHistory(e.target.checked); setConfirmClear(false); }}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border transition-colors ${clearHistory ? "bg-red-500 border-red-500" : "bg-white/[0.05] border-white/[0.15]"} flex items-center justify-center`}>
                    {clearHistory && <Trash2 className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Transaktionsverlauf löschen</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Alle bisherigen Transaktionen dieses Users werden gelöscht.
                    Die neuen Werte oben werden als Startbuchung angelegt.
                  </p>
                </div>
              </label>
            </div>

            {/* Confirmation warning */}
            {confirmClear && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-red-400 text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-red-300">
                  <strong>Nicht rückgängig machbar.</strong> Der komplette Verlauf wird gelöscht.
                  Nochmal auf „Speichern" klicken um zu bestätigen.
                </p>
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                confirmClear
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-rose-600 hover:bg-rose-500 text-white"
              }`}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Speichere…</>
              ) : confirmClear ? (
                <><Trash2 className="w-4 h-4" /> Ja, jetzt löschen & speichern</>
              ) : (
                <><Save className="w-4 h-4" /> Werte speichern</>
              )}
            </button>

            {/* Reset to current */}
            {user && (
              <button
                onClick={() => { setEditCoins(String(user.points)); setEditRank(String(user.rankPoints)); setClearHistory(false); setConfirmClear(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Auf aktuelle Werte zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

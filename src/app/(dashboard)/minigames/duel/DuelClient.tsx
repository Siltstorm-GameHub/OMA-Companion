"use client";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Swords, Search, Check, X, Trophy, Clock } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import CoinFlipModal from "./CoinFlipModal";

type UserLite = { id: string; username: string | null; name: string | null; image: string | null };

export type DuelEntry = {
  id: string;
  challengerId: string;
  opponentId: string;
  wager: number;
  status: string;
  winnerId: string | null;
  createdAt: string;
  respondedAt: string | null;
  resolvedAt: string | null;
  challenger?: UserLite;
  opponent?: UserLite;
};

const uname = (u?: UserLite) => u?.username ?? u?.name ?? "?";

function Avatar({ u, size = 24 }: { u?: UserLite; size?: number }) {
  if (u?.image) return <img src={u.image} alt="" className="rounded-full shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-white/[0.06] flex items-center justify-center text-gray-400 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {uname(u)[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function DuelClient({
  userId,
  config,
  initialIncoming,
  initialOutgoing,
  initialHistory,
  initialMonthHistory,
  monthTotal,
}: {
  userId: string;
  config: { min: number; max: number; dailyCap: number };
  initialIncoming: DuelEntry[];
  initialOutgoing: DuelEntry[];
  initialHistory: DuelEntry[];
  initialMonthHistory: DuelEntry[];
  monthTotal: number;
}) {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [history, setHistory] = useState(initialHistory);
  const [monthHistory, setMonthHistory] = useState(initialMonthHistory);
  const [monthSkip, setMonthSkip] = useState(initialMonthHistory.length);
  const [monthHasMore, setMonthHasMore] = useState(initialMonthHistory.length < monthTotal);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [selected, setSelected] = useState<UserLite | null>(null);
  const [wager, setWager] = useState(config.min);
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [duelResult, setDuelResult] = useState<{ challenger?: UserLite; opponent?: UserLite; winnerId: string; wager: number } | null>(null);

  const refreshLists = useCallback(async () => {
    try {
      const res = await fetch("/api/duels");
      if (!res.ok) return;
      const data = await res.json();
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
      setHistory(data.history);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults((await res.json()).filter((u: UserLite) => u.id !== userId));
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query, userId]);

  async function challenge() {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId: selected.id, wager }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success(`Herausforderung an ${uname(selected)} gesendet!`);
      setSelected(null);
      setQuery("");
      await refreshLists();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(duel: DuelEntry, action: "accept" | "decline") {
    if (respondingId) return;
    setRespondingId(duel.id);
    try {
      const res = await fetch(`/api/duels/${duel.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      if (action === "accept") {
        setDuelResult({ challenger: duel.challenger, opponent: duel.opponent, winnerId: data.winnerId, wager: duel.wager });
      } else {
        toast("Herausforderung abgelehnt");
      }
      await refreshLists();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setRespondingId(null);
    }
  }

  async function loadMoreMonth() {
    try {
      const res = await fetch(`/api/duels/history?skip=${monthSkip}`);
      if (!res.ok) return;
      const data = await res.json();
      setMonthHistory(prev => [...prev, ...data.duels]);
      setMonthSkip(prev => prev + data.duels.length);
      setMonthHasMore(data.hasMore);
    } catch { /* ignore */ }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
          <Swords className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">1v1 Münzen-Duell</h1>
          <p className="text-xs text-gray-500">Einsatz {config.min}–{config.max} Münzen · Tageslimit {config.dailyCap} Münzen</p>
        </div>
      </div>

      {/* ── Neues Duell ── */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Neues Duell</p>
        {selected ? (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-500/[0.06] border border-rose-500/15">
            <Avatar u={selected} />
            <span className="flex-1 text-sm text-white">{uname(selected)}</span>
            <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Nutzer suchen…"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500/50"
            />
            {results.length > 0 && (
              <div className="absolute z-10 mt-1 w-full glass-heavy rounded-xl overflow-hidden border border-white/10">
                {results.map(u => (
                  <button key={u.id} onClick={() => { setSelected(u); setResults([]); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] text-left">
                    <Avatar u={u} />
                    <span className="text-sm text-white">{uname(u)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="flex-1">
            <span className="text-xs text-gray-500">Einsatz</span>
            <input
              type="number"
              min={config.min}
              max={config.max}
              value={wager}
              onChange={e => setWager(Math.max(config.min, Math.min(config.max, parseInt(e.target.value, 10) || config.min)))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500/50"
            />
          </label>
          <div className="text-xs text-gray-500 pt-4 flex items-center gap-1">
            Gewinn: <span className="text-amber-400 font-semibold flex items-center gap-0.5">{wager * 2} <CoinIcon size={12} /></span>
          </div>
        </div>

        <button
          onClick={challenge}
          disabled={!selected || submitting}
          className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
        >
          {submitting ? "Sendet…" : "Herausfordern"}
        </button>
      </div>

      {/* ── Offene Herausforderungen ── */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Offene Herausforderungen</p>
          {incoming.map(d => (
            <div key={d.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <Avatar u={d.challenger} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{uname(d.challenger)} fordert dich heraus</p>
                <p className="text-xs text-amber-400 flex items-center gap-1">{d.wager} <CoinIcon size={11} /> Einsatz</p>
              </div>
              <button onClick={() => respond(d, "accept")} disabled={respondingId === d.id}
                className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-40">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => respond(d, "decline")} disabled={respondingId === d.id}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {outgoing.map(d => (
            <div key={d.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3 opacity-70">
              <Avatar u={d.opponent} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">Wartet auf Antwort von {uname(d.opponent)}</p>
                <p className="text-xs text-amber-400 flex items-center gap-1">{d.wager} <CoinIcon size={11} /> Einsatz</p>
              </div>
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
          ))}
        </div>
      )}

      {/* ── Meine Historie ── */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Meine Historie</p>
          <div className="glass rounded-2xl divide-y divide-white/5">
            {history.map(d => {
              const opponent = d.challengerId === userId ? d.opponent : d.challenger;
              const won = d.winnerId === userId;
              return (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Avatar u={opponent} size={20} />
                  <span className="flex-1 text-sm text-gray-300 truncate">vs. {uname(opponent)}</span>
                  <span className="text-xs text-gray-600">{d.wager} <CoinIcon size={10} /></span>
                  {d.status === "resolved" ? (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${won ? "text-emerald-400" : "text-gray-500"}`}>
                      {won && <Trophy className="w-3 h-3" />}{won ? "Gewonnen" : "Verloren"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 capitalize">{d.status === "declined" ? "Abgelehnt" : "Abgelaufen"}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Öffentliche Historie diesen Monat ── */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Historie diesen Monat (alle Mitglieder)</p>
        {monthHistory.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-gray-500 text-sm">Noch keine Duelle diesen Monat.</div>
        ) : (
          <div className="glass rounded-2xl divide-y divide-white/5">
            {monthHistory.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar u={d.challenger} size={20} />
                <span className={`text-xs ${d.winnerId === d.challengerId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>{uname(d.challenger)}</span>
                <span className="text-[10px] text-gray-600">vs.</span>
                <Avatar u={d.opponent} size={20} />
                <span className={`text-xs flex-1 ${d.winnerId === d.opponentId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>{uname(d.opponent)}</span>
                <span className="text-xs text-amber-500/80 flex items-center gap-0.5">{d.wager} <CoinIcon size={10} /></span>
              </div>
            ))}
          </div>
        )}
        {monthHasMore && (
          <button onClick={loadMoreMonth} className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Mehr laden
          </button>
        )}
      </div>
    </div>

    {duelResult && (
      <CoinFlipModal
        challenger={duelResult.challenger}
        opponent={duelResult.opponent}
        winnerId={duelResult.winnerId}
        wager={duelResult.wager}
        currentUserId={userId}
        onClose={() => setDuelResult(null)}
      />
    )}
    </>
  );
}

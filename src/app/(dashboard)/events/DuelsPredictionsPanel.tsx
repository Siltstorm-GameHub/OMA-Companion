"use client";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Check, X, Trophy, Clock, Eye, Target } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import CoinFlipModal from "@/components/CoinFlipModal";
import MyPredictionsList, { type MyPrediction } from "../minigames/MyPredictionsList";

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

export default function DuelsPredictionsPanel({
  userId,
  initialIncoming,
  initialOutgoing,
  initialHistory,
  initialMonthHistory,
  monthTotal,
  myPredictions,
}: {
  userId: string;
  initialIncoming: DuelEntry[];
  initialOutgoing: DuelEntry[];
  initialHistory: DuelEntry[];
  initialMonthHistory: DuelEntry[];
  monthTotal: number;
  myPredictions: MyPrediction[];
}) {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [history, setHistory] = useState(initialHistory);
  const [monthHistory, setMonthHistory] = useState(initialMonthHistory);
  const [monthSkip, setMonthSkip] = useState(initialMonthHistory.length);
  const [monthHasMore, setMonthHasMore] = useState(initialMonthHistory.length < monthTotal);

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

  const hasOpenChallenges = incoming.length > 0 || outgoing.length > 0;
  useEffect(() => {
    if (!hasOpenChallenges) return;
    const interval = setInterval(refreshLists, 8_000);
    return () => clearInterval(interval);
  }, [hasOpenChallenges, refreshLists]);

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
      {/* ── Offene Herausforderungen ── */}
      {hasOpenChallenges && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            Offene Herausforderungen
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/80 normal-case tracking-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Live
            </span>
          </p>
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
              const resolved = d.status === "resolved" && d.winnerId;
              const Row: "button" | "div" = resolved ? "button" : "div";
              return (
                <Row
                  key={d.id}
                  {...(resolved ? { onClick: () => setDuelResult({ challenger: d.challenger, opponent: d.opponent, winnerId: d.winnerId!, wager: d.wager }) } : {})}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${resolved ? "hover:bg-white/[0.04] transition-colors cursor-pointer" : ""}`}
                >
                  <Avatar u={opponent} size={20} />
                  <span className="flex-1 text-sm text-gray-300 truncate">vs. {uname(opponent)}</span>
                  <span className="text-xs text-gray-600">{d.wager} <CoinIcon size={10} /></span>
                  {resolved ? (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${won ? "text-emerald-400" : "text-gray-500"}`}>
                      {won && <Trophy className="w-3 h-3" />}{won ? "Gewonnen" : "Verloren"}
                      <Eye className="w-3 h-3 text-gray-600 ml-0.5" />
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600 capitalize">{d.status === "declined" ? "Abgelehnt" : "Abgelaufen"}</span>
                  )}
                </Row>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Öffentliche Historie diesen Monat (inkl. Replay) ── */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Historie diesen Monat (alle Mitglieder)</p>
        {monthHistory.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-gray-500 text-sm">Noch keine Duelle diesen Monat.</div>
        ) : (
          <div className="glass rounded-2xl divide-y divide-white/5">
            {monthHistory.map(d => (
              <button
                key={d.id}
                onClick={() => setDuelResult({ challenger: d.challenger, opponent: d.opponent, winnerId: d.winnerId!, wager: d.wager })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
              >
                <Avatar u={d.challenger} size={20} />
                <span className={`text-xs ${d.winnerId === d.challengerId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>{uname(d.challenger)}</span>
                <span className="text-[10px] text-gray-600">vs.</span>
                <Avatar u={d.opponent} size={20} />
                <span className={`text-xs flex-1 ${d.winnerId === d.opponentId ? "text-emerald-300 font-semibold" : "text-gray-400"}`}>{uname(d.opponent)}</span>
                <span className="text-xs text-amber-500/80 flex items-center gap-0.5">{d.wager} <CoinIcon size={10} /></span>
                <Eye className="w-3.5 h-3.5 text-gray-600" />
              </button>
            ))}
          </div>
        )}
        {monthHasMore && (
          <button onClick={loadMoreMonth} className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Mehr laden
          </button>
        )}
      </div>

      {/* ── Meine Event-Sieger-Vorhersagen ── */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Meine Event-Sieger-Vorhersagen
        </p>
        <MyPredictionsList initialPredictions={myPredictions} />
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

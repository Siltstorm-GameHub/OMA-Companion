"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, Trophy, Clock, Eye, Target, HelpCircle, ChevronDown, Swords } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import CoinFlipModal from "@/components/CoinFlipModal";
import PredictionStreakCard from "@/components/PredictionStreakCard";
import MyPredictionsList, { type MyPrediction } from "@/components/MyPredictionsList";

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
  predictionStreak,
  pendingPredictions,
}: {
  userId: string;
  initialIncoming: DuelEntry[];
  initialOutgoing: DuelEntry[];
  initialHistory: DuelEntry[];
  initialMonthHistory: DuelEntry[];
  monthTotal: number;
  myPredictions: MyPrediction[];
  predictionStreak: { current: number; best: number };
  pendingPredictions: number;
}) {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [outgoing, setOutgoing] = useState(initialOutgoing);
  const [history, setHistory] = useState(initialHistory);
  const [monthHistory, setMonthHistory] = useState(initialMonthHistory);
  const [monthSkip, setMonthSkip] = useState(initialMonthHistory.length);
  const [monthHasMore, setMonthHasMore] = useState(initialMonthHistory.length < monthTotal);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [duelResult, setDuelResult] = useState<{ challenger?: UserLite; opponent?: UserLite; winnerId: string; wager: number } | null>(null);
  const [predictionHelpOpen, setPredictionHelpOpen] = useState(false);

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
      {/* ── Kurzanleitung ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setPredictionHelpOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Wie geht das?
            <ChevronDown className={`w-3 h-3 transition-transform ${predictionHelpOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {predictionHelpOpen && (
          <div className="glass rounded-2xl p-4 text-xs text-gray-400 leading-relaxed space-y-4">
            <div className="space-y-1.5">
              <p className="text-gray-300 font-medium flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-violet-400" /> Event-Sieger-Vorhersage
              </p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Öffne die Seite eines bevorstehenden Events (Tab "Events" oder <Link href="/events" className="text-violet-400 hover:text-violet-300">Eventliste</Link>).</li>
                <li>Scrolle zum Bereich "Event-Gesamtsieger-Vorhersage" und wähle per Suche den Nutzer, der deiner Meinung nach das gesamte Event gewinnt.</li>
                <li>Lege einen Münzen-Einsatz fest und bestätige deinen Tipp.</li>
                <li>Bis der Event-Start erreicht ist, kannst du deine Vorhersage jederzeit ändern oder löschen — danach ist sie gesperrt.</li>
                <li>Liegst du nach Event-Ende richtig, bekommst du Münzen ausgezahlt und deine Serie wächst.</li>
              </ol>
            </div>

            <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
              <p className="text-gray-300 font-medium flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-rose-400" /> 1v1 Münzenduell
              </p>
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Öffne das Profil des Mitglieds, das du herausfordern möchtest (z.B. über die <Link href="/leaderboard" className="text-rose-400 hover:text-rose-300">Rangliste</Link>).</li>
                <li>Klicke dort auf "Zum Münzenduell herausfordern" und lege deinen Einsatz fest.</li>
                <li>Sende die Herausforderung ab — dein Einsatz wird sofort reserviert, bis der Gegner reagiert oder die Herausforderung abläuft.</li>
                <li>Nimmt der Gegner an, entscheidet ein Münzwurf über Sieg oder Niederlage — offene Herausforderungen und die Antwort dazu findest du hier in diesem Tab.</li>
                <li>Der Gewinner erhält beide Einsätze; Verlauf und Replay aller Duelle siehst du weiter unten.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

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

      {/* ── Event-Sieger-Vorhersagen ── */}
      <PredictionStreakCard
        current={predictionStreak.current}
        best={predictionStreak.best}
        pendingCount={pendingPredictions}
      />
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

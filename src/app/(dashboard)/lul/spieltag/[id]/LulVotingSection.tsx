"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Crown, CheckCircle2, Clock, Users } from "lucide-react";

type Candidate = {
  userId:    string;
  name:      string;
  image:     string | null;
  voteCount: number;
};

type Poll = {
  id:              string;
  statKey:         string;
  label:           string;
  question:        string;
  type:            "player" | "spectator";
  endsAt:          string;
  status:          "open" | "closed";
  winnerIds:       string[];
  candidates:      Candidate[];
  myVoteTargetId:  string | null;
  totalVotes:      number;
};

function useCountdown(endsAt: string) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Beendet"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  return remaining;
}

function PollCard({ poll, spieltagId, userId }: { poll: Poll; spieltagId: string; userId: string }) {
  const [myVote, setMyVote]     = useState(poll.myVoteTargetId);
  const [voting, setVoting]     = useState(false);
  const [counts, setCounts]     = useState<Record<string, number>>(
    Object.fromEntries(poll.candidates.map(c => [c.userId, c.voteCount]))
  );
  const [total, setTotal]       = useState(poll.totalVotes);
  const countdown               = useCountdown(poll.endsAt);
  const isClosed = poll.status === "closed" || new Date(poll.endsAt) <= new Date();

  async function handleVote(targetId: string) {
    if (voting || isClosed) return;
    if (myVote === targetId) return; // Stimme nicht ändern wenn gleich

    setVoting(true);
    try {
      const res = await fetch(`/api/lul/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        toast.error(err.error ?? "Fehler beim Abstimmen");
        return;
      }
      // Lokal aktualisieren
      setCounts(prev => {
        const next = { ...prev };
        if (myVote) next[myVote] = Math.max(0, (next[myVote] ?? 0) - 1);
        next[targetId] = (next[targetId] ?? 0) + 1;
        if (!myVote) setTotal(t => t + 1);
        return next;
      });
      setMyVote(targetId);
      toast.success("Stimme abgegeben!");
    } finally {
      setVoting(false);
    }
  }

  const maxVotes = Math.max(1, ...Object.values(counts));

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(12,12,20,0.95)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">{poll.label}</span>
            </div>
            <h3 className="text-base font-semibold text-white">{poll.question}</h3>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {isClosed ? (
              <span className="text-xs font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">Beendet</span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> {countdown}
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] text-gray-600">
              <Users className="w-3 h-3" /> {total} Stimme{total !== 1 ? "n" : ""}
            </span>
          </div>
        </div>
        {!isClosed && myVote && (
          <p className="text-xs text-teal-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Du hast abgestimmt — du kannst deine Stimme noch ändern.
          </p>
        )}
        {!isClosed && !myVote && (
          <p className="text-xs text-gray-500 mt-2">Wähle einen Kandidaten aus.</p>
        )}
      </div>

      {/* Kandidaten */}
      <div className="divide-y divide-white/[0.04]">
        {poll.candidates.map((candidate) => {
          const isWinner   = isClosed && poll.winnerIds.includes(candidate.userId);
          const isMyVote   = myVote === candidate.userId;
          const voteCount  = counts[candidate.userId] ?? 0;
          const pct        = total > 0 ? Math.round((voteCount / total) * 100) : 0;
          const barWidth   = maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0;
          const isMe       = candidate.userId === userId;

          return (
            <button
              key={candidate.userId}
              type="button"
              disabled={voting || isClosed || isMyVote}
              onClick={() => handleVote(candidate.userId)}
              className={`w-full text-left px-5 py-4 transition-all relative overflow-hidden ${
                isClosed
                  ? "cursor-default"
                  : isMyVote
                    ? "cursor-default bg-teal-500/[0.05]"
                    : "hover:bg-white/[0.03] cursor-pointer"
              } ${isWinner ? "bg-rose-500/[0.06]" : ""}`}
            >
              {/* Progress bar background */}
              {(isClosed || myVote) && (
                <div
                  className={`absolute inset-0 transition-all duration-700 ease-out ${isWinner ? "bg-rose-500/10" : isMyVote ? "bg-teal-500/10" : "bg-white/[0.02]"}`}
                  style={{ width: `${barWidth}%` }}
                />
              )}

              <div className="relative flex items-center gap-3">
                {/* Avatar */}
                {candidate.image ? (
                  <img src={candidate.image} alt="" className={`w-9 h-9 rounded-full shrink-0 ring-1 ${isMyVote ? "ring-teal-400/50" : isWinner ? "ring-rose-400/50" : "ring-white/10"}`} />
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold bg-white/[0.06] text-gray-400 ring-1 ring-white/5">
                    {candidate.name[0]?.toUpperCase()}
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight ${isWinner ? "text-rose-300" : isMyVote ? "text-teal-300" : "text-white"}`}>
                    {candidate.name}
                    {isMe && <span className="text-[10px] font-normal text-gray-500 ml-1.5">(du)</span>}
                  </p>
                  {(isClosed || myVote) && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{voteCount} Stimme{voteCount !== 1 ? "n" : ""} · {pct}%</p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isWinner && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full">
                      <Crown className="w-3 h-3" /> Gewinner
                    </span>
                  )}
                  {isMyVote && !isClosed && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Meine Stimme
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {poll.candidates.length === 0 && (
          <div className="px-5 py-6 text-center text-xs text-gray-600">
            Keine Kandidaten für diese Umfrage.
          </div>
        )}
      </div>
    </div>
  );
}

export default function LulVotingSection({
  spieltagId,
  userId,
  initialPolls,
}: {
  spieltagId:   string;
  userId:       string;
  initialPolls: Poll[];
}) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/lul/polls?spieltagId=${spieltagId}`);
    if (res.ok) setPolls(await res.json() as Poll[]);
  }, [spieltagId]);

  // Alle 30 Sekunden aktualisieren
  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  if (polls.length === 0) return null;

  return (
    <div className="space-y-4">
      {polls.map(poll => (
        <PollCard key={poll.id} poll={poll} spieltagId={spieltagId} userId={userId} />
      ))}
    </div>
  );
}

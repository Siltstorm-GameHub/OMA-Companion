"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Vote, Clock, Trophy, ChevronDown, ChevronUp, Check, UserX, RotateCcw } from "lucide-react";
import { usePollCountdown } from "@/components/PollCountdown";

type PollAnswer = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

type Poll = {
  id: string;
  label: string;
  question: string;
  voterEligibility: string;
  answerType: string;
  customAnswers: string[];
  startAt: string;
  endAt: string;
  rewardsPaid: boolean;
  winnerIds: string[] | null;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
  voteCounts: Record<string, number>;
  myVote: string | null;
  answerOptions: PollAnswer[] | null;
  excludedUserIds: string[];
};

type Registration = {
  userId: string;
  role: string;
  user: { id: string; name: string | null; username: string | null; image: string | null };
};

type Props = {
  eventId: string;
  userId: string | undefined;
  initialPolls: Poll[];
  eventRegistrations: Registration[];
  isAdmin?: boolean;
};

function CountdownBadge({ startAt }: { startAt: string }) {
  const t = usePollCountdown(startAt);
  return (
    <span className="text-xs text-gray-500 flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" /> Startet in {t}
    </span>
  );
}

function EndsCountdown({ endAt }: { endAt: string }) {
  const t = usePollCountdown(endAt);
  return <>endet in {t}</>;
}

function PollCard({
  poll,
  userId,
  eventId,
  onVoted,
  isAdmin = false,
  eventRegistrations,
  onExclusionChanged,
}: {
  poll: Poll;
  userId: string | undefined;
  eventId: string;
  onVoted: (pollId: string, targetId: string) => void;
  isAdmin?: boolean;
  eventRegistrations: Registration[];
  onExclusionChanged: () => void;
}) {
  const now = Date.now();
  const startAt = new Date(poll.startAt).getTime();
  const endAt   = new Date(poll.endAt).getTime();
  const isActive = now >= startAt && now <= endAt;
  const isPast   = now > endAt;
  const isUpcoming = now < startAt;

  const [voting, setVoting] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(isPast && !isActive);
  const [excluding, setExcluding] = useState<string | null>(null);

  const canManageCandidates = isAdmin && (poll.answerType === "players" || poll.answerType === "spectators");
  const excludedUsers = canManageCandidates
    ? eventRegistrations
        .filter(r => poll.excludedUserIds.includes(r.userId))
        .map(r => r.user)
    : [];

  async function setExcludedUserIds(next: string[]) {
    try {
      const res = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludedUserIds: next }),
      });
      if (res.ok) onExclusionChanged();
    } finally {
      setExcluding(null);
    }
  }

  function excludeCandidate(targetUserId: string) {
    setExcluding(targetUserId);
    void setExcludedUserIds([...poll.excludedUserIds, targetUserId]);
  }

  function reincludeCandidate(targetUserId: string) {
    setExcluding(targetUserId);
    void setExcludedUserIds(poll.excludedUserIds.filter(id => id !== targetUserId));
  }

  const totalVotes = Object.values(poll.voteCounts).reduce((a, b) => a + b, 0);

  const answers: { id: string; label: string; image?: string | null }[] =
    poll.answerType === "custom"
      ? poll.customAnswers.map(a => ({ id: a, label: a }))
      : (poll.answerOptions ?? []).map(u => ({
          id: u.id,
          label: u.name ?? u.username ?? u.id,
          image: u.image,
        }));

  async function castVote(targetId: string) {
    if (!userId || voting) return;
    setVoting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Fehler beim Abstimmen");
      } else {
        onVoted(poll.id, targetId);
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setVoting(false);
    }
  }

  const statusBadge = isActive
    ? <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />Läuft · <EndsCountdown endAt={poll.endAt} />
      </span>
    : isPast
    ? <span className="text-xs text-gray-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">Beendet</span>
    : <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="w-3 h-3" />Bald</span>;

  return (
    <div className="glass rounded-2xl overflow-hidden" style={{ border: isActive ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Vote className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-white truncate">{poll.label}</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs text-gray-600">{totalVotes} Stimmen</span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronUp className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-gray-300 font-medium">{poll.question}</p>

          {/* Upcoming countdown */}
          {isUpcoming && <CountdownBadge startAt={poll.startAt} />}

          {/* Reward hint */}
          {(poll.participationCoins > 0 || poll.participationSeriesPoints > 0 || poll.winnerCoins > 0 || poll.winnerRankPoints > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {(poll.participationCoins > 0 || poll.participationSeriesPoints > 0) && (
                <span className="text-gray-500 flex items-center gap-1">
                  Teilnahme:{" "}
                  {poll.participationCoins > 0 && (
                    <span className="text-amber-400 font-medium">{poll.participationCoins} Münzen</span>
                  )}
                  {poll.participationCoins > 0 && poll.participationSeriesPoints > 0 && " + "}
                  {poll.participationSeriesPoints > 0 && (
                    <span className="text-teal-400 font-medium">{poll.participationSeriesPoints} Reihenpunkte</span>
                  )}
                </span>
              )}
              {(poll.winnerCoins > 0 || poll.winnerRankPoints > 0) && (
                <span className="text-gray-500 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Gewinner:{" "}
                  {poll.winnerCoins > 0 && (
                    <span className="text-amber-400 font-medium">{poll.winnerCoins} Münzen</span>
                  )}
                  {poll.winnerCoins > 0 && poll.winnerRankPoints > 0 && " + "}
                  {poll.winnerRankPoints > 0 && (
                    <span className="text-purple-400 font-medium">{poll.winnerRankPoints} Rangpunkte</span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* My vote indicator */}
          {poll.myVote && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Du hast für „{answers.find(a => a.id === poll.myVote)?.label ?? poll.myVote}" gestimmt
            </p>
          )}

          {/* Answer options */}
          <div className="space-y-2">
            {answers.map(answer => {
              const count  = poll.voteCounts[answer.id] ?? 0;
              const pct    = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isWon  = poll.winnerIds?.includes(answer.id) ?? false;
              const isMine = poll.myVote === answer.id;
              const canVote = isActive && userId && !voting;

              return (
                <div
                  key={answer.id}
                  className={`w-full rounded-xl overflow-hidden relative transition-all ${
                    isMine ? "ring-1 ring-emerald-500/40" : ""
                  } ${isWon ? "ring-1 ring-amber-500/40" : ""}`}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {/* Progress bar */}
                  <div
                    className="absolute inset-0 transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: isMine
                        ? "rgba(16,185,129,0.12)"
                        : isWon
                        ? "rgba(251,191,36,0.10)"
                        : "rgba(255,255,255,0.03)",
                    }}
                  />
                  <button
                    type="button"
                    disabled={!canVote}
                    onClick={() => canVote && castVote(answer.id)}
                    className={`relative flex items-center justify-between gap-2 px-3 py-2 w-full text-left ${
                      canVote ? "hover:brightness-110 cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {answer.image && (
                        <Image
                          src={answer.image}
                          alt={answer.label}
                          width={20}
                          height={20}
                          className="rounded-full shrink-0"
                        />
                      )}
                      <span className={`text-sm font-medium truncate ${isMine ? "text-emerald-300" : isWon ? "text-amber-300" : "text-gray-300"}`}>
                        {answer.label}
                      </span>
                      {isWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {isMine && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-gray-500">{count}</span>
                      <span className="text-xs text-gray-600 w-8 text-right">{pct}%</span>
                    </div>
                  </button>
                  {canManageCandidates && (
                    <button
                      type="button"
                      title="Von der Wahl ausschließen"
                      disabled={excluding === answer.id}
                      onClick={() => excludeCandidate(answer.id)}
                      className="absolute right-1.5 top-1.5 p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-black/20 transition-colors disabled:opacity-40"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ausgeschlossene Kandidaten (nur Moderatoren) */}
          {canManageCandidates && excludedUsers.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest">Ausgeschlossen</p>
              {excludedUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 bg-black/10 border border-white/[0.04]">
                  <span className="text-xs text-gray-500 truncate">{u.username ?? u.name ?? u.id}</span>
                  <button
                    type="button"
                    title="Wieder zur Wahl zulassen"
                    disabled={excluding === u.id}
                    onClick={() => reincludeCandidate(u.id)}
                    className="flex items-center gap-1 text-[11px] text-teal-500 hover:text-teal-300 transition-colors disabled:opacity-40 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" /> Zulassen
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {voting && <p className="text-xs text-gray-500">Stimme wird abgegeben…</p>}
        </div>
      )}
    </div>
  );
}

export default function PollsSection({ eventId, userId, initialPolls, eventRegistrations, isAdmin = false }: Props) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/polls`);
      if (res.ok) setPolls(await res.json() as Poll[]);
    } catch { /* ignore */ }
  }, [eventId]);

  useEffect(() => {
    // Merge answerOptions from eventRegistrations for initial render when API data arrives later
    void eventRegistrations; // already handled server-side in initialPolls
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh, eventRegistrations]);

  function handleVoted(pollId: string, targetId: string) {
    setPolls(prev =>
      prev.map(p => {
        if (p.id !== pollId) return p;
        const newCounts = { ...p.voteCounts };
        // Remove old vote count
        if (p.myVote) newCounts[p.myVote] = Math.max(0, (newCounts[p.myVote] ?? 1) - 1);
        // Add new vote count
        newCounts[targetId] = (newCounts[targetId] ?? 0) + 1;
        return { ...p, myVote: targetId, voteCounts: newCounts };
      })
    );
  }

  const now = Date.now();
  const activePolls   = polls.filter(p => now >= new Date(p.startAt).getTime() && now <= new Date(p.endAt).getTime());
  const upcomingPolls = polls.filter(p => now < new Date(p.startAt).getTime());
  const pastPolls     = polls.filter(p => now > new Date(p.endAt).getTime());

  if (polls.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Vote className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-semibold text-white">Abstimmungen</h2>
        {activePolls.length > 0 && (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
            {activePolls.length} aktiv
          </span>
        )}
      </div>

      {activePolls.length > 0 && (
        <div className="space-y-2">
          {activePolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted}
              isAdmin={isAdmin} eventRegistrations={eventRegistrations} onExclusionChanged={refresh} />
          ))}
        </div>
      )}

      {upcomingPolls.length > 0 && (
        <div className="space-y-2">
          {upcomingPolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted}
              isAdmin={isAdmin} eventRegistrations={eventRegistrations} onExclusionChanged={refresh} />
          ))}
        </div>
      )}

      {pastPolls.length > 0 && (
        <div className="space-y-2">
          {pastPolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted}
              isAdmin={isAdmin} eventRegistrations={eventRegistrations} onExclusionChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

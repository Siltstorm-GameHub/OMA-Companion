"use client";
import { useState, useCallback } from "react";
import { ELIGIBILITY_TEXT, voterAllowed } from "@/lib/event-polls-shared";
import { useNow } from "@/lib/useNow";
import { usePolling } from "@/lib/usePolling";
import { ChevronDown, ChevronUp } from "@/components/icons";
import { Vote, Clock, Trophy, Check } from "@/components/icons";
import { usePollCountdown } from "@/components/PollCountdown";
import RankedAvatar from "@/components/RankedAvatar";

type PollAnswer = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  rankPoints: number;
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

type Props = {
  eventId: string;
  userId: string | undefined;
  initialPolls: Poll[];
  /** Eigene Anmeldung beim Event ("player" | "spectator" | null) — wer abstimmen darf, steht vor dem Klick fest */
  myRole?: string | null;
};

function CountdownBadge({ startAt }: { startAt: string }) {
  const t = usePollCountdown(startAt);
  return (
    <span className="text-xs text-subtle flex items-center gap-1">
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
  myRole,
}: {
  poll: Poll;
  userId: string | undefined;
  eventId: string;
  onVoted: (pollId: string, targetId: string) => void;
  myRole: string | null;
}) {
  // Nicht berechtigt: Knopf gesperrt und Hinweis — statt erst nach dem Klick eine Fehlermeldung
  const allowed = voterAllowed(poll.voterEligibility, myRole);
  const now = useNow();
  const startAt = new Date(poll.startAt).getTime();
  const endAt   = new Date(poll.endAt).getTime();
  const isActive = now >= startAt && now <= endAt;
  const isPast   = now > endAt;
  const isUpcoming = now < startAt;

  const [voting, setVoting] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(isPast && !isActive);

  const totalVotes = Object.values(poll.voteCounts).reduce((a, b) => a + b, 0);

  // rankPoints bleibt undefined bei freien Textantworten — daran hängt, ob ein Avatar gezeichnet wird.
  const answers: { id: string; label: string; image?: string | null; rankPoints?: number }[] =
    poll.answerType === "custom"
      ? poll.customAnswers.map(a => ({ id: a, label: a }))
      : (poll.answerOptions ?? []).map(u => ({
          id: u.id,
          label: u.username ?? u.name ?? u.id,
          image: u.image,
          rankPoints: u.rankPoints,
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
    ? <span className="text-xs text-subtle bg-line border border-line px-2 py-0.5 rounded-full">Beendet</span>
    : <span className="text-xs font-semibold text-muted bg-surface-3 px-2 py-0.5 rounded-full flex items-center gap-1"><Clock className="size-3" />Bald</span>;

  return (
    <div className={`rounded-card bg-surface shadow-card overflow-hidden border ${isActive ? "border-coin/30" : "border-line"}`}>
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors text-left"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Vote className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-sm font-semibold text-fg truncate">{poll.label}</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs text-subtle">{totalVotes} Stimmen</span>
          {collapsed ? <ChevronDown className="w-4 h-4 text-subtle" /> : <ChevronUp className="w-4 h-4 text-subtle" />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-fg/90 font-medium">{poll.question}</p>

          {/* Upcoming countdown */}
          {isUpcoming && <CountdownBadge startAt={poll.startAt} />}

          {/* Reward hint */}
          {(poll.participationCoins > 0 || poll.participationSeriesPoints > 0 || poll.winnerCoins > 0 || poll.winnerRankPoints > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {(poll.participationCoins > 0 || poll.participationSeriesPoints > 0) && (
                <span className="text-subtle flex items-center gap-1">
                  Teilnahme:{" "}
                  {poll.participationCoins > 0 && (
                    <span className="text-amber-400 font-medium">{poll.participationCoins} Münzen</span>
                  )}
                  {poll.participationCoins > 0 && poll.participationSeriesPoints > 0 && " + "}
                  {poll.participationSeriesPoints > 0 && (
                    <span className="text-primary font-medium">{poll.participationSeriesPoints} Tabellenpunkte</span>
                  )}
                </span>
              )}
              {(poll.winnerCoins > 0 || poll.winnerRankPoints > 0) && (
                <span className="text-subtle flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Gewinner:{" "}
                  {poll.winnerCoins > 0 && (
                    <span className="text-amber-400 font-medium">{poll.winnerCoins} Münzen</span>
                  )}
                  {poll.winnerCoins > 0 && poll.winnerRankPoints > 0 && " + "}
                  {poll.winnerRankPoints > 0 && (
                    <span className="text-primary-fg font-semibold">{poll.winnerRankPoints} Rang-Punkte</span>
                  )}
                </span>
              )}
            </div>
          )}

          {/* My vote indicator */}
          {poll.myVote && (
            <p className="text-xs text-success flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Du hast für „{answers.find(a => a.id === poll.myVote)?.label ?? poll.myVote}“ gestimmt
            </p>
          )}

          {isActive && userId && !allowed && (
            <p className="text-xs text-muted rounded-control border border-line bg-surface-2 px-3 py-2">
              {ELIGIBILITY_TEXT[poll.voterEligibility] ?? "Du darfst hier nicht abstimmen"}.
            </p>
          )}
          {poll.winnerIds && poll.winnerIds.length > 1 && (
            <p className="text-xs text-amber-200/90">Gleichstand: alle Gleichplatzierten gewinnen und bekommen die volle Sieger-Belohnung.</p>
          )}

          {/* Answer options */}
          <div className="space-y-2">
            {answers.map(answer => {
              const count  = poll.voteCounts[answer.id] ?? 0;
              const pct    = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const isWon  = poll.winnerIds?.includes(answer.id) ?? false;
              const isMine = poll.myVote === answer.id;
              const canVote = isActive && userId && allowed && !voting;

              return (
                <div
                  key={answer.id}
                  className={`w-full rounded-xl overflow-hidden relative transition-all ${
                    isMine ? "ring-1 ring-emerald-500/40" : ""
                  } ${isWon ? "ring-1 ring-amber-500/40" : ""}`}
                  style={{ background: "var(--color-surface-3)", border: "1px solid var(--color-line)" }}
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
                      {answer.rankPoints !== undefined && (
                        <RankedAvatar
                          userId={answer.id}
                          src={answer.image}
                          alt={answer.label}
                          size={20}
                          className="w-5 h-5"
                        />
                      )}
                      <span className={`text-sm font-medium truncate ${isMine ? "text-success" : isWon ? "text-amber-300" : "text-fg/90"}`}>
                        {answer.label}
                      </span>
                      {isWon && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {isMine && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-subtle">{count}</span>
                      <span className="text-xs text-subtle w-8 text-right">{pct}%</span>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {voting && <p className="text-xs text-subtle">Stimme wird abgegeben…</p>}
        </div>
      )}
    </div>
  );
}

export default function PollsSection({ eventId, userId, initialPolls, myRole = null }: Props) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/polls`);
      if (res.ok) setPolls(await res.json() as Poll[]);
    } catch { /* ignore */ }
  }, [eventId]);

  usePolling(refresh, 30_000, { immediate: false });

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

  const now = useNow();
  const activePolls   = polls.filter(p => now >= new Date(p.startAt).getTime() && now <= new Date(p.endAt).getTime());
  const upcomingPolls = polls.filter(p => now < new Date(p.startAt).getTime());
  const pastPolls     = polls.filter(p => now > new Date(p.endAt).getTime());

  if (polls.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Vote className="w-4 h-4 text-amber-400" />
        <h2 className="text-base font-extrabold text-fg">Abstimmung nach dem Event</h2>
        {activePolls.length > 0 && (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
            {activePolls.length} aktiv
          </span>
        )}
      </div>

      {activePolls.length > 0 && (
        <div className="space-y-2">
          {activePolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted} myRole={myRole} />
          ))}
        </div>
      )}

      {upcomingPolls.length > 0 && (
        <div className="space-y-2">
          {upcomingPolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted} myRole={myRole} />
          ))}
        </div>
      )}

      {pastPolls.length > 0 && (
        <div className="space-y-2">
          {pastPolls.map(p => (
            <PollCard key={p.id} poll={p} userId={userId} eventId={eventId} onVoted={handleVoted} myRole={myRole} />
          ))}
        </div>
      )}
    </div>
  );
}

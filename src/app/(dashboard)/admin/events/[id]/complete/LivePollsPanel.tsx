"use client";
import { useEffect, useState, useCallback } from "react";
import { Vote, Trophy, Clock, CheckCircle2 } from "lucide-react";

type User = { id: string; name: string | null; username: string | null; image: string | null };

type PublicPoll = {
  id: string;
  label: string;
  question: string;
  answerType: string;
  customAnswers: string[];
  startAt: string;
  endAt: string;
  winnerIds: string[] | null;
  voteCounts: Record<string, number>;
  answerOptions: { id: string; name: string | null; username: string | null; image: string | null }[] | null;
  excludedUserIds: string[];
};

type AdminPoll = {
  id: string;
  voterEligibility: string;
  votes: { voterId: string; targetId: string; isManual: boolean }[];
};

type Props = {
  eventId: string;
  isAdmin: boolean;
  registeredUsers: User[];
  spectatorUsers: User[];
};

function userName(u: User) { return u.username ?? u.name ?? "?"; }

function eligibleVoters(voterEligibility: string, registeredUsers: User[], spectatorUsers: User[]): User[] {
  if (voterEligibility === "players") return registeredUsers;
  if (voterEligibility === "spectators") return spectatorUsers;
  return [...registeredUsers, ...spectatorUsers]; // "all" | "participants"
}

function answerOptionsFor(poll: PublicPoll, registeredUsers: User[], spectatorUsers: User[]): { id: string; label: string }[] {
  const excluded = new Set(poll.excludedUserIds);
  if (poll.answerType === "custom") return poll.customAnswers.map(a => ({ id: a, label: a }));
  if (poll.answerType === "players") return registeredUsers.filter(u => !excluded.has(u.id)).map(u => ({ id: u.id, label: userName(u) }));
  if (poll.answerType === "spectators") return spectatorUsers.filter(u => !excluded.has(u.id)).map(u => ({ id: u.id, label: userName(u) }));
  return [];
}

export default function LivePollsPanel({ eventId, isAdmin, registeredUsers, spectatorUsers }: Props) {
  const [polls, setPolls] = useState<PublicPoll[] | null>(null);
  const [adminPolls, setAdminPolls] = useState<Record<string, AdminPoll>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const publicRes = await fetch(`/api/events/${eventId}/polls`);
    if (publicRes.ok) setPolls(await publicRes.json() as PublicPoll[]);
    if (isAdmin) {
      const adminRes = await fetch(`/api/admin/events/${eventId}/polls`);
      if (adminRes.ok) {
        const data = await adminRes.json() as AdminPoll[];
        setAdminPolls(Object.fromEntries(data.map(p => [p.id, p])));
      }
    }
  }, [eventId, isAdmin]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function submitVote(pollId: string, voterId: string, targetId: string) {
    if (!targetId) return;
    setSavingFor(`${pollId}:${voterId}`);
    try {
      const res = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualVoterId: voterId, manualTargetId: targetId }),
      });
      if (res.ok) await refresh();
    } finally {
      setSavingFor(null);
    }
  }

  if (polls === null) return null;
  if (polls.length === 0) return null;

  const now = Date.now();

  return (
    <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
      <div className="flex items-center gap-2">
        <Vote className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-xs font-semibold text-violet-300">Live-Umfragen</span>
        {!isAdmin && (
          <span className="text-[10px] text-gray-600 ml-auto">Nur lesend – Stimmen nachtragen erfordert Admin-Rechte</span>
        )}
      </div>

      <div className="space-y-4">
        {polls.map(poll => {
          const isOpen = now <= new Date(poll.endAt).getTime();
          const answers = answerOptionsFor(poll, registeredUsers, spectatorUsers);
          const totalVotes = Object.values(poll.voteCounts).reduce((a, b) => a + b, 0);
          const admin = adminPolls[poll.id];

          const voteByVoter = new Map<string, string>();
          if (admin) for (const v of admin.votes) voteByVoter.set(v.voterId, v.targetId);
          const manualVoters = new Set(admin?.votes.filter(v => v.isManual).map(v => v.voterId) ?? []);

          const voters = admin ? eligibleVoters(admin.voterEligibility, registeredUsers, spectatorUsers) : [];
          const sortedVoters = [...voters].sort((a, b) => {
            const aVoted = voteByVoter.has(a.id) ? 1 : 0;
            const bVoted = voteByVoter.has(b.id) ? 1 : 0;
            if (aVoted !== bVoted) return aVoted - bVoted; // nicht abgestimmt zuerst
            return userName(a).localeCompare(userName(b));
          });

          return (
            <div key={poll.id} className="rounded-lg border border-white/[0.06] bg-black/10 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{poll.label}</p>
                  <p className="text-xs text-gray-500 truncate">{poll.question}</p>
                </div>
                {isOpen ? (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Läuft noch
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full shrink-0">Beendet</span>
                )}
              </div>

              {/* Aggregierte Ergebnisse (für alle sichtbar) */}
              <div className="space-y-1.5">
                {answers.map(a => {
                  const count = poll.voteCounts[a.id] ?? 0;
                  const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isWinner = poll.winnerIds?.includes(a.id) ?? false;
                  return (
                    <div key={a.id} className="relative rounded-lg overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="absolute inset-0" style={{ width: `${pct}%`, background: isWinner ? "rgba(251,191,36,0.10)" : "rgba(255,255,255,0.03)" }} />
                      <div className="relative flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className={`text-xs truncate flex items-center gap-1 ${isWinner ? "text-amber-300 font-medium" : "text-gray-300"}`}>
                          {isWinner && <Trophy className="w-3 h-3 shrink-0" />}
                          {a.label}
                        </span>
                        <span className="text-[10px] text-gray-500 shrink-0">{count} · {pct}%</span>
                      </div>
                    </div>
                  );
                })}
                {answers.length === 0 && <p className="text-xs text-gray-600 italic">Keine Antwortoptionen.</p>}
              </div>

              {/* Admin: Stimmen nachtragen/ändern */}
              {isAdmin && admin && (
                <div className="pt-2 border-t border-white/[0.06] space-y-1">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Stimmen nachtragen / ändern</p>
                  {sortedVoters.map(voter => {
                    const currentTarget = voteByVoter.get(voter.id) ?? "";
                    const isSaving = savingFor === `${poll.id}:${voter.id}`;
                    return (
                      <div key={voter.id} className="flex items-center gap-2">
                        <span className="flex-1 text-xs text-gray-300 truncate">{userName(voter)}</span>
                        {currentTarget ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            {answers.find(a => a.id === currentTarget)?.label ?? currentTarget}
                            {manualVoters.has(voter.id) && <span className="text-gray-600">(manuell)</span>}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-600 shrink-0">keine Stimme</span>
                        )}
                        <select
                          value=""
                          disabled={isSaving}
                          onChange={e => submitVote(poll.id, voter.id, e.target.value)}
                          className="w-36 rounded-lg px-2 py-1 text-[11px] text-white bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors shrink-0 disabled:opacity-50"
                        >
                          <option value="">{currentTarget ? "Stimme ändern…" : "Stimme setzen…"}</option>
                          {answers.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                  {sortedVoters.length === 0 && <p className="text-xs text-gray-600 italic">Keine stimmberechtigten Personen.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

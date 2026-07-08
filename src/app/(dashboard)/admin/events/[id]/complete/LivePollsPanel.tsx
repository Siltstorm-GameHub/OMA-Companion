"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Vote, Trophy, Clock, CheckCircle2, Trash2 } from "lucide-react";

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
  /** Alle User der Plattform — nötig für Umfragen mit voterEligibility "all", bei denen auch
   * Nicht-Teilnehmer abstimmen dürfen. */
  allUsers: User[];
};

function userName(u: User) { return u.username ?? u.name ?? "?"; }

/** Wer darf laut voterEligibility der Umfrage überhaupt abstimmen? "all" ist NICHT auf
 * Event-Teilnehmer beschränkt — dort darf buchstäblich jeder App-User abstimmen. */
function eligibleVoters(voterEligibility: string, registeredUsers: User[], spectatorUsers: User[], allUsers: User[]): User[] {
  if (voterEligibility === "players") return registeredUsers;
  if (voterEligibility === "spectators") return spectatorUsers;
  if (voterEligibility === "participants") return [...registeredUsers, ...spectatorUsers];
  return allUsers; // "all"
}

function answerOptionsFor(poll: PublicPoll, registeredUsers: User[], spectatorUsers: User[]): { id: string; label: string }[] {
  const excluded = new Set(poll.excludedUserIds);
  if (poll.answerType === "custom") return poll.customAnswers.map(a => ({ id: a, label: a }));
  if (poll.answerType === "players") return registeredUsers.filter(u => !excluded.has(u.id)).map(u => ({ id: u.id, label: userName(u) }));
  if (poll.answerType === "spectators") return spectatorUsers.filter(u => !excluded.has(u.id)).map(u => ({ id: u.id, label: userName(u) }));
  return [];
}

function AddVoteForm({
  candidates, answers, saving, onSubmit,
}: {
  candidates: User[];
  answers: { id: string; label: string }[];
  saving: boolean;
  onSubmit: (voterId: string, targetId: string) => void;
}) {
  const [voterId, setVoterId] = useState("");
  const [targetId, setTargetId] = useState("");
  const sorted = [...candidates].sort((a, b) => userName(a).localeCompare(userName(b)));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={voterId}
        disabled={saving}
        onChange={e => setVoterId(e.target.value)}
        className="flex-1 min-w-[140px] rounded-lg px-2 py-1 text-[11px] text-white bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors disabled:opacity-50"
      >
        <option value="">Person wählen…</option>
        {sorted.map(u => <option key={u.id} value={u.id}>{userName(u)}</option>)}
      </select>
      <select
        value={targetId}
        disabled={saving}
        onChange={e => setTargetId(e.target.value)}
        className="flex-1 min-w-[120px] rounded-lg px-2 py-1 text-[11px] text-white bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors disabled:opacity-50"
      >
        <option value="">Stimme für…</option>
        {answers.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
      <button
        type="button"
        disabled={!voterId || !targetId || saving}
        onClick={() => { onSubmit(voterId, targetId); setVoterId(""); setTargetId(""); }}
        className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        Eintragen
      </button>
    </div>
  );
}

export default function LivePollsPanel({ eventId, isAdmin, registeredUsers, spectatorUsers, allUsers }: Props) {
  const [polls, setPolls] = useState<PublicPoll[] | null>(null);
  const [adminPolls, setAdminPolls] = useState<Record<string, AdminPoll>>({});
  const [savingFor, setSavingFor] = useState<string | null>(null);

  const userById = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

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
      if (res.ok) {
        await refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Eintragen der Stimme");
      }
    } catch {
      toast.error("Netzwerkfehler beim Eintragen der Stimme");
    } finally {
      setSavingFor(null);
    }
  }

  async function removeVote(pollId: string, voterId: string) {
    setSavingFor(`${pollId}:${voterId}`);
    try {
      const res = await fetch(`/api/admin/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeVoterId: voterId }),
      });
      if (res.ok) {
        await refresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Fehler beim Entfernen der Stimme");
      }
    } catch {
      toast.error("Netzwerkfehler beim Entfernen der Stimme");
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

          // Bereits abgestimmt (Name wird über allUsers aufgelöst — bei voterEligibility "all"
          // können auch Nicht-Teilnehmer des Events abgestimmt haben)
          const votedRows = admin
            ? [...admin.votes]
                .map(v => ({ vote: v, user: userById.get(v.voterId) ?? { id: v.voterId, name: v.voterId, username: null, image: null } }))
                .sort((a, b) => userName(a.user).localeCompare(userName(b.user)))
            : [];

          // Wer ist laut voterEligibility grundsätzlich stimmberechtigt, hat aber noch nicht abgestimmt?
          const notYetVoted = admin
            ? eligibleVoters(admin.voterEligibility, registeredUsers, spectatorUsers, allUsers).filter(u => !voteByVoter.has(u.id))
            : [];

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

              {/* Admin: Stimmen einsehen/ändern + neue Stimmen (auch für Nicht-Teilnehmer bei "all") nachtragen */}
              {isAdmin && admin && (
                <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Bereits abgestimmt ({votedRows.length})</p>
                    {votedRows.map(({ vote, user }) => {
                      const isSaving = savingFor === `${poll.id}:${vote.voterId}`;
                      return (
                        <div key={vote.voterId} className="flex items-center gap-2">
                          <span className="flex-1 text-xs text-gray-300 truncate">{userName(user)}</span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            {answers.find(a => a.id === vote.targetId)?.label ?? vote.targetId}
                            {vote.isManual && <span className="text-gray-600">(manuell)</span>}
                          </span>
                          <select
                            value=""
                            disabled={isSaving}
                            onChange={e => submitVote(poll.id, vote.voterId, e.target.value)}
                            className="w-32 rounded-lg px-2 py-1 text-[11px] text-white bg-gray-800 border border-gray-700 focus:border-violet-500/50 outline-none transition-colors shrink-0 disabled:opacity-50"
                          >
                            <option value="">Ändern…</option>
                            {answers.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                          <button
                            type="button"
                            title="Stimme entfernen"
                            disabled={isSaving}
                            onClick={() => removeVote(poll.id, vote.voterId)}
                            className="p-1 rounded-md text-gray-600 hover:text-red-400 hover:bg-black/20 transition-colors disabled:opacity-40 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {votedRows.length === 0 && <p className="text-xs text-gray-600 italic">Noch keine Stimmen.</p>}
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">
                      Stimme nachtragen (z.B. für wer nicht über die App abgestimmt hat)
                    </p>
                    <AddVoteForm
                      candidates={notYetVoted}
                      answers={answers}
                      saving={savingFor?.startsWith(`${poll.id}:`) ?? false}
                      onSubmit={(voterId, targetId) => submitVote(poll.id, voterId, targetId)}
                    />
                    {notYetVoted.length === 0 && (
                      <p className="text-[10px] text-gray-600 italic">Alle stimmberechtigten Personen haben bereits abgestimmt.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

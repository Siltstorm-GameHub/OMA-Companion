"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "@/components/icons";
import { Check, Loader2, Pencil, X } from "@/components/icons";
import TwitchClipEmbed from "@/components/TwitchClipEmbed";
import RankedAvatar from "@/components/RankedAvatar";
import { clipCredit } from "@/lib/clip-display";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type Nomination = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  originalTitle?: string | null;
  customTitle?: string | null;
  submittedBy: { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
  voteCount: number;
};

interface Props {
  contestId: string;
  nominations: Nomination[];
  initialVoteId: string | null;
  isLoggedIn: boolean;
  embedParent: string;
  voteEndpoint?: string;
  isModerator?: boolean;
}

export default function ClipVotingClient({ contestId, nominations, initialVoteId, isLoggedIn, embedParent, voteEndpoint = "/api/clip-contest/vote", isModerator = false }: Props) {
  const [votedId, setVotedId] = useState<string | null>(initialVoteId);
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(nominations.map((n) => [n.id, n.voteCount]))
  );
  const [voting, setVoting] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [excluding, setExcluding] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [titles, setTitles] = useState<Record<string, string | null>>(
    Object.fromEntries(nominations.map((n) => [n.id, n.clipTitle]))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  function startRename(nom: Nomination) {
    setEditingId(nom.id);
    setDraft(nom.customTitle ?? titles[nom.id] ?? nom.originalTitle ?? "");
  }

  async function saveTitle(nom: Nomination) {
    setSavingTitle(true);
    const res = await fetch(`/api/admin/clip-contest/nomination/${nom.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customTitle: draft }),
    });
    setSavingTitle(false);
    if (res.ok) {
      const data = await res.json();
      setTitles((t) => ({ ...t, [nom.id]: data.customTitle ?? nom.originalTitle ?? nom.clipTitle }));
      setEditingId(null);
      toast.success(data.customTitle ? "Titel gespeichert" : "Titel zurückgesetzt");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Fehler beim Umbenennen");
    }
  }

  async function excludeNomination(nominationId: string) {
    if (!(await confirm({ title: "Clip ausschließen", description: "Diesen Clip aus der Abstimmung ausschließen? Bereits abgegebene Stimmen für diesen Clip gehen dabei verloren.", variant: "danger" }))) return;
    setExcluding(nominationId);
    const res = await fetch(`/api/admin/clip-contest/nomination/${nominationId}`, { method: "DELETE" });
    setExcluding(null);
    if (res.ok) {
      setExcludedIds((prev) => new Set(prev).add(nominationId));
      toast.success("Clip ausgeschlossen");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Fehler beim Ausschließen");
    }
  }

  async function vote(nominationId: string) {
    if (!isLoggedIn) { toast.error("Bitte einloggen um abzustimmen"); return; }
    if (voting) return;
    setVoting(true);
    const prev = votedId;
    // optimistic
    setVotedId(nominationId);
    setCounts((c) => {
      const next = { ...c };
      if (prev) next[prev] = Math.max(0, (next[prev] ?? 1) - 1);
      next[nominationId] = (next[nominationId] ?? 0) + 1;
      return next;
    });
    const res = await fetch(voteEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contestId, nominationId }),
    });
    setVoting(false);
    if (!res.ok) {
      setVotedId(prev);
      setCounts((c) => {
        const next = { ...c };
        next[nominationId] = Math.max(0, (next[nominationId] ?? 1) - 1);
        if (prev) next[prev] = (next[prev] ?? 0) + 1;
        return next;
      });
      toast.error("Abstimmung fehlgeschlagen");
    } else {
      toast.success("Stimme abgegeben!");
    }
  }

  const hasVoted = !!votedId;
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
  const visibleNominations = nominations.filter((n) => !excludedIds.has(n.id));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {visibleNominations.map((nom) => {
        const isMyVote = votedId === nom.id;
        const credit = clipCredit(nom);
        const pct = hasVoted && totalVotes > 0 ? Math.round((counts[nom.id] ?? 0) / totalVotes * 100) : null;

        return (
          <div
            key={nom.id}
            className={`glass rounded-2xl overflow-hidden border transition-all ${
              isMyVote
                ? "border-[#9146ff]/50 bg-[#9146ff]/5"
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}
          >
            <TwitchClipEmbed
              clipUrl={nom.clipUrl}
              thumbnailUrl={nom.thumbnailUrl}
              title={titles[nom.id] ?? "Clip"}
              parent={embedParent}
              overlay={
                <>
                  {isMyVote && (
                    <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#9146ff] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {/* Vote bar overlay (only after voting) */}
                  {hasVoted && pct !== null && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div
                        className={`h-full transition-all duration-500 ${isMyVote ? "bg-[#9146ff]" : "bg-white/30"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </>
              }
            />

            <div className="p-3 space-y-2">
              {editingId === nom.id ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveTitle(nom); if (e.key === "Escape") setEditingId(null); }}
                      maxLength={100}
                      autoFocus
                      placeholder="Titel für die Community (leer = Original)"
                      className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.12] rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-[#9146ff]/60"
                    />
                    <button onClick={() => saveTitle(nom)} disabled={savingTitle} title="Speichern"
                      className="w-7 h-7 rounded-lg bg-[#9146ff]/20 text-purple-300 hover:bg-[#9146ff]/30 flex items-center justify-center disabled:opacity-50 shrink-0">
                      {savingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)} title="Abbrechen"
                      className="w-7 h-7 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {nom.originalTitle && <p className="text-[11px] text-gray-600 truncate">Original: {nom.originalTitle}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug line-clamp-1 min-w-0">
                    {titles[nom.id] ?? "Clip"}
                  </p>
                  {isModerator && (
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <button onClick={() => startRename(nom)} title="Clip für die Community umbenennen"
                        className="text-gray-500 hover:text-[#9146ff]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => excludeNomination(nom.id)} disabled={excluding === nom.id}
                        title="Clip aus Abstimmung ausschließen"
                        className="text-gray-500 hover:text-red-400 disabled:opacity-50">
                        {excluding === nom.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0 flex-wrap">
                  {nom.submittedBy && (
                    <RankedAvatar
                      userId={nom.submittedBy.id}
                      src={nom.submittedBy.image}
                      alt={nom.submittedBy.username ?? nom.submittedBy.name ?? "?"}
                      size={16}
                    />
                  )}
                  <span className="truncate">Kanal: <span className="text-[#9146ff]">{credit.channel}</span></span>
                  {credit.creator && (
                    <span className="text-amber-300 truncate">· Clip von {credit.creator}</span>
                  )}
                </div>
                {hasVoted && <span className="text-xs text-gray-500 shrink-0">{pct}%</span>}
              </div>

              <button
                onClick={() => vote(nom.id)}
                disabled={voting}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isMyVote
                    ? "bg-[#9146ff]/20 border border-[#9146ff]/40 text-purple-300"
                    : "bg-white/[0.05] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-white"
                } disabled:opacity-50`}
              >
                {isMyVote ? <><Check className="w-3 h-3" /> Meine Stimme</> : "Abstimmen"}
              </button>
            </div>
          </div>
        );
      })}
      {ConfirmDialogElement}
    </div>
  );
}

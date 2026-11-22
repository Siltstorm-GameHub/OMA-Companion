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

  const myTitle = votedId ? (titles[votedId] ?? "Clip") : null;

  return (
    <div className="space-y-4">
      {/* Status: hast du schon abgestimmt? */}
      <div className={`rounded-xl border px-3.5 py-2.5 text-sm ${
        !isLoggedIn ? "border-line bg-surface-2 text-gray-400"
          : hasVoted ? "border-[#9146ff]/30 bg-[#9146ff]/[0.07] text-purple-200"
            : "border-violet-400/40 bg-violet-500/10 text-violet-100"
      }`}>
        {!isLoggedIn
          ? "Melde dich an, um abzustimmen."
          : hasVoted
            ? <><Check className="inline w-4 h-4 -mt-0.5 mr-1" />Deine Stimme: <span className="font-semibold">{myTitle}</span> · du kannst sie bis zum Ende noch ändern.</>
            : <>Du hast noch nicht abgestimmt. Wähl deinen Favoriten, die Ergebnisse siehst du danach.</>}
      </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleNominations.map((nom) => {
        const isMyVote = votedId === nom.id;
        const credit = clipCredit(nom);
        const pct = hasVoted && totalVotes > 0 ? Math.round((counts[nom.id] ?? 0) / totalVotes * 100) : null;

        return (
          <div
            key={nom.id}
            className={`rounded-card overflow-hidden border bg-surface transition-colors ${
              isMyVote
                ? "border-primary ring-1 ring-primary/40"
                : "border-line hover:border-line-strong"
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
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-ink">
                      <Check className="w-3.5 h-3.5" /> Deine Stimme
                    </div>
                  )}
                  {/* Vote bar overlay (only after voting) */}
                  {hasVoted && pct !== null && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-line">
                      <div
                        className={`h-full transition-all duration-500 ${isMyVote ? "bg-primary" : "bg-fg/40"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </>
              }
            />

            <div className="p-4 space-y-2.5">
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
                      className="flex-1 min-w-0 bg-surface-2 border border-line rounded-control px-2 py-1 text-sm text-fg outline-none focus:border-[#9146ff]/60"
                    />
                    <button onClick={() => saveTitle(nom)} disabled={savingTitle} title="Speichern"
                      className="w-7 h-7 rounded-lg bg-[#9146ff]/20 text-purple-300 hover:bg-[#9146ff]/30 flex items-center justify-center disabled:opacity-50 shrink-0">
                      {savingTitle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditingId(null)} title="Abbrechen"
                      className="w-7 h-7 rounded-lg bg-line text-gray-400 hover:text-white flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {nom.originalTitle && <p className="text-xs text-gray-600 truncate">Original: {nom.originalTitle}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-base font-bold text-fg leading-snug line-clamp-2 min-w-0">
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
                {hasVoted && <span className="text-sm font-bold tabular-nums text-fg shrink-0">{pct} %</span>}
              </div>

              <button
                onClick={() => vote(nom.id)}
                disabled={voting}
                className={`w-full flex min-h-10 items-center justify-center gap-1.5 rounded-control text-sm font-bold transition-colors ${
                  isMyVote
                    ? "bg-primary-soft border border-primary/40 text-primary-fg"
                    : hasVoted
                      ? "bg-surface-2 border border-line-strong text-fg hover:bg-surface-3"
                      : "bg-primary text-primary-ink hover:bg-primary-hover"
                } disabled:opacity-50`}
              >
                {isMyVote ? <><Check className="w-4 h-4" /> Meine Stimme</> : hasVoted ? "Stimme ändern" : "Für diesen Clip stimmen"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
      {ConfirmDialogElement}
    </div>
  );
}

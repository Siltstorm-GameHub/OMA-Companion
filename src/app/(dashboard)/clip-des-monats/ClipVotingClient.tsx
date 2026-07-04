"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import Image from "next/image";
import TwitchClipEmbed from "@/components/TwitchClipEmbed";
import { clipCredit } from "@/lib/clip-display";

type Nomination = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  submittedBy: { id: string; name: string | null; username: string | null; image: string | null } | null;
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
}

export default function ClipVotingClient({ contestId, nominations, initialVoteId, isLoggedIn, embedParent }: Props) {
  const [votedId, setVotedId] = useState<string | null>(initialVoteId);
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(nominations.map((n) => [n.id, n.voteCount]))
  );
  const [voting, setVoting] = useState(false);

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
    const res = await fetch("/api/clip-contest/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nominationId }),
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {nominations.map((nom) => {
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
              title={nom.clipTitle ?? "Clip"}
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
              <p className="text-sm font-semibold text-white leading-snug line-clamp-1">
                {nom.clipTitle ?? "Clip"}
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0 flex-wrap">
                  {nom.submittedBy?.image && (
                    <Image src={nom.submittedBy.image} alt="" width={16} height={16} className="rounded-full shrink-0" />
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
    </div>
  );
}

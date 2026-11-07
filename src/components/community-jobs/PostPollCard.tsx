"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Vote, Coins, Check, Loader2 } from "@/components/icons";
import { formatBerlinDateTime } from "@/lib/time";
import type { PollView } from "@/lib/post-poll";

/**
 * Umfrage in einem Beitrag: vor der Stimme Antwort-Knöpfe, danach (oder wenn beendet / eigene Umfrage) die
 * Verteilung. Nach der Auflösung wird die richtige Antwort markiert.
 */
export default function PostPollCard({ poll: initial, isAuthor, canVote }: { poll: PollView; isAuthor: boolean; canVote: boolean }) {
  const [poll, setPoll] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const closed = poll.resolved || (poll.closesAt != null && new Date(poll.closesAt).getTime() <= Date.now());
  const showResults = !!poll.myOptionId || closed || isAuthor || !canVote;

  async function vote(optionId: string) {
    setBusy(optionId);
    try {
      const res = await fetch(`/api/community-jobs/polls/${poll.id}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; coins?: number; notice?: string };
      if (!res.ok) throw new Error(data.error ?? "Abstimmen fehlgeschlagen");
      setPoll(p => ({
        ...p, myOptionId: optionId, totalVotes: p.totalVotes + 1,
        options: p.options.map(o => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o)),
      }));
      if (data.coins) toast.success(`Abgestimmt · +${data.coins} Münzen`);
      else toast.success("Abgestimmt");
      if (data.notice) toast.info(data.notice);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Abstimmen fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  const kindLabel = poll.kind === "quiz" ? "Quiz" : poll.kind === "event_winner" ? "Wer gewinnt?" : "Umfrage";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white flex items-start gap-1.5"><Vote className="w-4 h-4 mt-0.5 text-teal-300 shrink-0" />{poll.question}</p>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 shrink-0">{kindLabel}</span>
      </div>
      {(poll.participationReward > 0 || poll.correctReward > 0) && (
        <p className="text-[11px] text-amber-300/90 inline-flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" />
          {[poll.participationReward > 0 ? `${poll.participationReward} fürs Mitmachen` : "", poll.correctReward > 0 ? `${poll.correctReward} fürs Richtigliegen` : ""].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="space-y-1.5">
        {poll.options.map(o => {
          const pct = poll.totalVotes > 0 ? Math.round((o.votes / poll.totalVotes) * 100) : 0;
          const mine = poll.myOptionId === o.id;
          const correct = poll.resolved && poll.correctOptionId === o.id;
          if (!showResults) {
            return (
              <button key={o.id} type="button" disabled={busy !== null} onClick={() => vote(o.id)}
                className="w-full text-left text-xs rounded-lg border border-white/10 px-3 py-2 text-gray-200 hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors disabled:opacity-60 inline-flex items-center gap-2">
                {busy === o.id && <Loader2 className="w-3 h-3 animate-spin" />}{o.label}
              </button>
            );
          }
          return (
            <div key={o.id} className={`relative overflow-hidden rounded-lg border px-3 py-2 text-xs ${correct ? "border-emerald-500/50" : mine ? "border-teal-500/40" : "border-white/10"}`}>
              <div className={`absolute inset-y-0 left-0 ${correct ? "bg-emerald-500/20" : mine ? "bg-teal-500/15" : "bg-white/[0.05]"}`} style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-gray-200 inline-flex items-center gap-1.5">
                  {correct && <Check className="w-3.5 h-3.5 text-emerald-400" />}{o.label}{mine && <span className="text-[10px] text-teal-300">(deine Stimme)</span>}
                </span>
                <span className="text-gray-400 tabular-nums">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-500">
        {poll.totalVotes} {poll.totalVotes === 1 ? "Stimme" : "Stimmen"}
        {poll.resolved
          ? poll.kind !== "opinion" ? (poll.correctOptionId ? " · aufgelöst" : " · aufgelöst, ohne Gewinner") : " · beendet"
          : closed ? poll.kind === "event_winner" ? " · Abstimmung beendet, Auflösung nach dem Event" : " · beendet, wird gleich aufgelöst"
            : poll.closesAt ? ` · bis ${formatBerlinDateTime(poll.closesAt, { dateStyle: "short", timeStyle: "short" })}` : ""}
        {isAuthor && !closed && " · deine Umfrage"}
      </p>
    </div>
  );
}

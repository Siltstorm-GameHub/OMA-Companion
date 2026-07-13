"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Vote as VoteIcon, X, ExternalLink, Loader2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";

type PollOption = { id: string; label: string; gameName: string | null; steamAppId: number | null };

type Poll = {
  id: string;
  title: string;
  question: string;
  endDate: string;
  allowMultiple: boolean;
  allowFreeText: boolean;
  rewardCoins: number;
  ended: boolean;
  options: PollOption[];
  hasVoted: boolean;
  myOptionIds: string[];
  myFreeText: string | null;
  results: { optionCounts: Record<string, number>; totalVotes: number; freeTextAnswers: string[] } | null;
};

function coverUrl(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

function PollCard({ poll, onVoted, onDismiss }: { poll: Poll; onVoted: (p: Poll) => void; onDismiss: () => void }) {
  const [selected, setSelected] = useState<string[]>(poll.myOptionIds);
  const [freeText, setFreeText] = useState(poll.myFreeText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const dismissed = poll.ended; // nur nach Ablauf wegklickbar

  function toggle(id: string) {
    if (poll.hasVoted) return;
    setSelected(prev => {
      if (poll.allowMultiple) {
        return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  }

  async function submit() {
    if (selected.length === 0 && !freeText.trim()) {
      toast.error("Bitte wähle eine Antwort oder gib Text ein");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/daily-poll/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: selected, freeText: freeText.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler beim Abstimmen");
      const data = await res.json() as { rewardCoins: number };
      toast.success(data.rewardCoins > 0 ? `Danke fürs Mitmachen! +${data.rewardCoins} Coins` : "Danke fürs Mitmachen!");
      // Ergebnisse nachladen
      const fresh = await fetch("/api/daily-poll/active").then(r => r.json()) as Poll[];
      const updated = fresh.find(p => p.id === poll.id);
      if (updated) onVoted(updated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const showResults = poll.results !== null;
  const total = poll.results?.totalVotes ?? 0;

  return (
    <div className="mx-4 sm:mx-6 mt-4 px-4 py-3.5 rounded-xl max-w-7xl lg:mx-auto"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(139,92,246,0.06) 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
        boxShadow: "0 0 20px rgba(168,85,247,0.06)",
      }}>
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <VoteIcon className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-purple-400/70 mb-0.5">
            {poll.ended ? "Umfrage beendet" : "Umfrage"}
          </p>
          <p className="text-sm font-semibold text-white leading-snug">{poll.title}</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{poll.question}</p>
          {poll.rewardCoins > 0 && !poll.hasVoted && !poll.ended && (
            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <CoinIcon size={11} /> +{poll.rewardCoins} Coins fürs Abstimmen
            </p>
          )}

          {/* Optionen */}
          <div className="mt-3 space-y-1.5">
            {poll.options.map(o => {
              const count = poll.results?.optionCounts[o.id] ?? 0;
              const pct   = showResults && total > 0 ? Math.round((count / total) * 100) : 0;
              const mine  = selected.includes(o.id);

              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={poll.hasVoted || poll.ended}
                  onClick={() => toggle(o.id)}
                  className="w-full text-left rounded-lg overflow-hidden relative transition-colors disabled:cursor-default"
                  style={{
                    border: mine ? "1px solid rgba(168,85,247,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: mine ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  {showResults && (
                    <div className="absolute inset-y-0 left-0 bg-purple-500/15 transition-all" style={{ width: `${pct}%` }} />
                  )}
                  <div className="relative flex items-center gap-2.5 px-3 py-2">
                    {o.steamAppId && (
                      <img src={coverUrl(o.steamAppId)} alt="" className="w-12 h-7 rounded object-cover shrink-0" />
                    )}
                    <span className="text-xs text-white/90 flex-1 min-w-0 truncate">{o.label}</span>
                    {o.steamAppId && (
                      <a href={`https://store.steampowered.com/app/${o.steamAppId}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-gray-500 hover:text-purple-300 transition-colors shrink-0" title="Zur Steam-Seite">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {showResults && (
                      <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{pct}% ({count})</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Freitext */}
          {poll.allowFreeText && !poll.hasVoted && !poll.ended && (
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Eigene Antwort …"
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
          )}

          {/* Freitext-Antworten (nach Abstimmung/Ende sichtbar) */}
          {showResults && poll.results!.freeTextAnswers.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {poll.results!.freeTextAnswers.map((t, i) => (
                <p key={i} className="text-[11px] text-gray-400 bg-white/[0.03] rounded-md px-2 py-1">{t}</p>
              ))}
            </div>
          )}

          {/* Abstimmen-Button */}
          {!poll.hasVoted && !poll.ended && (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors"
            >
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <VoteIcon className="w-3 h-3" />}
              Abstimmen
            </button>
          )}
        </div>

        {dismissed && (
          <button onClick={onDismiss}
            className="shrink-0 self-start p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
            aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function DailyPollBanner() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/daily-poll/active")
      .then(r => r.json())
      .then((data: Poll[]) => {
        setPolls(data);
        setDismissedIds(new Set(data.filter(p => localStorage.getItem(`daily-poll-dismissed-${p.id}`)).map(p => p.id)));
      })
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    localStorage.setItem(`daily-poll-dismissed-${id}`, "1");
    setDismissedIds(prev => new Set(prev).add(id));
  }

  function updatePoll(updated: Poll) {
    setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  const visible = polls.filter(p => !dismissedIds.has(p.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map(p => (
        <PollCard key={p.id} poll={p} onVoted={updatePoll} onDismiss={() => dismiss(p.id)} />
      ))}
    </>
  );
}

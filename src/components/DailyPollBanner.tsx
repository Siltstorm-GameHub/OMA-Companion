"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Vote as VoteIcon, X, ExternalLink, Loader2, Undo2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import PollGameSuggestInput from "@/components/PollGameSuggestInput";
import { NewContentPing } from "@/components/NewContentPing";

type PollOption = { id: string; label: string; gameName: string | null; steamAppId: number | null };
type GameSuggestion = { name: string; appId: number | null };
type GameSuggestionCount = GameSuggestion & { count: number };

type Poll = {
  id: string;
  title: string;
  question: string;
  endDate: string;
  allowMultiple: boolean;
  allowFreeText: boolean;
  freeTextGameMode: boolean;
  rewardCoins: number;
  ended: boolean;
  options: PollOption[];
  hasVoted: boolean;
  myOptionIds: string[];
  myFreeText: string | null;
  myFreeTextGames: GameSuggestion[];
  results: { optionCounts: Record<string, number>; totalVotes: number; freeTextAnswers: string[]; gameSuggestions: GameSuggestionCount[] } | null;
};

function coverUrl(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

async function refetchPoll(id: string): Promise<Poll | null> {
  const fresh = await fetch("/api/daily-poll/active").then(r => r.json()) as Poll[];
  return fresh.find(p => p.id === id) ?? null;
}

function PollCard({ poll, onVoted, onDismiss }: { poll: Poll; onVoted: (p: Poll) => void; onDismiss: () => void }) {
  const [selected, setSelected]         = useState<string[]>(poll.myOptionIds);
  const [freeText, setFreeText]         = useState(poll.myFreeText ?? "");
  const [freeTextGames, setFreeTextGames] = useState<GameSuggestion[]>(poll.myFreeTextGames);
  // Noch nicht per Klick/Enter hinzugefügter Spielsuche-Text — wird beim Abstimmen automatisch übernommen,
  // damit auch unbekannte Titel ohne Steam-Treffer nicht verloren gehen.
  const [gameDraft, setGameDraft]       = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [resetting, setResetting]       = useState(false);
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
    // Nicht explizit hinzugefügter Spielsuche-Text zählt auch als gültige Antwort — z.B. wenn
    // zum eingetippten Namen kein Steam-Treffer gefunden wurde.
    const draft = gameDraft.trim();
    const finalGames = poll.freeTextGameMode && draft && !freeTextGames.some(g => g.name.toLowerCase() === draft.toLowerCase())
      ? [...freeTextGames, { name: draft, appId: null }]
      : freeTextGames;

    const hasAnswer = selected.length > 0 || freeText.trim() || finalGames.length > 0;
    if (!hasAnswer) {
      toast.error("Bitte wähle eine Antwort oder gib etwas ein");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/daily-poll/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionIds: selected,
          freeText: poll.freeTextGameMode ? undefined : (freeText.trim() || undefined),
          freeTextGames: poll.freeTextGameMode ? finalGames : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler beim Abstimmen");
      const data = await res.json() as { rewardCoins: number };
      toast.success(data.rewardCoins > 0 ? `Danke fürs Mitmachen! +${data.rewardCoins} Coins` : "Danke fürs Mitmachen!");
      const updated = await refetchPoll(poll.id);
      if (updated) onVoted(updated);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetVote() {
    setResetting(true);
    try {
      const res = await fetch(`/api/daily-poll/${poll.id}/vote`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler beim Zurückziehen");
      const data = await res.json() as { coinsDeducted: number };
      toast.success(data.coinsDeducted > 0 ? `Stimme zurückgezogen, -${data.coinsDeducted} Coins` : "Stimme zurückgezogen");
      const updated = await refetchPoll(poll.id);
      if (updated) {
        setSelected(updated.myOptionIds);
        setFreeText(updated.myFreeText ?? "");
        setFreeTextGames(updated.myFreeTextGames);
        setGameDraft("");
        onVoted(updated);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetting(false);
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
          <NewContentPing id={poll.hasVoted || poll.ended ? null : poll.id} storageKey="daily-poll-ping-seen">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <VoteIcon className="w-4 h-4 text-purple-400" />
            </div>
          </NewContentPing>
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
          {poll.options.length > 0 && (
            <div className="mt-3 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {poll.options.map(o => {
                const count = poll.results?.optionCounts[o.id] ?? 0;
                const pct   = showResults && total > 0 ? Math.round((count / total) * 100) : 0;
                const mine  = selected.includes(o.id);

                return (
                  <div
                    key={o.id}
                    role="button"
                    tabIndex={poll.hasVoted || poll.ended ? -1 : 0}
                    onClick={() => toggle(o.id)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(o.id); } }}
                    aria-disabled={poll.hasVoted || poll.ended}
                    className={`group text-left rounded-xl overflow-hidden relative transition-all ${poll.hasVoted || poll.ended ? "cursor-default" : "cursor-pointer hover:-translate-y-0.5"}`}
                    style={{
                      border: mine ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
                      background: mine ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)",
                      boxShadow: mine ? "0 0 0 1px rgba(168,85,247,0.25), 0 4px 16px rgba(168,85,247,0.15)" : undefined,
                    }}
                  >
                    {o.steamAppId ? (
                      <div className="relative w-full aspect-video">
                        <img src={coverUrl(o.steamAppId)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        {/* Auswahl-Overlay */}
                        {mine && (
                          <div className="absolute inset-0 bg-purple-500/15 ring-2 ring-inset ring-purple-400/60" />
                        )}
                        {/* Ergebnis-Balken */}
                        {showResults && (
                          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                            <div className="h-full bg-purple-400 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        )}
                        {/* Steam-Link Hover-Effekt direkt im Cover */}
                        <a
                          href={`https://store.steampowered.com/app/${o.steamAppId}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          title="Zur Steam-Seite"
                          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/60 transition-all duration-200"
                        >
                          <ExternalLink className="w-5 h-5 text-white drop-shadow scale-90 group-hover:scale-100 transition-transform duration-200" />
                          <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wide drop-shadow">Zur Steam-Seite</span>
                        </a>
                        {/* Kleines Steam-Icon-Badge, immer sichtbar */}
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center bg-black/50 pointer-events-none">
                          <ExternalLink className="w-2.5 h-2.5 text-white/80" />
                        </div>
                        {showResults && (
                          <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold text-white bg-black/60 rounded px-1.5 py-0.5 tabular-nums">
                            {pct}%
                          </span>
                        )}
                      </div>
                    ) : (
                      mine && <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-purple-400" />
                    )}
                    <div className="px-2.5 py-2">
                      <p className="text-xs text-white/90 leading-snug line-clamp-2">{o.label}</p>
                      {showResults && (
                        <p className="text-[10px] text-gray-500 tabular-nums mt-0.5">{pct}% · {count} Stimme{count === 1 ? "" : "n"}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Freitext (Plain) */}
          {poll.allowFreeText && !poll.freeTextGameMode && !poll.hasVoted && !poll.ended && (
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Eigene Antwort …"
              className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
            />
          )}

          {/* Freitext als Spielsuche (mehrere Vorschläge) */}
          {poll.allowFreeText && poll.freeTextGameMode && !poll.hasVoted && !poll.ended && (
            <div className="mt-2">
              <PollGameSuggestInput value={freeTextGames} onChange={setFreeTextGames} onDraftChange={setGameDraft} />
              <p className="text-[10px] text-gray-600 mt-1">
                Kein Treffer? Kein Problem — dein eingetippter Titel wird beim Abstimmen trotzdem übernommen.
              </p>
            </div>
          )}

          {/* Freitext-Antworten (nach Abstimmung/Ende sichtbar) */}
          {showResults && poll.results!.freeTextAnswers.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {poll.results!.freeTextAnswers.map((t, i) => (
                <p key={i} className="text-[11px] text-gray-400 bg-white/[0.03] rounded-md px-2 py-1">{t}</p>
              ))}
            </div>
          )}

          {/* Spielevorschläge (aggregiert, nach Abstimmung/Ende sichtbar) */}
          {showResults && poll.results!.gameSuggestions.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {poll.results!.gameSuggestions.map((g, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  {g.appId && (
                    <img src={coverUrl(g.appId)} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                  )}
                  <span className="text-[11px] text-white/85 flex-1 min-w-0 truncate">{g.name}</span>
                  {g.appId && (
                    <a href={`https://store.steampowered.com/app/${g.appId}`} target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-purple-300 transition-colors shrink-0" title="Zur Steam-Seite">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <span className="text-[11px] text-gray-500 tabular-nums shrink-0">{g.count}x</span>
                </div>
              ))}
            </div>
          )}

          {/* Abstimmen / Zurückziehen */}
          {!poll.ended && (
            poll.hasVoted ? (
              <button
                type="button"
                onClick={resetVote}
                disabled={resetting}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-gray-300 transition-colors"
              >
                {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                Stimme zurückziehen
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <VoteIcon className="w-3 h-3" />}
                Abstimmen
              </button>
            )
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

"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Vote as VoteIcon, X, ExternalLink, Loader2, Undo2, Check, ChevronRight } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import PollGameSuggestInput from "@/components/PollGameSuggestInput";
import { NewContentPing } from "@/components/NewContentPing";
import type { DailyPollView as Poll, PollGameSuggestion as GameSuggestion } from "@/lib/daily-poll";

/** So viele Freitext-Antworten / Spielvorschläge stehen sofort da, der Rest per "Alle anzeigen". */
const FREE_TEXT_PREVIEW = 3;
const GAME_SUGGESTION_PREVIEW = 5;

function coverUrl(appId: number) {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

function steamUrl(appId: number) {
  return `https://store.steampowered.com/app/${appId}`;
}

/** Ergebnisbalken + Zahlen unter einer Antwort */
function ResultLine({ pct, count, leading, mine }: { pct: number; count: number; leading: boolean; mine: boolean }) {
  return (
    <div className="mt-1.5">
      <div className="h-1 rounded-full bg-line overflow-hidden">
        <div className={`h-full rounded-full transition-all ${leading ? "bg-amber-400" : "bg-purple-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 tabular-nums">
        <span className={leading ? "text-amber-300 font-semibold" : ""}>{pct}%</span>
        <span>· {count} Stimme{count === 1 ? "" : "n"}</span>
        {leading && <span className="text-amber-300/90">· vorne</span>}
        {mine && <span className="text-purple-300">· deine Wahl</span>}
      </p>
    </div>
  );
}

/** Lange Listen (Freitext, Spielvorschläge) kürzen, aber per Klick komplett aufklappbar */
function ShowAllToggle({ total, shown, open, onToggle }: { total: number; shown: number; open: boolean; onToggle: () => void }) {
  if (total <= shown) return null;
  return (
    <button type="button" onClick={onToggle} className="text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors">
      {open ? "Weniger anzeigen" : `Alle ${total} anzeigen`}
    </button>
  );
}

function PollCard({ poll, onVoted, onDismiss, loggedIn, showEventLink }: {
  poll: Poll;
  onVoted: (p: Poll) => void;
  onDismiss: () => void;
  loggedIn: boolean;
  showEventLink: boolean;
}) {
  const pathname = usePathname();
  const [selected, setSelected]         = useState<string[]>(poll.myOptionIds);
  const [freeText, setFreeText]         = useState(poll.myFreeText ?? "");
  const [freeTextGames, setFreeTextGames] = useState<GameSuggestion[]>(poll.myFreeTextGames);
  // Noch nicht per Klick/Enter hinzugefügter Spielsuche-Text — wird beim Abstimmen automatisch übernommen,
  // damit auch unbekannte Titel ohne Steam-Treffer nicht verloren gehen.
  const [gameDraft, setGameDraft]       = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [resetting, setResetting]       = useState(false);
  const [allFreeText, setAllFreeText]   = useState(false);
  const [allGames, setAllGames]         = useState(false);

  const canVote = loggedIn && !poll.hasVoted && !poll.ended;

  function toggle(id: string) {
    if (!canVote) return;
    setSelected(prev => {
      if (poll.allowMultiple) {
        return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  }

  function applyServerPoll(updated: Poll | null | undefined) {
    if (!updated) return;
    setSelected(updated.myOptionIds);
    setFreeText(updated.myFreeText ?? "");
    setFreeTextGames(updated.myFreeTextGames);
    setGameDraft("");
    onVoted(updated);
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
      const data = await res.json() as { rewardCoins: number; poll: Poll | null };
      toast.success(data.rewardCoins > 0 ? `Danke fürs Mitmachen! +${data.rewardCoins} Coins` : "Danke fürs Mitmachen!");
      applyServerPoll(data.poll);
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
      const data = await res.json() as { coinsDeducted: number; poll: Poll | null };
      toast.success(data.coinsDeducted > 0 ? `Stimme zurückgezogen, -${data.coinsDeducted} Coins` : "Stimme zurückgezogen");
      applyServerPoll(data.poll);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResetting(false);
    }
  }

  const showResults = poll.results !== null;
  const total = poll.results?.totalVotes ?? 0;
  const counts = poll.results?.optionCounts ?? {};
  const maxCount = Math.max(0, ...Object.values(counts));
  // Umfragen ohne einziges Spielcover als Liste — Kacheln wären dort leer und unterschiedlich hoch
  const withCovers = poll.options.some(o => o.steamAppId);

  const freeTextAnswers = poll.results?.freeTextAnswers ?? [];
  const gameSuggestions = poll.results?.gameSuggestions ?? [];

  function optionState(id: string) {
    const count = counts[id] ?? 0;
    return {
      count,
      pct: showResults && total > 0 ? Math.round((count / total) * 100) : 0,
      leading: showResults && maxCount > 0 && count === maxCount,
      mine: selected.includes(id),
    };
  }

  function optionProps(id: string, mine: boolean) {
    return {
      role: "button" as const,
      tabIndex: canVote ? 0 : -1,
      "aria-pressed": mine,
      "aria-disabled": !canVote,
      onClick: () => toggle(id),
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } },
    };
  }

  const optionBorder = (mine: boolean) => ({
    border: mine ? "1px solid rgba(168,85,247,0.6)" : "1px solid rgba(255,255,255,0.08)",
    background: mine ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.03)",
    boxShadow: mine ? "0 0 0 1px rgba(168,85,247,0.25), 0 4px 16px rgba(168,85,247,0.15)" : undefined,
  });

  return (
    <div className="px-4 py-3.5 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(139,92,246,0.06) 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
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
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-purple-400/70 mb-0.5">
            {poll.ended ? "Umfrage beendet" : "Umfrage"}
          </p>
          <p className="text-sm font-semibold text-white leading-snug">{poll.title}</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{poll.question}</p>

          {/* Hinweise: Auswahlmodus, Belohnung, Event */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {canVote && poll.options.length > 0 && (
              <span className="text-gray-500">
                {poll.allowMultiple ? "Mehrfachauswahl möglich" : "Eine Antwort wählen"}
              </span>
            )}
            {poll.rewardCoins > 0 && !poll.hasVoted && !poll.ended && (
              <span className="text-amber-400 flex items-center gap-1">
                <CoinIcon size={11} /> +{poll.rewardCoins} Coins fürs Abstimmen
              </span>
            )}
            {showEventLink && poll.event && (
              <Link href={`/tournament/${poll.event.id}`}
                className="inline-flex items-center gap-0.5 text-primary-fg hover:text-teal-200 transition-colors min-w-0">
                <span className="truncate">Zum Event: {poll.event.title}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
              </Link>
            )}
          </div>

          {/* Optionen mit Spielcovern: Kacheln */}
          {poll.options.length > 0 && withCovers && (
            <div className="mt-3 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
              {poll.options.map(o => {
                const { count, pct, leading, mine } = optionState(o.id);
                return (
                  <div key={o.id} {...optionProps(o.id, mine)}
                    className={`text-left rounded-xl overflow-hidden relative transition-all ${canVote ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default"}`}
                    style={optionBorder(mine)}>
                    {o.steamAppId && (
                      <div className="relative w-full aspect-video">
                        <img src={coverUrl(o.steamAppId)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        {mine && <div className="absolute inset-0 bg-purple-500/15 ring-2 ring-inset ring-purple-400/60" />}
                        {mine && (
                          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                        {/* Nur dieses Icon führt zu Steam — ein Tipp aufs Cover wählt die Antwort aus */}
                        <a href={steamUrl(o.steamAppId)} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}
                          title="Zur Steam-Seite" aria-label={`${o.label} auf Steam ansehen`}
                          className="absolute top-1 right-1 w-7 h-7 rounded-md flex items-center justify-center bg-black/55 hover:bg-black/80 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5 text-white/85" />
                        </a>
                      </div>
                    )}
                    <div className="px-2.5 py-2">
                      <p className="text-xs text-white/90 leading-snug whitespace-normal [overflow-wrap:anywhere]">{o.label}</p>
                      {showResults && <ResultLine pct={pct} count={count} leading={leading} mine={mine} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reine Textoptionen: Liste mit Auswahlpunkt und Balken */}
          {poll.options.length > 0 && !withCovers && (
            <div className="mt-3 space-y-1.5">
              {poll.options.map(o => {
                const { count, pct, leading, mine } = optionState(o.id);
                return (
                  <div key={o.id} {...optionProps(o.id, mine)}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors ${canVote ? "cursor-pointer hover:bg-line" : "cursor-default"}`}
                    style={optionBorder(mine)}>
                    <span className={`mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center border ${poll.allowMultiple ? "rounded" : "rounded-full"} ${mine ? "bg-purple-500 border-purple-400" : "border-white/25"}`}>
                      {mine && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/90 leading-snug [overflow-wrap:anywhere]">{o.label}</p>
                      {showResults && <ResultLine pct={pct} count={count} leading={leading} mine={mine} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Freitext (Plain) */}
          {poll.allowFreeText && !poll.freeTextGameMode && canVote && (
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Eigene Antwort …"
              className="w-full mt-2 bg-surface-2 border border-line rounded-control px-3 py-1.5 text-xs text-fg placeholder:text-subtle focus:outline-none focus:border-primary transition-colors resize-none"
            />
          )}

          {/* Freitext als Spielsuche (mehrere Vorschläge) */}
          {poll.allowFreeText && poll.freeTextGameMode && canVote && (
            <div className="mt-2">
              <PollGameSuggestInput value={freeTextGames} onChange={setFreeTextGames} onDraftChange={setGameDraft} />
              <p className="text-xs text-gray-600 mt-1">
                Kein Treffer? Kein Problem — dein eingetippter Titel wird beim Abstimmen trotzdem übernommen.
              </p>
            </div>
          )}

          {/* Freitext-Antworten (nach Abstimmung/Ende sichtbar) */}
          {freeTextAnswers.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Eigene Antworten</p>
              {(allFreeText ? freeTextAnswers : freeTextAnswers.slice(0, FREE_TEXT_PREVIEW)).map((t, i) => (
                <p key={i} className="text-xs text-gray-400 bg-surface-2 rounded-md px-2 py-1 [overflow-wrap:anywhere]">{t}</p>
              ))}
              <ShowAllToggle total={freeTextAnswers.length} shown={FREE_TEXT_PREVIEW} open={allFreeText} onToggle={() => setAllFreeText(o => !o)} />
            </div>
          )}

          {/* Spielevorschläge (aggregiert, nach Abstimmung/Ende sichtbar) */}
          {gameSuggestions.length > 0 && (
            <div className="mt-2.5 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vorschläge</p>
              {(allGames ? gameSuggestions : gameSuggestions.slice(0, GAME_SUGGESTION_PREVIEW)).map((g, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-surface-2 border border-line">
                  {g.appId && (
                    <img src={coverUrl(g.appId)} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                  )}
                  <span className="text-xs text-white/85 flex-1 min-w-0 [overflow-wrap:anywhere]">{g.name}</span>
                  {g.appId && (
                    <a href={steamUrl(g.appId)} target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-purple-300 transition-colors shrink-0" title="Zur Steam-Seite">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <span className="text-xs text-gray-500 tabular-nums shrink-0">{g.count}x</span>
                </div>
              ))}
              <ShowAllToggle total={gameSuggestions.length} shown={GAME_SUGGESTION_PREVIEW} open={allGames} onToggle={() => setAllGames(o => !o)} />
            </div>
          )}

          {/* Abstimmen / Zurückziehen / Anmelden */}
          {!poll.ended && (
            !loggedIn ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent(pathname || "/dashboard")}`}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-colors max-lg:min-h-10">
                Mit Discord anmelden zum Abstimmen
              </Link>
            ) : poll.hasVoted ? (
              <button
                type="button"
                onClick={resetVote}
                disabled={resetting}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-line hover:bg-line border border-line-strong disabled:opacity-50 text-gray-300 transition-colors max-lg:min-h-10"
              >
                {resetting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                Stimme zurückziehen
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors max-lg:min-h-10"
              >
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <VoteIcon className="w-3 h-3" />}
                Abstimmen
              </button>
            )
          )}
        </div>

        {/* Nur nach Ablauf wegklickbar */}
        {poll.ended && (
          <button onClick={onDismiss}
            className="shrink-0 self-start p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-line transition-colors"
            aria-label="Schließen">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Community-Umfragen, immer aufgeklappt. Die Daten kommen serverseitig mit (kein Nachladen,
 * kein Springen der Seite); blendet sich ohne Umfrage selbst aus.
 * - Startseite: alle laufenden Umfragen, an ein Event geknüpfte mit Link dorthin.
 * - Event-Seite: nur die Umfragen dieses Events (showEventLink=false).
 */
export function DailyPollBanner({
  initialPolls,
  loggedIn = true,
  showEventLink = true,
}: {
  initialPolls: Poll[];
  loggedIn?: boolean;
  showEventLink?: boolean;
}) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // Weggeklickte (beendete) Umfragen stehen nur im Browser — erst nach der Hydration lesen,
  // sonst weicht das Server-HTML ab
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  function isDismissed(p: Poll) {
    if (dismissedIds.has(p.id)) return true;
    if (!hydrated || !p.ended) return false;
    try { return !!localStorage.getItem(`daily-poll-dismissed-${p.id}`); } catch { return false; }
  }

  function dismiss(id: string) {
    try { localStorage.setItem(`daily-poll-dismissed-${id}`, "1"); } catch { /* ignore */ }
    setDismissedIds(prev => new Set(prev).add(id));
  }

  function updatePoll(updated: Poll) {
    setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  const visible = polls.filter(p => !isDismissed(p));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {visible.map(p => (
        <PollCard key={p.id} poll={p} onVoted={updatePoll} onDismiss={() => dismiss(p.id)}
          loggedIn={loggedIn} showEventLink={showEventLink} />
      ))}
    </div>
  );
}

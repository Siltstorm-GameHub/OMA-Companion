"use client";
import { useEffect, useState } from "react";
import { ChevronDown, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { reportCategoryLabel } from "@/lib/report-categories";
import { formatBerlinDate } from "@/lib/time";

/** Journalisten-Büro: eigene Auswertung (Berichte, Bewertungen, Ergänzungen, Verlauf). */

interface Stats {
  published: number; drafts: number; totalVotes: number; averageVotes: number; votesThisWeek: number;
  top: { id: string; title: string; votes: number } | null;
  contributionsReceived: number; contributionsWritten: number; contributionVotes: number;
  weekly: { weekStart: string; votes: number }[];
  categories: { category: string; count: number }[];
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
    </div>
  );
}

export function JournalistStatsBlock({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/reports/stats").then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;
  const maxWeek = Math.max(1, ...stats.weekly.map(w => w.votes));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          {stats.published} {stats.published === 1 ? "Bericht" : "Berichte"} · {stats.totalVotes} 👍 · diese Woche {stats.votesThisWeek}
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Tile label="Veröffentlicht" value={String(stats.published)} sub={stats.drafts > 0 ? `+ ${stats.drafts} Entwürfe` : undefined} />
            <Tile label="Ø Daumen/Bericht" value={stats.averageVotes.toFixed(1)} />
            <Tile label="Ergänzungen erhalten" value={String(stats.contributionsReceived)} />
            <Tile label="Meine Ergänzungen" value={String(stats.contributionsWritten)} sub={`${stats.contributionVotes} 👍 darauf`} />
          </div>

          {stats.top && (
            <p className="text-[11px] text-gray-400">
              Beliebtester Bericht: <span className="text-gray-200">{stats.top.title}</span> <span className="text-gray-600">({stats.top.votes} 👍)</span>
            </p>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Daumen pro Woche</p>
            {stats.weekly.length === 0 ? (
              <p className="text-[11px] text-gray-600">Noch keine Bewertungen in den letzten 8 Wochen.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-16">
                {stats.weekly.map(w => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0" title={`${formatBerlinDate(w.weekStart)}: ${w.votes}`}>
                    <span className="text-[9px] text-gray-500">{w.votes}</span>
                    <div className="w-full rounded-t bg-teal-400/70" style={{ height: `${Math.max(4, (w.votes / maxWeek) * 36)}px` }} />
                    <span className="text-[9px] text-gray-600 truncate">{formatBerlinDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stats.categories.map(c => (
                <span key={c.category} className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">
                  {c.category === "ohne" ? "Ohne Kategorie" : reportCategoryLabel(c.category) ?? c.category}: {c.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rückblick, Bildwünsche, Interviews ───────────────────────────────────────

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";
const FIELD = "bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

function Section({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <span className={LABEL}>{title}{count !== undefined && count > 0 ? ` (${count})` : ""}</span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

interface PhotoRequestItem {
  id: string; description: string; status: string; eventTitle: string | null; fulfilledAssetUrl?: string | null;
}

/** Eigene Bildwünsche an die Fotografen (anlegen geht im Editor, "Bild beim Fotografen anfragen"). */
export function PhotoRequestsBlock({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<PhotoRequestItem[] | null>(null);

  function reload() {
    api<{ requests: PhotoRequestItem[] }>("/api/community-jobs/photo-requests?scope=mine").then(d => setItems(d.requests)).catch(() => setItems([]));
  }
  useEffect(reload, [refreshKey]);

  async function close(id: string) {
    try { await api(`/api/community-jobs/photo-requests/${id}`, { method: "DELETE" }); reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items) return null;
  const open = items.filter(i => i.status === "OPEN").length;
  return (
    <Section title="Meine Bildwünsche" count={open}>
      {items.length === 0 && <p className="text-[11px] text-gray-600">Noch keine. Bildwünsche stellst du im Editor (Titelbild) bzw. bei Bildern in Werbe-Posts, Anleitungen und Ideen.</p>}
      {items.map(i => (
        <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 flex items-center gap-2">
            {i.fulfilledAssetUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau
              <img src={i.fulfilledAssetUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
            )}
            <span className="truncate text-gray-300">{i.description}{i.eventTitle && <span className="text-gray-600"> · {i.eventTitle}</span>}</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <span className={i.status === "FULFILLED" ? "text-emerald-400" : i.status === "OPEN" ? "text-amber-400" : "text-gray-600"}>
              {i.status === "FULFILLED" ? "Erfüllt" : i.status === "OPEN" ? "Offen" : "Zurückgezogen"}
            </span>
            {i.status === "OPEN" && <button onClick={() => close(i.id)} className="text-gray-600 hover:text-red-400 transition-colors">Zurückziehen</button>}
          </span>
        </div>
      ))}
    </Section>
  );
}

interface InterviewItem { id: string; status: string; questionCount: number; interviewee: { username: string | null; name: string | null }; markdown: string | null }
interface FoundUser { id: string; username: string | null; name: string | null }

/** Interviews: Fragen an ein Community-Mitglied schicken; beantwortete Interviews fügt der Editor unter "Bausteine" ein. */
function InterviewsBlock() {
  const [items, setItems] = useState<InterviewItem[] | null>(null);
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [person, setPerson] = useState<FoundUser | null>(null);
  const [questions, setQuestions] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);

  function reload() {
    api<{ interviews: InterviewItem[] }>("/api/community-jobs/interviews").then(d => setItems(d.interviews)).catch(() => setItems([]));
  }
  useEffect(reload, []);

  useEffect(() => {
    if (person || query.trim().length < 2) { setFound([]); return; }
    const timer = setTimeout(() => {
      api<FoundUser[]>(`/api/users/search?q=${encodeURIComponent(query.trim())}`).then(setFound).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [query, person]);

  async function send() {
    if (!person) return;
    setBusy(true);
    try {
      await api("/api/community-jobs/interviews", { method: "POST", body: JSON.stringify({ intervieweeId: person.id, questions }) });
      toast.success("Interview-Anfrage gesendet");
      setComposing(false); setPerson(null); setQuery(""); setQuestions([""]);
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  if (!items) return null;
  const ready = items.filter(i => i.status === "ANSWERED").length;
  return (
    <Section title="Interviews" count={ready}>
      {items.map(i => (
        <div key={i.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-gray-300 truncate">{i.interviewee.username ?? i.interviewee.name} <span className="text-gray-600">· {i.questionCount} {i.questionCount === 1 ? "Frage" : "Fragen"}</span></span>
          <span className={i.status === "ANSWERED" ? "text-emerald-400" : i.status === "PENDING" ? "text-amber-400" : "text-gray-600"}>
            {i.status === "ANSWERED" ? "Beantwortet — im Editor unter „Bausteine“" : i.status === "PENDING" ? "Wartet auf Antwort" : "Abgelehnt"}
          </span>
        </div>
      ))}
      {items.length === 0 && !composing && <p className="text-[11px] text-gray-600">Noch keine Interviews. Frage jemanden aus der Community — die Antworten landen als Q&A in deinem Bericht.</p>}

      {!composing ? (
        <Button size="sm" variant="outline" onClick={() => setComposing(true)}>Neues Interview anfragen</Button>
      ) : (
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-2">
          {person ? (
            <p className="text-xs text-gray-200 flex items-center justify-between">
              Interview mit {person.username ?? person.name}
              <button onClick={() => { setPerson(null); setQuery(""); }} className="text-gray-600 hover:text-red-400 text-[11px]">Ändern</button>
            </p>
          ) : (
            <div className="space-y-1">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Wen möchtest du interviewen?" aria-label="Person suchen" className={`w-full ${FIELD}`} />
              {found.map(u => (
                <button key={u.id} onClick={() => setPerson(u)} className="w-full text-left text-xs text-gray-300 hover:bg-white/[0.06] rounded px-2 py-1">{u.username ?? u.name}</button>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input value={q} onChange={e => setQuestions(qs => qs.map((x, j) => (j === i ? e.target.value : x)))} maxLength={300}
                  placeholder={`Frage ${i + 1}`} className={`flex-1 ${FIELD}`} />
                {questions.length > 1 && <button onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} aria-label="Frage entfernen" className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
            {questions.length < 8 && <button onClick={() => setQuestions(qs => [...qs, ""])} className="text-[11px] text-gray-500 hover:text-teal-300">+ Weitere Frage</button>}
          </div>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>Abbrechen</Button>
            <Button size="sm" loading={busy} disabled={!person || questions.every(q => !q.trim())} onClick={send}>Anfragen</Button>
          </div>
        </div>
      )}
    </Section>
  );
}

/** Zusatzwerkzeuge im Journalisten-Büro: Rückblick-Vorlagen, Bildwünsche und Interviews. */
export function JournalistExtras({ onCompose }: { onCompose: (recap: "week" | "month") => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={LABEL}>Rückblick erstellen</span>
        <Button size="sm" variant="outline" onClick={() => onCompose("week")}>Wochenrückblick</Button>
        <Button size="sm" variant="outline" onClick={() => onCompose("month")}>Monatsrückblick</Button>
      </div>
      <PhotoRequestsBlock />
      <InterviewsBlock />
    </div>
  );
}

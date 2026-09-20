"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, X, Trash2, ChevronDown, Target, UserPlus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";

/**
 * Werkzeuge des Coach-Büros: Verfügbarkeit ("Ich helfe gerade"), Wochenziel +
 * Auswertung, Anwesenheit vergangener Termine und Mentees. Die Terminliste selbst
 * (anlegen/ändern/anmelden) liegt in CommunityJobsPanel.tsx.
 */

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

const PRESENT_ON = "bg-emerald-500/20 text-emerald-300";
const PRESENT_OFF = "text-gray-600 hover:text-emerald-300";
const ABSENT_ON = "bg-red-500/20 text-red-300";
const ABSENT_OFF = "text-gray-600 hover:text-red-300";
const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";
const INPUT = "bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

function nameOf(u: { username: string | null; name: string | null }): string {
  return u.username ?? u.name ?? "?";
}

// ── Verfügbarkeit ────────────────────────────────────────────────────────────

interface DiscordChannel { id: string; name: string; category: string | null }

export function CoachAvailability({ initialUntil }: { initialUntil?: string | null }) {
  const [until, setUntil] = useState<string | null>(initialUntil ?? null);
  const [minutes, setMinutes] = useState(120);
  const [channelId, setChannelId] = useState("");
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ channels: DiscordChannel[] }>("/api/community-jobs/discord-channels").then(d => setChannels(d.channels)).catch(() => {});
  }, []);

  const active = until !== null && new Date(until) > new Date();

  async function set(mins: number | null) {
    setBusy(true);
    try {
      const res = await api<{ availableUntil: string | null }>("/api/community-jobs/coach/availability", {
        method: "POST", body: JSON.stringify({ minutes: mins, discordChannelId: mins && channelId ? channelId : undefined }),
      });
      setUntil(res.availableUntil);
      toast.success(mins ? "Du bist jetzt als verfügbar markiert" : "Verfügbarkeit beendet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-lg p-2.5 space-y-2 border ${active ? "bg-emerald-500/[0.06] border-emerald-500/25" : "bg-white/[0.03] border-white/[0.05]"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400 motion-safe:animate-pulse" : "bg-gray-600"}`} />
          {active ? `Verfügbar bis ${formatBerlinDateTime(until!, { timeStyle: "short" })}` : "Ad-hoc-Hilfe: gerade nicht verfügbar"}
        </p>
        {active && <Button size="sm" variant="ghost" loading={busy} onClick={() => set(null)}>Beenden</Button>}
      </div>
      {!active && (
        <div className="flex flex-wrap items-center gap-2">
          <Select size="sm" value={String(minutes)} onChange={e => setMinutes(Number(e.target.value))}>
            <option value="60">1 Stunde</option>
            <option value="120">2 Stunden</option>
            <option value="240">4 Stunden</option>
            <option value="480">8 Stunden</option>
          </Select>
          {channels.length > 0 && (
            <Select size="sm" value={channelId} onChange={e => setChannelId(e.target.value)}>
              <option value="">Keine Discord-Nachricht</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.category ? `${c.category} / ` : ""}#{c.name}</option>)}
            </Select>
          )}
          <Button size="sm" loading={busy} onClick={() => set(minutes)}>Jetzt verfügbar</Button>
        </div>
      )}
      {!active && <p className="text-[10px] text-gray-600">Andere sehen dich im Community-Board als „verfügbar“ und können dich direkt ansprechen.</p>}
    </div>
  );
}

// ── Wochenziel + Auswertung ──────────────────────────────────────────────────

interface Stats {
  weeklyGoal: number; sessionsThisWeek: number;
  weekly: { weekStart: string; average: number; count: number }[];
  sessions: { id: string; title: string; startAt: string; signups: number; attended: number; unmarked: number; ratingCount: number; ratingAverage: number | null }[];
}

export function CoachStatsBlock() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Stats>("/api/community-jobs/coach/stats").then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;
  const goalReached = stats.sessionsThisWeek >= stats.weeklyGoal;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs flex items-center gap-1.5 ${goalReached ? "text-emerald-400" : "text-gray-300"}`}>
          <Target className="w-3.5 h-3.5" />
          Wochenziel: {Math.min(stats.sessionsThisWeek, stats.weeklyGoal)}/{stats.weeklyGoal} {stats.weeklyGoal === 1 ? "Termin" : "Termine"} diese Woche
          {goalReached && <Check className="w-3.5 h-3.5" />}
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.03] p-2.5">
          <div className="space-y-1.5">
            <p className={LABEL}>Ø Bewertung pro Woche</p>
            {stats.weekly.length === 0 ? (
              <p className="text-[11px] text-gray-600">Noch keine Bewertungen in den letzten 8 Wochen.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-16">
                {stats.weekly.map(w => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0"
                    title={`${formatBerlinDate(w.weekStart)}: Ø ${w.average.toFixed(1)} (${w.count})`}>
                    <span className="text-[9px] text-gray-500">{w.average.toFixed(1)}</span>
                    <div className="w-full rounded-t bg-amber-400/70" style={{ height: `${Math.max(6, (w.average / 5) * 40)}px` }} />
                    <span className="text-[9px] text-gray-600 truncate">{formatBerlinDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className={LABEL}>Letzte Termine</p>
            {stats.sessions.length === 0 && <p className="text-[11px] text-gray-600">Noch keine vergangenen Termine.</p>}
            {stats.sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-gray-300 truncate">{s.title} <span className="text-gray-600">· {formatBerlinDate(s.startAt)}</span></span>
                <span className="text-gray-500 shrink-0">
                  {s.unmarked > 0 ? <span className="text-amber-400">{s.unmarked} offen · </span> : null}
                  {s.attended}/{s.signups} da
                  {s.ratingAverage !== null && <> · ★ {s.ratingAverage.toFixed(1)} ({s.ratingCount})</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Anwesenheit vergangener Termine ──────────────────────────────────────────

interface PastParticipant { id: string; username: string | null; name: string | null; attended: boolean | null }
interface PastSession { id: string; title: string; startAt: string; participants: PastParticipant[] }

export function CoachAttendance({ onMenteeAdded }: { onMenteeAdded?: () => void }) {
  const [past, setPast] = useState<PastSession[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api<{ past: PastSession[] }>("/api/community-jobs/coach/training-sessions").then(d => setPast(d.past)).catch(() => setPast([]));
  }, []);

  async function mark(sessionId: string, userId: string, attended: boolean | null) {
    try {
      await api(`/api/community-jobs/coach/training-sessions/${sessionId}/attendance`, { method: "PATCH", body: JSON.stringify({ userId, attended }) });
      setPast(list => (list ?? []).map(s => s.id !== sessionId ? s : {
        ...s, participants: s.participants.map(p => p.id === userId ? { ...p, attended } : p),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  async function addMentee(userId: string) {
    try {
      await api("/api/community-jobs/coach/mentees", { method: "POST", body: JSON.stringify({ menteeId: userId }) });
      toast.success("Als Mentee hinzugefügt");
      onMenteeAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  const withParticipants = (past ?? []).filter(s => s.participants.length > 0);
  if (withParticipants.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className={LABEL}>Anwesenheit eintragen</p>
      {withParticipants.map(s => {
        const unmarked = s.participants.filter(p => p.attended === null).length;
        return (
          <div key={s.id} className="rounded-lg bg-white/[0.03]">
            <button onClick={() => setOpenId(openId === s.id ? null : s.id)} aria-expanded={openId === s.id}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs text-left">
              <span className="text-gray-300 truncate">{s.title} <span className="text-gray-600">· {formatBerlinDateTime(s.startAt)}</span></span>
              <span className="flex items-center gap-2 shrink-0">
                {unmarked > 0 ? <span className="text-amber-400">{unmarked} offen</span> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
                <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${openId === s.id ? "rotate-180" : ""}`} />
              </span>
            </button>
            {openId === s.id && (
              <div className="px-2.5 pb-2.5 space-y-1">
                {s.participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-300 truncate">{nameOf(p)}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <button onClick={() => mark(s.id, p.id, p.attended === true ? null : true)} aria-pressed={p.attended === true} title="Anwesend"
                        className={`p-1 rounded ${p.attended === true ? PRESENT_ON : PRESENT_OFF}`}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => mark(s.id, p.id, p.attended === false ? null : false)} aria-pressed={p.attended === false} title="Nicht erschienen"
                        className={`p-1 rounded ${p.attended === false ? ABSENT_ON : ABSENT_OFF}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => addMentee(p.id)} title="Als Mentee hinzufügen" className="p-1 rounded text-gray-600 hover:text-teal-300">
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mentees ──────────────────────────────────────────────────────────────────

interface Mentee { id: string; note: string | null; trainingsAttended: number; mentee: { id: string; username: string | null; name: string | null } }
interface FoundUser { id: string; username: string | null; name: string | null }

export function CoachMentees({ refreshKey }: { refreshKey?: number }) {
  const [items, setItems] = useState<Mentee[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchSeq = useRef(0);

  function reload() {
    api<{ mentees: Mentee[] }>("/api/community-jobs/coach/mentees").then(d => {
      setItems(d.mentees);
      setNotes(Object.fromEntries(d.mentees.map(m => [m.id, m.note ?? ""])));
    }).catch(() => setItems([]));
  }
  useEffect(reload, [refreshKey]);

  useEffect(() => {
    if (query.trim().length < 2) { setFound([]); return; }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = setTimeout(() => {
      api<FoundUser[]>(`/api/users/search?q=${encodeURIComponent(query.trim())}`)
        .then(r => { if (seq === searchSeq.current) setFound(r); })
        .catch(() => {})
        .finally(() => { if (seq === searchSeq.current) setSearching(false); });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function add(userId: string) {
    try {
      await api("/api/community-jobs/coach/mentees", { method: "POST", body: JSON.stringify({ menteeId: userId }) });
      setQuery(""); setFound([]);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }
  async function saveNote(m: Mentee) {
    if ((notes[m.id] ?? "") === (m.note ?? "")) return;
    try {
      await api(`/api/community-jobs/coach/mentees/${m.id}`, { method: "PATCH", body: JSON.stringify({ note: notes[m.id] ?? "" }) });
      toast.success("Notiz gespeichert");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }
  async function remove(m: Mentee) {
    if (!window.confirm(`${nameOf(m.mentee)} aus deiner Mentee-Liste entfernen?`)) return;
    try {
      await api(`/api/community-jobs/coach/mentees/${m.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  if (!items) return null;
  const known = new Set(items.map(m => m.mentee.id));
  return (
    <div className="space-y-1.5">
      <p className={LABEL}>Meine Mentees ({items.length})</p>
      {items.length === 0 && <p className="text-[11px] text-gray-600">Noch niemand — füge Spieler hinzu, die du persönlich begleitest. Die Liste ist nur für dich sichtbar.</p>}
      {items.map(m => (
        <div key={m.id} className="rounded-lg bg-white/[0.03] px-2.5 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-200 truncate">{nameOf(m.mentee)}</span>
            <span className="flex items-center gap-2 shrink-0 text-gray-500">
              {m.trainingsAttended} {m.trainingsAttended === 1 ? "Training" : "Trainings"}
              <button onClick={() => remove(m)} title="Entfernen" aria-label="Mentee entfernen" className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
          <input value={notes[m.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [m.id]: e.target.value }))} onBlur={() => saveNote(m)}
            placeholder="Notiz (z.B. Ziele, Lieblingsspiele)" maxLength={300} className={`w-full ${INPUT}`} />
        </div>
      ))}

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Spieler suchen und als Mentee hinzufügen…"
          className={`w-full pl-7 ${INPUT}`} />
        {searching && <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />}
      </div>
      {found.filter(u => !known.has(u.id)).length > 0 && (
        <div className="rounded-lg bg-white/[0.04] divide-y divide-white/[0.04]">
          {found.filter(u => !known.has(u.id)).map(u => (
            <button key={u.id} onClick={() => add(u.id)} className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-gray-300 hover:bg-white/[0.04] text-left">
              {nameOf(u)} <UserPlus className="w-3.5 h-3.5 text-teal-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

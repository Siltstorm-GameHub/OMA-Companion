"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart2, CalendarDays, Star, Plus, Trash2,
  Clock, CheckCircle2, XCircle, AlertCircle, Hash,
  Trophy, Gift, Heart,
} from "lucide-react";

// ── Discord-Laufzeit-Optionen (exakt wie in Discord selbst) ─────
const DURATION_OPTIONS = [
  { label: "1 Stunde",   value: 1   },
  { label: "2 Stunden",  value: 2   },
  { label: "4 Stunden",  value: 4   },
  { label: "8 Stunden",  value: 8   },
  { label: "12 Stunden", value: 12  },
  { label: "1 Tag",      value: 24  },
  { label: "3 Tage",     value: 72  },
  { label: "7 Tage",     value: 168 },
];

// ── Typen ────────────────────────────────────────────────────────

interface EventItem {
  id: string; title: string; startAt: string; status: string;
  registrations: { user: { id: string; name: string | null; username: string | null } }[];
}
interface Spieltag {
  id: string; number: number; game: string | null; scheduledAt: string | null; status: string;
  entries: { role: string; user: { id: string; name: string | null; username: string | null } }[];
}
interface PollJob {
  id: string; type: string; refId: string; channelId: string;
  scheduledAt: string; duration: number; status: string;
  question: string | null; excludedUserIds: string[];
  messageId: string | null; errorMsg: string | null;
  createdAt: string; sentAt: string | null;
}
interface Props { events: EventItem[]; spieltage: Spieltag[]; jobs: PollJob[]; }

// ── Hilfsfunktionen ──────────────────────────────────────────────

function toLocal(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function pollTypeLabel(type: string) {
  if (type === "event_winner")   return <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5 text-amber-400" /> Event-Sieger</span>;
  if (type === "lul_trostpreis") return <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5 text-amber-400" /> Trostpreis</span>;
  if (type === "lul_community")  return <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-yellow-400" /> Community-Support</span>;
  return <span>{type}</span>;
}

function statusBadge(status: string) {
  if (status === "pending")   return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3"/>Geplant</span>;
  if (status === "sent")      return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3"/>Gesendet</span>;
  if (status === "cancelled") return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20"><XCircle className="w-3 h-3"/>Abgebrochen</span>;
  if (status === "failed")    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="w-3 h-3"/>Fehler</span>;
  return <span className="text-xs text-gray-500">{status}</span>;
}

// ── Hauptkomponente ──────────────────────────────────────────────

export function PollsAdminPanel({ events, spieltage, jobs: initJobs }: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initJobs);
  const [tab,  setTab]  = useState<"event" | "lul">("event");

  // ── Event-Poll-Form ──────────────────────────────────────────
  const [evtId,          setEvtId]          = useState("");
  const [evtChan,        setEvtChan]        = useState(process.env.NEXT_PUBLIC_DISCORD_DEFAULT_CHANNEL ?? "");
  const [evtSched,       setEvtSched]       = useState("");
  const [evtDuration,    setEvtDuration]    = useState(24);
  const [evtQuestion,    setEvtQuestion]    = useState("");
  const [evtExcluded,    setEvtExcluded]    = useState<Set<string>>(new Set());
  const [evtSaving,      setEvtSaving]      = useState(false);
  const [evtErrors,      setEvtErrors]      = useState<{ id?: string; chan?: string; sched?: string }>({});

  async function scheduleEventPoll() {
    const errs: typeof evtErrors = {};
    if (!evtId)    errs.id    = "Bitte ein Event auswählen";
    if (!evtChan)  errs.chan  = "Kanal-ID ist erforderlich";
    if (!evtSched) errs.sched = "Zeitpunkt ist erforderlich";
    if (Object.keys(errs).length) { setEvtErrors(errs); return; }
    setEvtErrors({});
    setEvtSaving(true);
    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "event_winner", refId: evtId, channelId: evtChan, scheduledAt: new Date(evtSched).toISOString(), duration: evtDuration, question: evtQuestion.trim() || evtAutoQ, excludedUserIds: [...evtExcluded] }),
      });
      if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
      const job = await res.json();
      setJobs(j => [job, ...j]);
      toast.success("Event-Umfrage geplant ✅");
      router.refresh();
    } finally { setEvtSaving(false); }
  }

  // ── LUL-Poll-Form ────────────────────────────────────────────
  const [lulId,          setLulId]          = useState("");
  const [lulChan,        setLulChan]        = useState(process.env.NEXT_PUBLIC_DISCORD_DEFAULT_CHANNEL ?? "");
  const [lulSched,       setLulSched]       = useState("");
  const [lulDuration,    setLulDuration]    = useState(168);
  const [lulQ1,          setLulQ1]          = useState("");
  const [lulQ2,          setLulQ2]          = useState("");
  const [lulExcPlayers,  setLulExcPlayers]  = useState<Set<string>>(new Set());
  const [lulExcViewers,  setLulExcViewers]  = useState<Set<string>>(new Set());
  const [lulSaving,      setLulSaving]      = useState(false);
  const [lulErrors,      setLulErrors]      = useState<{ id?: string; chan?: string; sched?: string }>({});

  async function scheduleLulPolls() {
    const errs: typeof lulErrors = {};
    if (!lulId)    errs.id    = "Bitte einen Spieltag auswählen";
    if (!lulChan)  errs.chan  = "Kanal-ID ist erforderlich";
    if (!lulSched) errs.sched = "Zeitpunkt ist erforderlich";
    if (Object.keys(errs).length) { setLulErrors(errs); return; }
    setLulErrors({});
    setLulSaving(true);
    try {
      const scheduledAt = new Date(lulSched).toISOString();
      const [r1, r2] = await Promise.all([
        fetch("/api/admin/polls", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lul_trostpreis", refId: lulId, channelId: lulChan, scheduledAt, duration: lulDuration, question: lulQ1.trim() || lulAutoQ1, excludedUserIds: [...lulExcPlayers] }) }),
        fetch("/api/admin/polls", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lul_community",  refId: lulId, channelId: lulChan, scheduledAt, duration: lulDuration, question: lulQ2.trim() || lulAutoQ2, excludedUserIds: [...lulExcViewers] }) }),
      ]);
      if (!r1.ok || !r2.ok) { toast.error("Fehler beim Erstellen"); return; }
      const [j1, j2] = await Promise.all([r1.json(), r2.json()]);
      setJobs(j => [j1, j2, ...j]);
      toast.success("Beide LUL-Umfragen geplant ✅");
      router.refresh();
    } finally { setLulSaving(false); }
  }

  // ── Stornieren ───────────────────────────────────────────────
  async function cancel(id: string) {
    const res = await fetch(`/api/admin/polls/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Fehler beim Stornieren"); return; }
    setJobs(j => j.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
    toast.success("Umfrage storniert");
  }

  // Ausgewähltes Event
  const selEvent    = events.find(e => e.id === evtId);
  const evtPlayers  = selEvent?.registrations.map(r => r.user) ?? [];
  const evtAutoQ    = selEvent ? `Wer gewinnt „${selEvent.title}"? 🏆` : "";

  function toggleEvtExclude(id: string) {
    setEvtExcluded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleLulExcPlayer(id: string) {
    setLulExcPlayers(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleLulExcViewer(id: string) {
    setLulExcViewers(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // Ausgewählter Spieltag
  const selSpieltag = spieltage.find(s => s.id === lulId);
  const lulPlayers  = selSpieltag?.entries.filter(e => e.role === "player").map(e => e.user) ?? [];
  const lulViewers  = selSpieltag?.entries.filter(e => e.role === "spectator").map(e => e.user) ?? [];
  const lulAutoQ1   = selSpieltag ? `Spieltag ${selSpieltag.number}: Wer verdient den Trostpreis? 🎁` : "";
  const lulAutoQ2   = selSpieltag ? `Spieltag ${selSpieltag.number}: Wer gewinnt den Community-Support-Preis? 💛` : "";

  // Vorschlag für automatische Zeit
  function suggestEventTime() {
    if (!selEvent) return;
    const t = new Date(selEvent.startAt);
    t.setHours(t.getHours() - 1);
    // datetime-local format
    setEvtSched(t.toISOString().slice(0, 16));
  }
  function suggestLulTime() {
    if (!selSpieltag?.scheduledAt) return;
    const t = new Date(selSpieltag.scheduledAt);
    t.setDate(t.getDate() + 1);
    t.setHours(8, 0, 0, 0);
    setLulSched(t.toISOString().slice(0, 16));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Discord-Umfragen</h1>
          <p className="text-xs text-gray-500">Plant automatische Polls für Events und LUL-Spieltage</p>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-fit">
        {([["event", CalendarDays, "Event-Sieger"] , ["lul", Star, "LUL-Spieltag"]] as const).map(([key, Icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === key ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-white"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Event-Poll-Form ──────────────────────────────────── */}
      {tab === "event" && (
        <div className="glass rounded-2xl p-5 border border-white/[0.07] space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Neue Event-Umfrage planen</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><CalendarDays className="w-3.5 h-3.5"/>Event wählen</label>
              <select value={evtId} onChange={e => { setEvtId(e.target.value); setEvtErrors(p => ({ ...p, id: undefined })); setEvtExcluded(new Set()); }}
                className={`w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-900 border outline-none focus:border-indigo-500/40 ${evtErrors.id ? "border-red-500/50" : "border-white/[0.1]"}`}
                style={{ colorScheme: "dark" }}>
                <option value="">— Event wählen —</option>
                {events.filter(e => e.status === "open" || e.status === "active").length > 0 && (
                  <optgroup label="Aktive Events">
                    {events.filter(e => e.status === "open" || e.status === "active").map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({new Date(e.startAt).toLocaleDateString("de-DE")})
                      </option>
                    ))}
                  </optgroup>
                )}
                {events.filter(e => e.status === "closed" || e.status === "finished").length > 0 && (
                  <optgroup label="Abgeschlossen (letzte 3 Tage)">
                    {events.filter(e => e.status === "closed" || e.status === "finished").map(e => (
                      <option key={e.id} value={e.id}>
                        ✓ {e.title} ({new Date(e.startAt).toLocaleDateString("de-DE")})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {evtErrors.id && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{evtErrors.id}</p>}
            </div>

            {/* Kanal */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Hash className="w-3.5 h-3.5"/>Discord Kanal-ID</label>
              <input type="text" value={evtChan} onChange={e => { setEvtChan(e.target.value); setEvtErrors(p => ({ ...p, chan: undefined })); }}
                placeholder="z.B. 123456789012345678"
                className={`w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border outline-none focus:border-indigo-500/40 placeholder-gray-600 ${evtErrors.chan ? "border-red-500/50" : "border-white/[0.1]"}`} />
              {evtErrors.chan && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{evtErrors.chan}</p>}
            </div>

            {/* Zeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Zeitpunkt</label>
              <div className="flex gap-2">
                <input type="datetime-local" value={evtSched} onChange={e => { setEvtSched(e.target.value); setEvtErrors(p => ({ ...p, sched: undefined })); }}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border outline-none focus:border-indigo-500/40 ${evtErrors.sched ? "border-red-500/50" : "border-white/[0.1]"}`} />
                {selEvent && (
                  <button onClick={suggestEventTime}
                    className="text-xs px-3 rounded-xl border border-white/[0.08] text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors whitespace-nowrap">
                    1h vorher
                  </button>
                )}
              </div>
              {evtErrors.sched && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{evtErrors.sched}</p>}
            </div>

            {/* Frage */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs text-gray-400">Umfrage-Frage</label>
              <input
                type="text"
                value={evtQuestion}
                onChange={e => setEvtQuestion(e.target.value)}
                placeholder={evtAutoQ || "Wähle zuerst ein Event…"}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40 placeholder-gray-600"
              />
              {evtAutoQ && !evtQuestion && (
                <p className="text-[10px] text-gray-600">Automatischer Vorschlag — direkt editierbar (max. 300 Zeichen)</p>
              )}
            </div>

            {/* Laufzeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Umfrage-Laufzeit</label>
              <select value={evtDuration} onChange={e => setEvtDuration(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-900 border border-white/[0.1] outline-none focus:border-indigo-500/40"
                style={{ colorScheme: "dark" }}>
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vorschau Teilnehmer */}
          {selEvent && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
              <p className="text-xs text-gray-500 mb-2">
                Optionen ({evtPlayers.length - evtExcluded.size}/{evtPlayers.length} Mitspieler) — klicken zum Ausschließen:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {evtPlayers.length === 0
                  ? <p className="text-xs text-gray-600 italic">Noch keine Anmeldungen</p>
                  : evtPlayers.map(u => {
                    const excluded = evtExcluded.has(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleEvtExclude(u.id)}
                        title={excluded ? "Wieder einschließen" : "Ausschließen"}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                          excluded
                            ? "bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50"
                            : "bg-indigo-500/10 border-indigo-500/15 text-indigo-300 hover:border-red-500/30 hover:text-red-400"
                        }`}>
                        {u.username ?? u.name}
                      </button>
                    );
                  })
                }
              </div>
              {evtExcluded.size > 0 && (
                <p className="text-[10px] text-red-400/70 mt-2">{evtExcluded.size} ausgeschlossen</p>
              )}
            </div>
          )}

          <button onClick={scheduleEventPoll} disabled={evtSaving || !evtId || !evtChan || !evtSched}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            <Plus className="w-4 h-4" />
            {evtSaving ? "Wird geplant…" : "Umfrage planen"}
          </button>
        </div>
      )}

      {/* ── LUL-Poll-Form ────────────────────────────────────── */}
      {tab === "lul" && (
        <div className="glass rounded-2xl p-5 border border-white/[0.07] space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Neue LUL-Umfragen planen (2 Polls gleichzeitig)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spieltag */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Star className="w-3.5 h-3.5"/>Spieltag wählen</label>
              <select value={lulId} onChange={e => { setLulId(e.target.value); setLulErrors(p => ({ ...p, id: undefined })); setLulExcPlayers(new Set()); setLulExcViewers(new Set()); }}
                className={`w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-900 border outline-none focus:border-indigo-500/40 ${lulErrors.id ? "border-red-500/50" : "border-white/[0.1]"}`}
                style={{ colorScheme: "dark" }}>
                <option value="">— Spieltag wählen —</option>
                {spieltage.map(s => (
                  <option key={s.id} value={s.id}>
                    Spieltag {s.number}{s.game ? ` – ${s.game}` : ""} {s.scheduledAt ? `(${new Date(s.scheduledAt).toLocaleDateString("de-DE")})` : ""}
                  </option>
                ))}
              </select>
              {lulErrors.id && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{lulErrors.id}</p>}
            </div>

            {/* Kanal */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Hash className="w-3.5 h-3.5"/>Discord Kanal-ID</label>
              <input type="text" value={lulChan} onChange={e => { setLulChan(e.target.value); setLulErrors(p => ({ ...p, chan: undefined })); }}
                placeholder="z.B. 123456789012345678"
                className={`w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border outline-none focus:border-indigo-500/40 placeholder-gray-600 ${lulErrors.chan ? "border-red-500/50" : "border-white/[0.1]"}`} />
              {lulErrors.chan && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{lulErrors.chan}</p>}
            </div>

            {/* Zeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Zeitpunkt</label>
              <div className="flex gap-2">
                <input type="datetime-local" value={lulSched} onChange={e => { setLulSched(e.target.value); setLulErrors(p => ({ ...p, sched: undefined })); }}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border outline-none focus:border-indigo-500/40 ${lulErrors.sched ? "border-red-500/50" : "border-white/[0.1]"}`} />
                {selSpieltag?.scheduledAt && (
                  <button onClick={suggestLulTime}
                    className="text-xs px-3 rounded-xl border border-white/[0.08] text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors whitespace-nowrap">
                    +1 Tag 8 Uhr
                  </button>
                )}
              </div>
              {lulErrors.sched && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{lulErrors.sched}</p>}
            </div>

            {/* Fragen */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Gift className="w-3.5 h-3.5 text-amber-400/70" /> Trostpreis-Frage</label>
              <input
                type="text"
                value={lulQ1}
                onChange={e => setLulQ1(e.target.value)}
                placeholder={lulAutoQ1 || "Wähle zuerst einen Spieltag…"}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-amber-500/40 placeholder-gray-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Heart className="w-3.5 h-3.5 text-yellow-400/70" /> Community-Support-Frage</label>
              <input
                type="text"
                value={lulQ2}
                onChange={e => setLulQ2(e.target.value)}
                placeholder={lulAutoQ2 || "Wähle zuerst einen Spieltag…"}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-teal-500/40 placeholder-gray-600"
              />
            </div>

            {/* Laufzeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Umfrage-Laufzeit</label>
              <select value={lulDuration} onChange={e => setLulDuration(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-900 border border-white/[0.1] outline-none focus:border-indigo-500/40"
                style={{ colorScheme: "dark" }}>
                {DURATION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vorschau */}
          {selSpieltag && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                <p className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-2">
                  <Gift className="w-3.5 h-3.5" /> Trostpreis-Umfrage ({lulPlayers.length - lulExcPlayers.size}/{lulPlayers.length}) — klicken zum Ausschließen:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lulPlayers.length === 0
                    ? <p className="text-xs text-gray-600 italic">Keine Mitspieler eingetragen</p>
                    : lulPlayers.map(u => {
                      const excluded = lulExcPlayers.has(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => toggleLulExcPlayer(u.id)}
                          title={excluded ? "Wieder einschließen" : "Ausschließen"}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                            excluded
                              ? "bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50"
                              : "bg-amber-500/10 border-amber-500/15 text-amber-300 hover:border-red-500/30 hover:text-red-400"
                          }`}>
                          {u.username ?? u.name}
                        </button>
                      );
                    })
                  }
                </div>
                {lulExcPlayers.size > 0 && (
                  <p className="text-[10px] text-red-400/70 mt-2">{lulExcPlayers.size} ausgeschlossen</p>
                )}
              </div>
              <div className="rounded-xl bg-teal-500/5 border border-teal-500/15 p-3">
                <p className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold mb-2">
                  <Heart className="w-3.5 h-3.5" /> Community-Support-Umfrage ({lulViewers.length - lulExcViewers.size}/{lulViewers.length}) — klicken zum Ausschließen:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lulViewers.length === 0
                    ? <p className="text-xs text-gray-600 italic">Keine Zuschauer eingetragen</p>
                    : lulViewers.map(u => {
                      const excluded = lulExcViewers.has(u.id);
                      return (
                        <button key={u.id} type="button" onClick={() => toggleLulExcViewer(u.id)}
                          title={excluded ? "Wieder einschließen" : "Ausschließen"}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                            excluded
                              ? "bg-red-500/10 border-red-500/20 text-red-400 line-through opacity-50"
                              : "bg-teal-500/10 border-teal-500/15 text-teal-300 hover:border-red-500/30 hover:text-red-400"
                          }`}>
                          {u.username ?? u.name}
                        </button>
                      );
                    })
                  }
                </div>
                {lulExcViewers.size > 0 && (
                  <p className="text-[10px] text-red-400/70 mt-2">{lulExcViewers.size} ausgeschlossen</p>
                )}
              </div>
            </div>
          )}

          <button onClick={scheduleLulPolls} disabled={lulSaving || !lulId || !lulChan || !lulSched}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors disabled:opacity-40">
            <Plus className="w-4 h-4" />
            {lulSaving ? "Wird geplant…" : "Beide Umfragen planen"}
          </button>
        </div>
      )}

      {/* ── Geplante Umfragen ────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Alle geplanten Umfragen</p>
        <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {jobs.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-8">Noch keine Umfragen geplant.</p>
          )}
          {jobs.map(job => (
            <div key={job.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white font-medium">{pollTypeLabel(job.type)}</span>
                  {statusBadge(job.status)}
                </div>
                {job.question && (
                  <p className="text-xs text-gray-300 italic">„{job.question}"</p>
                )}
                <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{toLocal(job.scheduledAt)}</span>
                  <span className="flex items-center gap-1"><Hash className="w-3 h-3"/>{job.channelId}</span>
                  <span>{job.duration}h Laufzeit</span>
                </div>
                {job.errorMsg && <p className="text-xs text-red-400 mt-0.5">{job.errorMsg}</p>}
                {job.sentAt   && <p className="text-[10px] text-emerald-500/70">Gesendet: {toLocal(job.sentAt)}</p>}
              </div>
              {job.status === "pending" && (
                <button onClick={() => cancel(job.id)}
                  className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

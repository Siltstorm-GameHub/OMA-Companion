"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart2, CalendarDays, Star, Plus, Trash2,
  Clock, CheckCircle2, XCircle, AlertCircle, Hash,
} from "lucide-react";

// ── Typen ────────────────────────────────────────────────────────

interface EventItem {
  id: string; title: string; startAt: string;
  registrations: { user: { id: string; name: string | null; username: string | null } }[];
}
interface Spieltag {
  id: string; number: number; game: string; scheduledAt: string | null; status: string;
  entries: { role: string; user: { id: string; name: string | null; username: string | null } }[];
}
interface PollJob {
  id: string; type: string; refId: string; channelId: string;
  scheduledAt: string; duration: number; status: string;
  messageId: string | null; errorMsg: string | null;
  createdAt: string; sentAt: string | null;
}
interface Props { events: EventItem[]; spieltage: Spieltag[]; jobs: PollJob[]; }

// ── Hilfsfunktionen ──────────────────────────────────────────────

function toLocal(iso: string) {
  return new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function pollTypeLabel(type: string) {
  if (type === "event_winner")   return "🏆 Event-Sieger";
  if (type === "lul_trostpreis") return "🎁 Trostpreis";
  if (type === "lul_community")  return "💛 Community-Support";
  return type;
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
  const [evtId,    setEvtId]    = useState("");
  const [evtChan,  setEvtChan]  = useState(process.env.NEXT_PUBLIC_DISCORD_DEFAULT_CHANNEL ?? "");
  const [evtSched, setEvtSched] = useState("");
  const [evtSaving, setEvtSaving] = useState(false);

  async function scheduleEventPoll() {
    if (!evtId || !evtChan || !evtSched) { toast.error("Alle Felder ausfüllen"); return; }
    setEvtSaving(true);
    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "event_winner", refId: evtId, channelId: evtChan, scheduledAt: new Date(evtSched).toISOString(), duration: 24 }),
      });
      if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
      const job = await res.json();
      setJobs(j => [job, ...j]);
      toast.success("Event-Umfrage geplant ✅");
      router.refresh();
    } finally { setEvtSaving(false); }
  }

  // ── LUL-Poll-Form ────────────────────────────────────────────
  const [lulId,       setLulId]       = useState("");
  const [lulChan,     setLulChan]     = useState(process.env.NEXT_PUBLIC_DISCORD_DEFAULT_CHANNEL ?? "");
  const [lulSched,    setLulSched]    = useState("");
  const [lulSaving,   setLulSaving]   = useState(false);

  async function scheduleLulPolls() {
    if (!lulId || !lulChan || !lulSched) { toast.error("Alle Felder ausfüllen"); return; }
    setLulSaving(true);
    try {
      const scheduledAt = new Date(lulSched).toISOString();
      const [r1, r2] = await Promise.all([
        fetch("/api/admin/polls", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lul_trostpreis", refId: lulId, channelId: lulChan, scheduledAt, duration: 168 }) }),
        fetch("/api/admin/polls", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "lul_community", refId: lulId, channelId: lulChan, scheduledAt, duration: 168 }) }),
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

  // Ausgewählter Spieltag
  const selSpieltag = spieltage.find(s => s.id === lulId);
  const lulPlayers  = selSpieltag?.entries.filter(e => e.role === "player").map(e => e.user) ?? [];
  const lulViewers  = selSpieltag?.entries.filter(e => e.role === "spectator").map(e => e.user) ?? [];

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
              <select value={evtId} onChange={e => { setEvtId(e.target.value); }}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40">
                <option value="">— Event wählen —</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({new Date(e.startAt).toLocaleDateString("de-DE")})
                  </option>
                ))}
              </select>
            </div>

            {/* Kanal */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Hash className="w-3.5 h-3.5"/>Discord Kanal-ID</label>
              <input type="text" value={evtChan} onChange={e => setEvtChan(e.target.value)}
                placeholder="z.B. 123456789012345678"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40 placeholder-gray-600" />
            </div>

            {/* Zeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Zeitpunkt</label>
              <div className="flex gap-2">
                <input type="datetime-local" value={evtSched} onChange={e => setEvtSched(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40" />
                {selEvent && (
                  <button onClick={suggestEventTime}
                    className="text-xs px-3 rounded-xl border border-white/[0.08] text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors whitespace-nowrap">
                    1h vorher
                  </button>
                )}
              </div>
            </div>

            {/* Laufzeit — fix 24h für Events */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Umfrage-Laufzeit</label>
              <div className="rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-white/[0.03] border border-white/[0.06]">
                24 Stunden (fest für Event-Umfragen)
              </div>
            </div>
          </div>

          {/* Vorschau Teilnehmer */}
          {selEvent && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
              <p className="text-xs text-gray-500 mb-2">Optionen ({evtPlayers.length} Mitspieler):</p>
              <div className="flex flex-wrap gap-1.5">
                {evtPlayers.length === 0
                  ? <p className="text-xs text-gray-600 italic">Noch keine Anmeldungen</p>
                  : evtPlayers.map(u => (
                    <span key={u.id} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/15 text-indigo-300">
                      {u.username ?? u.name}
                    </span>
                  ))
                }
              </div>
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
              <select value={lulId} onChange={e => setLulId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40">
                <option value="">— Spieltag wählen —</option>
                {spieltage.map(s => (
                  <option key={s.id} value={s.id}>
                    Spieltag {s.number} – {s.game} {s.scheduledAt ? `(${new Date(s.scheduledAt).toLocaleDateString("de-DE")})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Kanal */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Hash className="w-3.5 h-3.5"/>Discord Kanal-ID</label>
              <input type="text" value={lulChan} onChange={e => setLulChan(e.target.value)}
                placeholder="z.B. 123456789012345678"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40 placeholder-gray-600" />
            </div>

            {/* Zeit */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs text-gray-400"><Clock className="w-3.5 h-3.5"/>Zeitpunkt</label>
              <div className="flex gap-2">
                <input type="datetime-local" value={lulSched} onChange={e => setLulSched(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-indigo-500/40" />
                {selSpieltag?.scheduledAt && (
                  <button onClick={suggestLulTime}
                    className="text-xs px-3 rounded-xl border border-white/[0.08] text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-colors whitespace-nowrap">
                    +1 Tag 8 Uhr
                  </button>
                )}
              </div>
            </div>

            {/* Laufzeit — fix 1 Woche für LUL */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400">Umfrage-Laufzeit</label>
              <div className="rounded-xl px-3 py-2.5 text-sm text-gray-400 bg-white/[0.03] border border-white/[0.06]">
                168 Stunden = 7 Tage (fest für LUL-Umfragen)
              </div>
            </div>
          </div>

          {/* Vorschau */}
          {selSpieltag && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                <p className="text-xs text-amber-400 font-semibold mb-2">🎁 Trostpreis-Umfrage ({lulPlayers.length} Mitspieler)</p>
                <div className="flex flex-wrap gap-1.5">
                  {lulPlayers.length === 0
                    ? <p className="text-xs text-gray-600 italic">Keine Mitspieler eingetragen</p>
                    : lulPlayers.map(u => (
                      <span key={u.id} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/15 text-amber-300">
                        {u.username ?? u.name}
                      </span>
                    ))
                  }
                </div>
              </div>
              <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-3">
                <p className="text-xs text-violet-400 font-semibold mb-2">💛 Community-Support-Umfrage ({lulViewers.length} Zuschauer)</p>
                <div className="flex flex-wrap gap-1.5">
                  {lulViewers.length === 0
                    ? <p className="text-xs text-gray-600 italic">Keine Zuschauer eingetragen</p>
                    : lulViewers.map(u => (
                      <span key={u.id} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/15 text-violet-300">
                        {u.username ?? u.name}
                      </span>
                    ))
                  }
                </div>
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

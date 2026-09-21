"use client";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Megaphone, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatBerlinDate } from "@/lib/time";
import { MARKETING_TEMPLATES } from "@/lib/marketing-templates";

/** Marketing-Büro: Auswertung und Kampagnen (Ankündigung → Erinnerung → Heute). */

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
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

// ── Auswertung ───────────────────────────────────────────────────────────────

interface Stats {
  total: number; totalVotes: number; averageVotes: number; votesThisWeek: number;
  eventsPromoted: number; withImage: number; confirmed: number;
  top: { id: string; caption: string; votes: number } | null;
  weekly: { weekStart: string; votes: number }[];
  reach: { promotedAvg: number | null; promotedCount: number; unpromotedAvg: number | null; unpromotedCount: number };
}

export function MarketingStatsBlock({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/marketing-posts/stats").then(r => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;
  const maxWeek = Math.max(1, ...stats.weekly.map(w => w.votes));
  const { reach } = stats;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          {stats.total} {stats.total === 1 ? "Post" : "Posts"} · {stats.totalVotes} 👍 · diese Woche {stats.votesThisWeek}
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Tile label="Posts" value={String(stats.total)} sub={`${stats.eventsPromoted} ${stats.eventsPromoted === 1 ? "Event" : "Events"} beworben`} />
            <Tile label="Ø Daumen/Post" value={stats.averageVotes.toFixed(1)} />
            <Tile label="Mit Bild" value={stats.total > 0 ? `${Math.round((stats.withImage / stats.total) * 100)} %` : "–"} sub={`${stats.withImage} von ${stats.total}`} />
            <Tile label="Extern bestätigt" value={stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)} %` : "–"} sub={`${stats.confirmed} von ${stats.total}`} />
          </div>

          {stats.top && (
            <p className="text-[11px] text-gray-400">
              Bester Post: <span className="text-gray-200">{stats.top.caption}</span> <span className="text-gray-600">({stats.top.votes} 👍)</span>
            </p>
          )}

          <div className="space-y-1.5">
            <p className={LABEL}>Daumen pro Woche</p>
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

          {reach.promotedAvg !== null && reach.unpromotedAvg !== null && (
            <div className="space-y-1">
              <p className={LABEL}>Anmeldungen: mit vs. ohne Werbung</p>
              <p className="text-[11px] text-gray-300">
                Events mit Werbe-Post: Ø {reach.promotedAvg.toFixed(1)} ({reach.promotedCount}) · ohne: Ø {reach.unpromotedAvg.toFixed(1)} ({reach.unpromotedCount})
              </p>
              <p className="text-[10px] text-gray-600">Nur eine grobe Orientierung (letzte 90 Tage, alle Marketing Manager) — Spiel, Uhrzeit und Beliebtheit spielen ebenfalls mit.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Kampagnen ────────────────────────────────────────────────────────────────

interface Campaign {
  id: string; title: string; eventId: string;
  event: { id: string; title: string; startAt: string };
  posts: { id: string; kind: string | null; createdAt: string }[];
}
interface EventOption { id: string; title: string; startAt: string }

const STEPS: { kind: "announce" | "reminder" | "today"; label: string; daysBefore: number }[] = [
  { kind: "announce", label: "Ankündigung", daysBefore: 999 },
  { kind: "reminder", label: "Erinnerung", daysBefore: 3 },
  { kind: "today", label: "Heute geht’s los", daysBefore: 0 },
];

/** Ab wann ein Schritt fällig ist: Ankündigung sofort, Erinnerung 3 Tage vorher, "Heute" am Eventtag. */
function dueAt(startAt: string, daysBefore: number): Date {
  const start = new Date(startAt);
  if (daysBefore >= 999) return new Date(0);
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() - daysBefore, 8, 0, 0);
  return day;
}

export function MarketingCampaignsBlock({ onCompose, refreshKey }: {
  onCompose: (eventId: string, prefill: { template: string; campaignId: string }) => void;
  refreshKey?: number;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api<{ campaigns: Campaign[] }>("/api/community-jobs/marketing-posts/campaigns").then(d => setCampaigns(d.campaigns)).catch(() => setCampaigns([]));
  }, [refreshKey, tick]);
  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => setEvents(all.filter(e => new Date(e.startAt).getTime() > Date.now()).sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)))).catch(() => {});
  }, []);

  if (!campaigns) return null;
  const free = events.filter(e => !campaigns.some(c => c.eventId === e.id));

  async function create() {
    setBusy(true);
    try {
      await api("/api/community-jobs/marketing-posts/campaigns", { method: "POST", body: JSON.stringify({ eventId }) });
      setEventId(""); setTick(t => t + 1); toast.success("Kampagne angelegt");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Kampagne löschen? Die Posts bleiben erhalten.")) return;
    try { await api(`/api/community-jobs/marketing-posts/campaigns/${id}`, { method: "DELETE" }); setTick(t => t + 1); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <span className={LABEL}><Megaphone className="inline w-3 h-3 mr-1.5 -mt-0.5" />Kampagnen{campaigns.length > 0 ? ` (${campaigns.length})` : ""}</span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-[11px] text-gray-600">Eine Kampagne plant zu einem Event mehrere Posts: Ankündigung, Erinnerung 3 Tage vorher und „Heute geht’s los“.</p>}
          {campaigns.map(c => {
            const now = Date.now();
            return (
              <div key={c.id} className="rounded-lg bg-white/[0.03] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-200 truncate">{c.event.title} <span className="text-gray-600">· {formatBerlinDate(c.event.startAt)}</span></p>
                  <button onClick={() => remove(c.id)} title="Kampagne löschen" aria-label="Kampagne löschen" className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1">
                  {STEPS.map(step => {
                    const done = c.posts.some(p => p.kind === step.kind);
                    const due = dueAt(c.event.startAt, step.daysBefore);
                    const isDue = due.getTime() <= now;
                    const label = MARKETING_TEMPLATES.find(t => t.id === step.kind)?.label ?? step.label;
                    return (
                      <div key={step.kind} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className={`flex items-center gap-1.5 ${done ? "text-emerald-400" : isDue ? "text-amber-400" : "text-gray-500"}`}>
                          {done ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current inline-block" />}
                          {label}
                          {!done && step.daysBefore < 999 && <span className="text-gray-600">{isDue ? "· jetzt fällig" : `· ab ${formatBerlinDate(due, { day: "2-digit", month: "2-digit" })}`}</span>}
                        </span>
                        {!done && (
                          <Button size="sm" variant="outline" onClick={() => onCompose(c.eventId, { template: step.kind, campaignId: c.id })}>Schreiben</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap items-center gap-1.5">
            <Select size="sm" value={eventId} onChange={e => setEventId(e.target.value)} aria-label="Event für neue Kampagne">
              <option value="">Event für neue Kampagne…</option>
              {free.map(e => <option key={e.id} value={e.id}>{e.title} — {formatBerlinDate(e.startAt)}</option>)}
            </Select>
            <Button size="sm" variant="outline" loading={busy} disabled={!eventId} onClick={create}>Kampagne anlegen</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Werbe-Anfragen von Coaches ───────────────────────────────────────────────

interface PromotionRequestItem {
  id: string; note: string | null; createdAt: string;
  requester: { id: string; username: string | null; name: string | null };
  session: { id: string; title: string; startAt: string; eventId: string | null };
}

/** Coaches bitten um Werbung für ihre Trainings-Termine — "Post schreiben" öffnet das Formular mit dem Trainings-Baustein. */
export function PromotionRequestList({ onWrite }: { onWrite: (r: PromotionRequestItem) => void }) {
  const [items, setItems] = useState<PromotionRequestItem[] | null>(null);

  useEffect(() => {
    fetch("/api/community-jobs/promotion-requests?scope=open").then(r => (r.ok ? r.json() : { requests: [] }))
      .then((d: { requests: PromotionRequestItem[] }) => setItems(d.requests)).catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className={LABEL}>Werbe-Anfragen von Coaches ({items.length})</p>
      {items.map(r => (
        <div key={r.id} className="rounded-lg bg-amber-500/[0.05] border border-amber-500/20 p-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-gray-200">{r.session.title} <span className="text-gray-500">· {formatBerlinDate(r.session.startAt, { day: "2-digit", month: "2-digit" })}</span></p>
            <p className="text-[10px] text-gray-600">von {r.requester.username ?? r.requester.name}{r.note ? ` · ${r.note}` : ""}</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onWrite(r)}>Post schreiben</Button>
        </div>
      ))}
    </div>
  );
}

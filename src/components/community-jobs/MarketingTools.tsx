"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "@/components/icons";
import { Check, Megaphone, Trash2 } from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatBerlinDate } from "@/lib/time";
import { MARKETING_TEMPLATES } from "@/lib/marketing-templates";

/** Marketing-Büro: Auswertung und Kampagnen (Ankündigung → Erinnerung → Heute). */

const LABEL = "text-xs font-bold text-subtle uppercase tracking-[0.06em]";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  // Offene Community-Jobs: Beitrag über dem Tageslimit — veröffentlicht, zählt aber nicht fürs Gehalt.
  if (typeof data?.notice === "string" && data.notice) toast.warning(data.notice);
  return data as T;
}

// ── Auswertung ───────────────────────────────────────────────────────────────

// ── Kampagnen ────────────────────────────────────────────────────────────────

interface Campaign {
  id: string; title: string; eventId: string;
  event: { id: string; title: string; startAt: string };
  posts: { id: string; kind: string | null; createdAt: string; scheduledAt?: string | null }[];
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
        <ChevronDown className={`w-3 h-3 text-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2">
          {campaigns.length === 0 && <p className="text-xs text-subtle">Eine Kampagne plant zu einem Event mehrere Posts: Ankündigung, Erinnerung 3 Tage vorher und „Heute geht’s los“.</p>}
          {campaigns.map(c => {
            const now = Date.now();
            return (
              <div key={c.id} className="rounded-lg bg-surface-2 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-fg/90 truncate">{c.event.title} <span className="text-subtle">· {formatBerlinDate(c.event.startAt)}</span></p>
                  <button onClick={() => remove(c.id)} title="Kampagne löschen" aria-label="Kampagne löschen" className="p-1 text-subtle hover:text-red-400 transition-colors shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-1">
                  {STEPS.map(step => {
                    const done = c.posts.some(p => p.kind === step.kind && !p.scheduledAt);
                    const planned = c.posts.find(p => p.kind === step.kind && p.scheduledAt)?.scheduledAt;
                    const due = dueAt(c.event.startAt, step.daysBefore);
                    const isDue = due.getTime() <= now;
                    const label = MARKETING_TEMPLATES.find(t => t.id === step.kind)?.label ?? step.label;
                    return (
                      <div key={step.kind} className="flex items-center justify-between gap-2 text-xs">
                        <span className={`flex items-center gap-1.5 ${done ? "text-success" : isDue ? "text-coin" : "text-subtle"}`}>
                          {done ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current inline-block" />}
                          {label}
                          {planned && <span className="text-primary-fg">· geplant {formatBerlinDate(planned, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                          {!done && !planned && step.daysBefore < 999 && <span className="text-subtle">{isDue ? "· jetzt fällig" : `· ab ${formatBerlinDate(due, { day: "2-digit", month: "2-digit" })}`}</span>}
                        </span>
                        {!done && !planned && (
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
        <div key={r.id} className="rounded-lg bg-amber-500/[0.05] border border-coin/20 p-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-fg/90">{r.session.title} <span className="text-subtle">· {formatBerlinDate(r.session.startAt, { day: "2-digit", month: "2-digit" })}</span></p>
            <p className="text-xs text-subtle">von {r.requester.username ?? r.requester.name}{r.note ? ` · ${r.note}` : ""}</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onWrite(r)}>Post schreiben</Button>
        </div>
      ))}
    </div>
  );
}

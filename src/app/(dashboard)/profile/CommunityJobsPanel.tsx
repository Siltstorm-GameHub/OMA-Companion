"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Briefcase, Users, Coins, TrendingUp, Clock, ThumbsUp, Send, LogOut, RefreshCw,
  ChevronRight, Loader2, Sparkles, ImagePlus, Newspaper, Megaphone, GraduationCap, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import ImageUploadField from "@/components/ImageUploadField";
import DisputeVotesModal from "@/components/community-jobs/DisputeVotesModal";

/**
 * Community-Jobs-Reiter/-Sektion: eigenständig von der Mancave-Idle-Jobs-`JobsPanel`
 * (siehe Plan-Korrektur "eigener Reiter auf der Profilseite"). Lädt alle Daten
 * selbst per fetch — läuft immer im normalen React-Baum mit vollem Router,
 * kein Bezug zur 3D-Mancave-Szene.
 */

const JOB_ICONS: Record<string, typeof Newspaper> = {
  journalist: Newspaper, fotograf: ImagePlus, marketing_manager: Megaphone,
  coach: GraduationCap, visionaer: Lightbulb,
};

interface CatalogHolder { userId: string; username: string | null; status: string; lastPayoutCoins: number | null }
interface CatalogEntry {
  key: string; label: string; emoji: string; description: string;
  maxSlots: number; filledSlots: number; holders: CatalogHolder[]; waitlistCount: number;
}
interface Membership {
  id: string; jobKey: string; status: string;
  contractStartAt: string; contractEndAt: string;
}
interface Application { id: string; jobKey: string; status: string; appliedAt: string }
interface Overview { catalog: CatalogEntry[]; activeMembership: Membership | null; myApplications: Application[] }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Etwas ist schiefgelaufen");
  return data as T;
}

export default function CommunityJobsPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await api<Overview>("/api/community-jobs");
      setOverview(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte Community-Jobs nicht laden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function apply(jobKey: string) {
    setBusy(true);
    try {
      const result = await api<{ status: string }>("/api/community-jobs/apply", {
        method: "POST", body: JSON.stringify({ jobKey }),
      });
      toast.success(result.status === "WAITLISTED" ? "Auf die Warteliste gesetzt" : "Bewerbung eingereicht");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bewerbung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(applicationId: string) {
    setBusy(true);
    try {
      await api(`/api/community-jobs/applications/${applicationId}/withdraw`, { method: "POST" });
      toast.success("Bewerbung zurückgezogen");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="glass card-shine rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
      </section>
    );
  }
  if (!overview) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <Briefcase className="w-3 h-3" /> Community-Jobs
      </h2>
      {overview.activeMembership ? (
        <OfficeView membership={overview.activeMembership} onChanged={reload} />
      ) : (
        <CatalogView
          catalog={overview.catalog}
          myApplications={overview.myApplications}
          busy={busy}
          onApply={apply}
          onWithdraw={withdraw}
        />
      )}
    </section>
  );
}

// ── Katalog (kein aktiver Job) ────────────────────────────────────────────────

function CatalogView({
  catalog, myApplications, busy, onApply, onWithdraw,
}: {
  catalog: CatalogEntry[]; myApplications: Application[]; busy: boolean;
  onApply: (jobKey: string) => void; onWithdraw: (id: string) => void;
}) {
  return (
    <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
      {catalog.map(job => {
        const Icon = JOB_ICONS[job.key] ?? Briefcase;
        const myApp = myApplications.find(a => a.jobKey === job.key);
        const full = job.filledSlots >= job.maxSlots;
        return (
          <div key={job.key} className="p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{job.emoji} {job.label}</p>
                  <Badge tone={full ? "warning" : "success"}>
                    <Users className="w-2.5 h-2.5" /> {job.filledSlots}/{job.maxSlots}
                  </Badge>
                  {job.waitlistCount > 0 && <Badge tone="info">{job.waitlistCount} auf Warteliste</Badge>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{job.description}</p>
              </div>
            </div>

            {job.holders.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-12">
                {job.holders.map(h => (
                  <span key={h.userId} className="text-[10px] text-gray-500 bg-white/[0.03] rounded-full px-2 py-0.5">
                    {h.username ?? "?"}{h.lastPayoutCoins != null && ` · ${h.lastPayoutCoins} Münzen`}
                  </span>
                ))}
              </div>
            )}

            <div className="pl-12">
              {myApp ? (
                <div className="flex items-center gap-2">
                  <Badge tone="info">{myApp.status === "WAITLISTED" ? "Auf Warteliste" : "Bewerbung offen"}</Badge>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => onWithdraw(myApp.id)}>Zurückziehen</Button>
                </div>
              ) : (
                <Button size="sm" variant={full ? "outline" : "primary"} disabled={busy} icon={<Send className="w-3.5 h-3.5" />}
                  onClick={() => onApply(job.key)}>
                  {full ? "Auf Warteliste bewerben" : "Bewerben"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Büro (aktiver Job) ────────────────────────────────────────────────────────

interface Recommendations {
  events: { eventId: string; title: string; reason: string }[];
  steamSales: { id: number; name: string; discountPercent?: number }[];
  steamReleases: { id: number; name: string }[];
}
interface Payout { id: string; weekStart: string; rawScore: number; tierLabel: string | null; coinsAwarded: number; voteBonusMultiplier: number }
interface WaitlistEntry { id: string; user: { id: string; username: string | null; name: string | null } }

function OfficeView({ membership, onChanged }: { membership: Membership; onChanged: () => void }) {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    api<Recommendations>("/api/community-jobs/recommendations").then(setRecs).catch(() => {});
    api<{ payouts: Payout[] }>("/api/community-jobs/payouts").then(d => setPayouts(d.payouts)).catch(() => {});
    api<{ waitlist: WaitlistEntry[] }>(`/api/community-jobs/${membership.jobKey}/waitlist`).then(d => setWaitlist(d.waitlist)).catch(() => {});
  }, [membership.jobKey]);

  const contractEnd = new Date(membership.contractEndAt);
  const renewOpensAt = new Date(new Date(membership.contractStartAt).setMonth(new Date(membership.contractStartAt).getMonth() + 2));
  const canRenew = new Date() >= renewOpensAt && new Date() <= contractEnd && membership.status === "ACTIVE";
  const Icon = JOB_ICONS[membership.jobKey] ?? Briefcase;
  const latestPayout = payouts[0];

  async function quit() {
    if (!confirm("Job wirklich kündigen?")) return;
    setBusy(true);
    try {
      await api("/api/community-jobs/quit", { method: "POST" });
      toast.success("Job gekündigt");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    setBusy(true);
    try {
      await api("/api/community-jobs/renew", { method: "POST" });
      toast.success("Vertrag verlängert");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verlängerung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function handoff(targetApplicationId: string) {
    if (!confirm("Job wirklich an diesen Bewerber übergeben?")) return;
    setBusy(true);
    try {
      await api("/api/community-jobs/handoff", { method: "POST", body: JSON.stringify({ targetApplicationId }) });
      toast.success("Job übergeben");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Übergabe fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass card-shine rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Büro</p>
            <p className="text-[11px] text-gray-500">
              Vertrag bis {contractEnd.toLocaleDateString("de-DE")}
              {membership.status === "WARNED" && <span className="text-amber-400"> · Verwarnt</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {canRenew && <Button size="sm" variant="accent" disabled={busy} icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={renew}>Verlängern</Button>}
          <Button size="sm" variant="outline" disabled={busy} icon={<LogOut className="w-3.5 h-3.5" />} onClick={quit}>Kündigen</Button>
        </div>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.04] border-b border-white/[0.04]">
        <DashTile icon={<TrendingUp className="w-3.5 h-3.5" />} label="Letzte Woche" value={latestPayout ? `${latestPayout.tierLabel ?? "–"}` : "–"} />
        <DashTile icon={<Coins className="w-3.5 h-3.5" />} label="Zuletzt gezahlt" value={latestPayout ? `${latestPayout.coinsAwarded} Münzen` : "0 Münzen"} />
        <DashTile icon={<Sparkles className="w-3.5 h-3.5" />} label="Bonus" value={latestPayout ? `×${latestPayout.voteBonusMultiplier.toFixed(1)}` : "×1.0"} />
      </div>

      {/* Empfehlungen */}
      {recs && (recs.events.length > 0 || recs.steamSales.length > 0 || recs.steamReleases.length > 0) && (
        <div className="p-4 border-b border-white/[0.04] space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">💡 Empfehlungen</p>
          {recs.events.map(e => (
            <p key={e.eventId} className="text-xs text-gray-400">• {e.title} — <span className="text-amber-400">{e.reason}</span></p>
          ))}
          {recs.steamSales.map(s => (
            <p key={`sale-${s.id}`} className="text-xs text-gray-400">🎮 Sale: {s.name}{s.discountPercent ? ` -${s.discountPercent}%` : ""}</p>
          ))}
          {recs.steamReleases.map(s => (
            <p key={`new-${s.id}`} className="text-xs text-gray-400">🆕 Neu: {s.name}</p>
          ))}
        </div>
      )}

      {/* Werkzeuge */}
      <div className="p-4 border-b border-white/[0.04] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">🛠 Werkzeuge</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>Neuer Beitrag</Button>
        </div>
        <JobToolContent jobKey={membership.jobKey} />
      </div>

      {/* Warteliste */}
      {waitlist.length > 0 && (
        <div className="p-4 border-b border-white/[0.04] space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">⚠️ {waitlist.length} Bewerber warten</p>
          {waitlist.map(w => (
            <div key={w.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{w.user.username ?? w.user.name}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => handoff(w.id)}>Job übergeben</Button>
            </div>
          ))}
        </div>
      )}

      {/* Gehaltshistorie */}
      {payouts.length > 0 && (
        <div className="p-4 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">💰 Gehaltshistorie</p>
          {payouts.map(p => (
            <div key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{new Date(p.weekStart).toLocaleDateString("de-DE")}</span>
              <span className="text-gray-400">{p.tierLabel ?? "Keine Bewertung"}</span>
              <span className="text-amber-400 font-medium">{p.coinsAwarded} Münzen</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Neuer Beitrag" size="md">
        <CreateContentForm jobKey={membership.jobKey} onDone={() => { setCreateOpen(false); onChanged(); }} />
      </Modal>
    </div>
  );
}

function DashTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-teal-400 mb-1">{icon}</div>
      <p className="text-xs font-semibold text-white truncate">{value}</p>
      <p className="text-[9px] text-gray-600">{label}</p>
    </div>
  );
}

// ── Job-spezifische Werkzeuge ─────────────────────────────────────────────────

function JobToolContent({ jobKey }: { jobKey: string }) {
  if (jobKey === "journalist") return <ReportList />;
  if (jobKey === "fotograf") return <AssetList />;
  if (jobKey === "marketing_manager") return <MarketingPostList />;
  if (jobKey === "coach") return <><TrainingSessionList /><CoachRatingsReceived /></>;
  if (jobKey === "visionaer") return <IdeaList />;
  return null;
}

function VoteRow({ upvotes, votedByMe }: { upvotes: number; votedByMe: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${votedByMe ? "text-teal-400" : "text-gray-500"}`}>
      <ThumbsUp className="w-3 h-3" /> {upvotes}
    </span>
  );
}

/** Inline Bearbeiten/Löschen-Leiste für eigene Beiträge — gemeinsam für alle vier Listen unten. */
function EditDeleteBar({
  onEdit, onDelete,
}: { onEdit: () => void; onDelete: () => void }) {
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <button onClick={onEdit} className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors">Bearbeiten</button>
      <button onClick={onDelete} className="text-[10px] text-gray-600 hover:text-red-400 transition-colors">Löschen</button>
    </span>
  );
}

function ReportList() {
  const [items, setItems] = useState<{ id: string; title: string; bodyMarkdown?: string; publishedAt: string; _count: { votes: number; contributions: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function reload() {
    api<{ reports: typeof items }>("/api/community-jobs/reports").then(d => setItems(d.reports)).catch(() => {});
  }
  useEffect(reload, []);

  function startEdit(r: (typeof items)[number]) {
    setEditing(r.id); setTitle(r.title); setBody(r.bodyMarkdown ?? "");
  }
  async function save(id: string) {
    try {
      await api(`/api/community-jobs/reports/${id}`, { method: "PATCH", body: JSON.stringify({ title, bodyMarkdown: body }) });
      toast.success("Gespeichert");
      setEditing(null); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function remove(id: string) {
    if (!confirm("Bericht wirklich löschen?")) return;
    try {
      await api(`/api/community-jobs/reports/${id}`, { method: "DELETE" });
      toast.success("Gelöscht"); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items.length) return <p className="text-xs text-gray-600">Noch keine Berichte veröffentlicht.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(r => editing === r.id ? (
        <div key={r.id} className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button size="sm" onClick={() => save(r.id)}>Speichern</Button>
          </div>
        </div>
      ) : (
        <div key={r.id} className="flex items-center justify-between text-xs">
          <span className="text-gray-300 truncate">{r.title}</span>
          <span className="flex items-center gap-2 shrink-0 ml-2">
            <VoteRow upvotes={r._count.votes} votedByMe={false} />
            <span className="text-gray-600">{r._count.contributions} Ergänzungen</span>
            <EditDeleteBar onEdit={() => startEdit(r)} onDelete={() => remove(r.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

function AssetList() {
  const [items, setItems] = useState<{ id: string; caption: string | null; type: string; _count: { votes: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  function reload() {
    api<{ assets: typeof items }>("/api/community-jobs/media?mine=1").then(d => setItems(d.assets)).catch(() => {});
  }
  useEffect(reload, []);

  async function save(id: string) {
    try {
      await api(`/api/community-jobs/media/${id}`, { method: "PATCH", body: JSON.stringify({ caption }) });
      toast.success("Gespeichert"); setEditing(null); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function remove(id: string) {
    if (!confirm("Asset wirklich löschen?")) return;
    try {
      await api(`/api/community-jobs/media/${id}`, { method: "DELETE" });
      toast.success("Gelöscht"); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items.length) return <p className="text-xs text-gray-600">Noch keine Assets hochgeladen.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(a => editing === a.id ? (
        <div key={a.id} className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg p-2">
          <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bildunterschrift"
            className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
          <Button size="sm" onClick={() => save(a.id)}>Speichern</Button>
        </div>
      ) : (
        <div key={a.id} className="flex items-center justify-between text-xs">
          <span className="text-gray-300 truncate">{a.caption ?? a.type}</span>
          <span className="flex items-center gap-2 shrink-0">
            <VoteRow upvotes={a._count.votes} votedByMe={false} />
            <EditDeleteBar onEdit={() => { setEditing(a.id); setCaption(a.caption ?? ""); }} onDelete={() => remove(a.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

function MarketingPostList() {
  const [items, setItems] = useState<{ id: string; caption: string; _count: { votes: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  function reload() {
    api<{ posts: typeof items }>("/api/community-jobs/marketing-posts").then(d => setItems(d.posts)).catch(() => {});
  }
  useEffect(reload, []);

  async function save(id: string) {
    try {
      await api(`/api/community-jobs/marketing-posts/${id}`, { method: "PATCH", body: JSON.stringify({ caption }) });
      toast.success("Gespeichert"); setEditing(null); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function remove(id: string) {
    if (!confirm("Post wirklich löschen?")) return;
    try {
      await api(`/api/community-jobs/marketing-posts/${id}`, { method: "DELETE" });
      toast.success("Gelöscht"); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items.length) return <p className="text-xs text-gray-600">Noch keine Werbe-Posts erstellt.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(p => editing === p.id ? (
        <div key={p.id} className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
          <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button size="sm" onClick={() => save(p.id)}>Speichern</Button>
          </div>
        </div>
      ) : (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span className="text-gray-300 truncate">{p.caption}</span>
          <span className="flex items-center gap-2 shrink-0">
            <VoteRow upvotes={p._count.votes} votedByMe={false} />
            <EditDeleteBar onEdit={() => { setEditing(p.id); setCaption(p.caption); }} onDelete={() => remove(p.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

function TrainingSessionList() {
  const [items, setItems] = useState<{ id: string; title: string; startAt: string; coach: { id: string }; _count: { signups: number } }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function reload() {
    api<{ sessions: typeof items }>("/api/community-jobs/coach/training-sessions").then(d => setItems(d.sessions)).catch(() => {});
  }
  useEffect(reload, []);

  async function signup(id: string) {
    setBusy(id);
    try {
      await api(`/api/community-jobs/coach/training-sessions/${id}/signup`, { method: "POST" });
      toast.success("Angemeldet");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <p className="text-xs text-gray-600">Keine anstehenden Trainings-Termine.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(s => (
        <div key={s.id} className="flex items-center justify-between text-xs gap-2">
          <span className="text-gray-300 truncate">{s.title} — {new Date(s.startAt).toLocaleString("de-DE")}</span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="text-gray-600">{s._count.signups} angemeldet</span>
            <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => signup(s.id)}>Anmelden</Button>
          </span>
        </div>
      ))}
    </div>
  );
}

function CoachRatingsReceived() {
  const [items, setItems] = useState<{ id: string; stars: number; reason: string; disputed: boolean; rater: { username: string | null; name: string | null } }[] | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  useEffect(() => {
    api<{ ratings: typeof items }>("/api/community-jobs/coach/ratings").then(d => setItems(d.ratings)).catch(() => {});
  }, []);

  if (!items) return null;
  return (
    <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Meine Bewertungen</p>
        {items.length > 0 && <Button size="sm" variant="ghost" onClick={() => setDisputeOpen(true)}>Ansehen/Anfechten</Button>}
      </div>
      {items.length === 0 && <p className="text-xs text-gray-600">Noch keine Bewertungen erhalten.</p>}
      <DisputeVotesModal open={disputeOpen} onClose={() => setDisputeOpen(false)} kind="coachRating"
        fetchUrl="/api/community-jobs/coach/ratings" listKey="ratings" voterField="rater" />
    </div>
  );
}

function IdeaList() {
  const [items, setItems] = useState<{ id: string; title: string; description?: string; status: string; _count: { votes: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function reload() {
    api<{ ideas: typeof items }>("/api/community-jobs/ideas?mine=1").then(d => setItems(d.ideas)).catch(() => {});
  }
  useEffect(reload, []);

  async function save(id: string) {
    try {
      await api(`/api/community-jobs/ideas/${id}`, { method: "PATCH", body: JSON.stringify({ title, description }) });
      toast.success("Gespeichert"); setEditing(null); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function remove(id: string) {
    if (!confirm("Idee wirklich löschen?")) return;
    try {
      await api(`/api/community-jobs/ideas/${id}`, { method: "DELETE" });
      toast.success("Gelöscht"); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function close(id: string) {
    try {
      await api(`/api/community-jobs/ideas/${id}/close`, { method: "POST" });
      toast.success("Abstimmung beendet"); reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items.length) return <p className="text-xs text-gray-600">Noch keine Ideen eingereicht.</p>;
  return (
    <div className="space-y-1.5">
      {items.map(i => editing === i.id ? (
        <div key={i.id} className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white resize-none" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button size="sm" onClick={() => save(i.id)}>Speichern</Button>
          </div>
        </div>
      ) : (
        <div key={i.id} className="flex items-center justify-between text-xs">
          <span className="text-gray-300 truncate">{i.title}</span>
          <span className="flex items-center gap-2 shrink-0 ml-2">
            {i.status === "CLOSED"
              ? <Badge tone="neutral">Beendet</Badge>
              : <button onClick={() => close(i.id)} className="text-[10px] text-gray-600 hover:text-amber-400 transition-colors">Beenden</button>}
            <VoteRow upvotes={i._count.votes} votedByMe={false} />
            <EditDeleteBar onEdit={() => { setEditing(i.id); setTitle(i.title); setDescription(i.description ?? ""); }} onDelete={() => remove(i.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Erstellungs-Formulare ─────────────────────────────────────────────────────

function CreateContentForm({ jobKey, onDone }: { jobKey: string; onDone: () => void }) {
  if (jobKey === "fotograf") return <UploadAssetForm onDone={onDone} />;
  if (jobKey === "marketing_manager") return <CreateMarketingPostForm onDone={onDone} />;
  return <TextContentForm jobKey={jobKey} onDone={onDone} />;
}

/** Journalist (Bericht), Coach (Trainings-Termin), Visionär (Idee) — alle drei sind Titel + Text. */
function TextContentForm({ jobKey, onDone }: { jobKey: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (jobKey === "journalist") {
        await api("/api/community-jobs/reports", { method: "POST", body: JSON.stringify({ title, bodyMarkdown: body }) });
      } else if (jobKey === "coach") {
        await api("/api/community-jobs/coach/training-sessions", {
          method: "POST", body: JSON.stringify({ title, description: body, startAt: new Date(Date.now() + 86_400_000).toISOString() }),
        });
      } else if (jobKey === "visionaer") {
        await api("/api/community-jobs/ideas", { method: "POST", body: JSON.stringify({ title, description: body }) });
      }
      toast.success("Veröffentlicht");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Text" rows={5}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      {jobKey === "coach" && <p className="text-[11px] text-gray-600">Termin wird standardmäßig für morgen angelegt — Zeitpunkt lässt sich später anpassen.</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!title.trim() || !body.trim()} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>
          Veröffentlichen
        </Button>
      </div>
    </div>
  );
}

const ASSET_TYPE_OPTIONS = [
  { value: "CLIP", label: "Highlight-Clip" },
  { value: "COLLAGE", label: "Collage" },
  { value: "SCREENSHOT", label: "Screenshot" },
  { value: "BANNER", label: "Event-Banner" },
  { value: "GRAPHIC", label: "Grafik" },
];

function UploadAssetForm({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("SCREENSHOT");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/media", { method: "POST", body: JSON.stringify({ type, url, caption: caption || undefined }) });
      toast.success("Hochgeladen");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Select value={type} onChange={e => setType(e.target.value)} className="w-full">
        {ASSET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      <ImageUploadField value={url} onChange={setUrl} kind="community-job-asset" label="Datei" />
      <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bildunterschrift (optional)"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!url} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Hochladen</Button>
      </div>
    </div>
  );
}

interface EventOption { id: string; title: string; startAt: string }

function CreateMarketingPostForm({ onDone }: { onDone: () => void }) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [caption, setCaption] = useState("");
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<{ id: string; caption: string | null; url: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => {
      const upcoming = all.filter(e => new Date(e.startAt).getTime() > Date.now());
      setEvents(upcoming);
      if (upcoming[0]) setEventId(upcoming[0].id);
    }).catch(() => {});
    api<{ assets: typeof assets }>("/api/community-jobs/media").then(d => setAssets(d.assets)).catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/marketing-posts", {
        method: "POST", body: JSON.stringify({ eventId, caption, assetId: assetId || undefined }),
      });
      toast.success("Veröffentlicht");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (events.length === 0) {
    return <p className="text-xs text-gray-500">Keine bevorstehenden Events gefunden — ohne Event ist kein Werbe-Post möglich.</p>;
  }

  return (
    <div className="space-y-3">
      <Select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full">
        {events.map(e => <option key={e.id} value={e.id}>{e.title} — {new Date(e.startAt).toLocaleDateString("de-DE")}</option>)}
      </Select>
      {assets.length > 0 && (
        <Select value={assetId} onChange={e => setAssetId(e.target.value)} className="w-full">
          <option value="">Kein Bild</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.caption ?? a.id}</option>)}
        </Select>
      )}
      <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Werbetext" rows={4}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!eventId || !caption.trim()} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
      </div>
    </div>
  );
}

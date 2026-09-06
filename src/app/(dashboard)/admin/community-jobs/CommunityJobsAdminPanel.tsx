"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, AlertTriangle, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { PayoutTier, VoteBonusConfig } from "@/lib/community-job-config";

interface JobRef { key: string; label: string; emoji: string }
interface AdminApplication { id: string; jobKey: string; status: string; message: string | null; appliedAt: string; user: { id: string; username: string | null; name: string | null } }
interface AdminMember { id: string; jobKey: string; status: string; contractEndAt: string; user: { id: string; username: string | null; name: string | null } }
interface AdminDispute { kind: string; id: string; reason: string | null; voter: { username: string | null; name: string | null }; context: string; ownerId: string }
interface BoardEntry { kind: string; id: string; caption?: string; author: { username: string | null; name: string | null }; adminConfirmedPosted?: boolean }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export default function CommunityJobsAdminPanel({
  jobs, effectiveSlots, channelOverrides, voteBonus,
}: {
  jobs: JobRef[]; effectiveSlots: Record<string, number>; channelOverrides: Record<string, string>; voteBonus: VoteBonusConfig;
}) {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [marketingPosts, setMarketingPosts] = useState<BoardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      const [appsData, membersData, disputesData, boardData] = await Promise.all([
        api<{ applications: AdminApplication[] }>("/api/admin/community-jobs/applications"),
        api<{ members: AdminMember[] }>("/api/admin/community-jobs/members"),
        api<{ disputes: AdminDispute[] }>("/api/admin/community-jobs/disputes"),
        api<{ feed: BoardEntry[] }>("/api/community-board?limit=50"),
      ]);
      setApplications(appsData.applications);
      setMembers(membersData.members);
      setDisputes(disputesData.disputes);
      setMarketingPosts(boardData.feed.filter(e => e.kind === "marketing_post"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte Daten nicht laden");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  const jobLabel = (key: string) => jobs.find(j => j.key === key)?.label ?? key;

  async function decide(id: string, decision: "APPROVE" | "REJECT") {
    try {
      await api(`/api/admin/community-jobs/applications/${id}`, { method: "PATCH", body: JSON.stringify({ decision }) });
      toast.success(decision === "APPROVE" ? "Genehmigt" : "Abgelehnt");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  async function revoke(id: string) {
    const reason = prompt("Grund für den Entzug:");
    if (!reason) return;
    try {
      await api(`/api/admin/community-jobs/members/${id}`, { method: "PATCH", body: JSON.stringify({ action: "REVOKE", reason }) });
      toast.success("Job entzogen");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  async function toggleConfirmedPosted(id: string, confirmed: boolean) {
    try {
      await api(`/api/admin/community-jobs/marketing-posts/${id}`, { method: "PATCH", body: JSON.stringify({ confirmed }) });
      toast.success(confirmed ? "Als gepostet bestätigt" : "Bestätigung zurückgenommen");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  async function resolveDispute(kind: string, id: string, resolution: "UPHELD" | "OVERTURNED") {
    try {
      await api("/api/admin/community-jobs/disputes", { method: "PATCH", body: JSON.stringify({ kind, voteId: id, resolution }) });
      toast.success(resolution === "UPHELD" ? "Bewertung bestätigt" : "Bewertung gestrichen");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;

  const pending = applications.filter(a => a.status === "PENDING");
  const waitlisted = applications.filter(a => a.status === "WAITLISTED");

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Offene Bewerbungen ({pending.length})</h2>
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {pending.length === 0 && <p className="p-4 text-xs text-gray-600">Keine offenen Bewerbungen.</p>}
          {pending.map(a => (
            <div key={a.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white">{a.user.username ?? a.user.name} → {jobLabel(a.jobKey)}</p>
                {a.message && <p className="text-[11px] text-gray-500 truncate">{a.message}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="primary" icon={<Check className="w-3.5 h-3.5" />} onClick={() => decide(a.id, "APPROVE")}>Genehmigen</Button>
                <Button size="sm" variant="outline" icon={<X className="w-3.5 h-3.5" />} onClick={() => decide(a.id, "REJECT")}>Ablehnen</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {waitlisted.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Warteliste ({waitlisted.length})</h2>
          <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
            {waitlisted.map(a => (
              <div key={a.id} className="p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-gray-300">{a.user.username ?? a.user.name} → {jobLabel(a.jobKey)}</p>
                <Badge tone="info">seit {new Date(a.appliedAt).toLocaleDateString("de-DE")}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Aktive Mitglieder ({members.length})</h2>
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {members.length === 0 && <p className="p-4 text-xs text-gray-600">Keine aktiven Mitglieder.</p>}
          {members.map(m => (
            <div key={m.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white">{m.user.username ?? m.user.name} — {jobLabel(m.jobKey)}</p>
                <p className="text-[11px] text-gray-500">
                  {m.status === "WARNED" && <span className="text-amber-400">Verwarnt · </span>}
                  Vertrag bis {new Date(m.contractEndAt).toLocaleDateString("de-DE")}
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => revoke(m.id)}>Entziehen</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-amber-500" /> Anfechtungen ({disputes.length})
        </h2>
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {disputes.length === 0 && <p className="p-4 text-xs text-gray-600">Keine offenen Anfechtungen.</p>}
          {disputes.map(d => (
            <div key={`${d.kind}-${d.id}`} className="p-3 space-y-1.5">
              <p className="text-xs text-white">{d.context}</p>
              <p className="text-[11px] text-gray-500">Bewerter: {d.voter.username ?? d.voter.name} — Grund: {d.reason ?? "–"}</p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => resolveDispute(d.kind, d.id, "UPHELD")}>Bewertung bestätigen</Button>
                <Button size="sm" variant="danger" onClick={() => resolveDispute(d.kind, d.id, "OVERTURNED")}>Bewertung streichen</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {marketingPosts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Marketing-Posts bestätigen</h2>
          <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
            {marketingPosts.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 truncate">{p.caption}</p>
                  <p className="text-[11px] text-gray-600">von {p.author.username ?? p.author.name}</p>
                </div>
                <Button size="sm" variant={p.adminConfirmedPosted ? "outline" : "primary"}
                  onClick={() => toggleConfirmedPosted(p.id, !p.adminConfirmedPosted)}>
                  {p.adminConfirmedPosted ? "Bestätigung zurücknehmen" : "Als gepostet bestätigen"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <JobSettingsSection jobs={jobs} effectiveSlots={effectiveSlots} channelOverrides={channelOverrides} />
      <VoteBonusSection initial={voteBonus} />
    </div>
  );
}

function JobSettingsSection({
  jobs, effectiveSlots, channelOverrides,
}: { jobs: JobRef[]; effectiveSlots: Record<string, number>; channelOverrides: Record<string, string> }) {
  const [slots, setSlots] = useState(effectiveSlots);
  const [channels, setChannels] = useState(channelOverrides);
  const [selectedJob, setSelectedJob] = useState(jobs[0]?.key ?? "");
  const [tiers, setTiers] = useState<PayoutTier[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedJob) return;
    api<{ tiers: PayoutTier[] }>(`/api/admin/community-jobs/payout-tiers?jobKey=${selectedJob}`).then(d => setTiers(d.tiers)).catch(() => {});
  }, [selectedJob]);

  async function saveSlots(jobKey: string) {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/slots", { method: "PATCH", body: JSON.stringify({ jobKey, maxSlots: slots[jobKey] ?? null }) });
      toast.success("Slot-Zahl gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  async function saveChannel(jobKey: string) {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/announcement-channels", { method: "PATCH", body: JSON.stringify({ jobKey, channelId: channels[jobKey] || null }) });
      toast.success("Discord-Kanal gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  async function saveTiers() {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/payout-tiers", { method: "PATCH", body: JSON.stringify({ jobKey: selectedJob, tiers }) });
      toast.success("Gehaltsstufen gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Job-Einstellungen</h2>

      <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {jobs.map(job => (
          <div key={job.key} className="p-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-white w-40 shrink-0">{job.emoji} {job.label}</span>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
              Slots
              <input type="number" min={0} value={slots[job.key] ?? 0}
                onChange={e => setSlots(s => ({ ...s, [job.key]: Number(e.target.value) }))}
                className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            </label>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => saveSlots(job.key)}>Speichern</Button>
            <label className="flex items-center gap-1.5 text-[11px] text-gray-500 flex-1 min-w-[180px]">
              Discord-Kanal-ID
              <input type="text" value={channels[job.key] ?? ""} placeholder="Fallback: Standard-Kanal"
                onChange={e => setChannels(c => ({ ...c, [job.key]: e.target.value }))}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-700" />
            </label>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => saveChannel(job.key)}>Speichern</Button>
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500">Gehaltsstufen für</span>
          <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white">
            {jobs.map(j => <option key={j.key} value={j.key}>{j.emoji} {j.label}</option>)}
          </select>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t.label} placeholder="Label" onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
              className="w-28 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            <label className="flex items-center gap-1 text-[10px] text-gray-600">
              ab Score
              <input type="number" value={t.minScore} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, minScore: Number(e.target.value) } : x))}
                className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            </label>
            <label className="flex items-center gap-1 text-[10px] text-gray-600">
              Münzen
              <input type="number" value={t.coinsAwarded} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, coinsAwarded: Number(e.target.value) } : x))}
                className="w-20 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            </label>
            <button onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setTiers(ts => [...ts, { label: "Neue Stufe", minScore: 0, coinsAwarded: 0 }])}>Stufe hinzufügen</Button>
          <Button size="sm" disabled={busy} onClick={saveTiers}>Speichern</Button>
        </div>
      </div>
    </section>
  );
}

function VoteBonusSection({ initial }: { initial: VoteBonusConfig }) {
  const [config, setConfig] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/vote-bonus", { method: "PATCH", body: JSON.stringify(config) });
      toast.success("Aktivitäts-Bonus gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Aktivitäts-Bonus (jobübergreifend)</h2>
      <div className="glass rounded-xl p-4 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
          Bewertungen für vollen Bonus
          <input type="number" min={1} value={config.voteBonusThreshold}
            onChange={e => setConfig(c => ({ ...c, voteBonusThreshold: Number(e.target.value) }))}
            className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-gray-500">
          Max. Multiplikator
          <input type="number" min={1} step={0.1} value={config.voteBonusMaxMultiplier}
            onChange={e => setConfig(c => ({ ...c, voteBonusMaxMultiplier: Number(e.target.value) }))}
            className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
        </label>
        <Button size="sm" disabled={busy} onClick={save}>Speichern</Button>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, AlertTriangle, Plus, Trash2, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import type { PayoutTier, VoteBonusTier } from "@/lib/community-job-config";

interface JobRef { key: string; label: string; emoji: string }
interface AdminApplication { id: string; jobKey: string; status: string; message: string | null; appliedAt: string; user: { id: string; username: string | null; name: string | null } }
interface AdminMember { id: string; jobKey: string; status: string; contractEndAt: string; user: { id: string; username: string | null; name: string | null } }
interface AdminDispute { kind: string; id: string; reason: string | null; voter: { username: string | null; name: string | null }; context: string; ownerId: string }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export default function CommunityJobsAdminPanel({
  jobs, effectiveSlots, channelOverrides, voteBonus, testModeEnabled,
}: {
  jobs: JobRef[]; effectiveSlots: Record<string, number>; channelOverrides: Record<string, string>;
  voteBonus: VoteBonusTier[]; testModeEnabled: boolean;
}) {
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      const [appsData, membersData, disputesData] = await Promise.all([
        api<{ applications: AdminApplication[] }>("/api/admin/community-jobs/applications"),
        api<{ members: AdminMember[] }>("/api/admin/community-jobs/members"),
        api<{ disputes: AdminDispute[] }>("/api/admin/community-jobs/disputes"),
      ]);
      setApplications(appsData.applications);
      setMembers(membersData.members);
      setDisputes(disputesData.disputes);
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

  async function reassign(memberId: string, targetApplicationId: string) {
    try {
      await api(`/api/admin/community-jobs/members/${memberId}`, {
        method: "PATCH", body: JSON.stringify({ action: "REASSIGN", targetApplicationId }),
      });
      toast.success("Job übergeben");
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
      <TestModeSection initial={testModeEnabled} />

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
            <MemberRow key={m.id} member={m} jobLabel={jobLabel(m.jobKey)}
              waitlistForJob={waitlisted.filter(a => a.jobKey === m.jobKey)}
              onRevoke={() => revoke(m.id)} onReassign={targetApplicationId => reassign(m.id, targetApplicationId)} />
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
  const [discordChannels, setDiscordChannels] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [selectedJob, setSelectedJob] = useState(jobs[0]?.key ?? "");
  const [tiers, setTiers] = useState<PayoutTier[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedJob) return;
    api<{ tiers: PayoutTier[] }>(`/api/admin/community-jobs/payout-tiers?jobKey=${selectedJob}`).then(d => setTiers(d.tiers)).catch(() => {});
  }, [selectedJob]);

  useEffect(() => {
    api<{ channels: typeof discordChannels }>("/api/community-jobs/discord-channels").then(d => setDiscordChannels(d.channels)).catch(() => {});
  }, []);

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
              Discord-Kanal
              {discordChannels.length > 0 ? (
                <Select size="sm" value={channels[job.key] ?? ""} onChange={e => setChannels(c => ({ ...c, [job.key]: e.target.value }))} className="flex-1">
                  <option value="">Fallback: Standard-Kanal</option>
                  {discordChannels.map(c => <option key={c.id} value={c.id}>{c.category ? `${c.category} / ` : ""}#{c.name}</option>)}
                </Select>
              ) : (
                <input type="text" value={channels[job.key] ?? ""} placeholder="Kanal-ID (Bot offline/ohne Rechte?)"
                  onChange={e => setChannels(c => ({ ...c, [job.key]: e.target.value }))}
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-700" />
              )}
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

function VoteBonusSection({ initial }: { initial: VoteBonusTier[] }) {
  const [tiers, setTiers] = useState<VoteBonusTier[]>(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/vote-bonus", { method: "PATCH", body: JSON.stringify({ tiers }) });
      toast.success("Aktivitäts-Bonus gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Aktivitäts-Bonus (jobübergreifend)</h2>
      <p className="text-[11px] text-gray-600">
        Gestaffelter Multiplikator auf das Wochengehalt, abhängig davon, wie viele fremde Beiträge der Job-Inhaber diese Woche selbst bewertet hat.
        Der Multiplikator kann auch unter 1× fallen (Abzug bei Nicht-Mitmachen) und ist nach oben auf 2× gedeckelt.
      </p>
      <div className="glass rounded-xl p-4 space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t.label} placeholder="Label" onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
              className="w-32 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            <label className="flex items-center gap-1 text-[10px] text-gray-600">
              ab Bewertungen
              <input type="number" min={0} value={t.minVotes} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, minVotes: Number(e.target.value) } : x))}
                className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            </label>
            <label className="flex items-center gap-1 text-[10px] text-gray-600">
              Multiplikator
              <input type="number" step={0.1} value={t.multiplier} onChange={e => setTiers(ts => ts.map((x, j) => j === i ? { ...x, multiplier: Number(e.target.value) } : x))}
                className="w-16 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            </label>
            <button onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setTiers(ts => [...ts, { label: "Neue Stufe", minVotes: 0, multiplier: 1 }])}>Stufe hinzufügen</Button>
          <Button size="sm" disabled={busy} onClick={save}>Speichern</Button>
        </div>
      </div>
    </section>
  );
}

function MemberRow({
  member, jobLabel, waitlistForJob, onRevoke, onReassign,
}: {
  member: AdminMember; jobLabel: string; waitlistForJob: AdminApplication[];
  onRevoke: () => void; onReassign: (targetApplicationId: string) => void;
}) {
  const [reassigning, setReassigning] = useState(false);
  const [target, setTarget] = useState(waitlistForJob[0]?.id ?? "");

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white">{member.user.username ?? member.user.name} — {jobLabel}</p>
          <p className="text-[11px] text-gray-500">
            {member.status === "WARNED" && <span className="text-amber-400">Verwarnt · </span>}
            Vertrag bis {new Date(member.contractEndAt).toLocaleDateString("de-DE")}
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {waitlistForJob.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setReassigning(v => !v)}>Übergeben</Button>
          )}
          <Button size="sm" variant="danger" onClick={onRevoke}>Entziehen</Button>
        </div>
      </div>
      {reassigning && (
        <div className="flex items-center gap-2 pl-1">
          <Select size="sm" value={target} onChange={e => setTarget(e.target.value)}>
            {waitlistForJob.map(a => <option key={a.id} value={a.id}>{a.user.username ?? a.user.name}</option>)}
          </Select>
          <Button size="sm" onClick={() => { onReassign(target); setReassigning(false); }}>Bestätigen</Button>
          <Button size="sm" variant="ghost" onClick={() => setReassigning(false)}>Abbrechen</Button>
        </div>
      )}
    </div>
  );
}

function TestModeSection({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/test-mode", { method: "PATCH", body: JSON.stringify({ enabled: next }) });
      setEnabled(next);
      toast.success(next ? "Testmodus aktiviert" : "Testmodus deaktiviert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`rounded-xl p-4 flex items-center justify-between gap-3 border ${enabled ? "bg-amber-500/10 border-amber-500/30" : "glass border-white/[0.06]"}`}>
      <div className="flex items-center gap-2.5">
        <FlaskConical className={`w-4 h-4 ${enabled ? "text-amber-400" : "text-gray-500"}`} />
        <div>
          <p className="text-xs font-semibold text-white">Admin-Testmodus</p>
          <p className="text-[11px] text-gray-500">Admins können Community-Jobs ohne Sperrfrist und ohne Rücksicht auf freie Slots wechseln, um alle Jobs durchzutesten.</p>
        </div>
      </div>
      <Button size="sm" variant={enabled ? "danger" : "primary"} disabled={busy} onClick={toggle}>
        {enabled ? "Deaktivieren" : "Aktivieren"}
      </Button>
    </section>
  );
}

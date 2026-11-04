"use client";
import JobIcon from "@/components/JobIcon";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Plus, Trash2, Loader2, Search } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import type { PayoutTier, VoteBonusTier } from "@/lib/community-job-config";
import { levelTitle } from "@/lib/job-badges";
import { formatBerlinDate } from "@/lib/time";

interface JobRef { key: string; label: string; emoji: string }
interface AdminDispute { kind: string; id: string; reason: string | null; voter: { username: string | null; name: string | null }; context: string; ownerId: string }
interface ReputationUser {
  id: string; username: string | null; name: string | null;
  reputationLevel: number; reputationPeakLevel: number; reputationPoints: number; reputationOverrideUntil: string | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

/**
 * Verwaltung der offenen Community-Jobs: Anfechtungen, Tageslimit, Ansehen und Job-Einstellungen.
 * Bewerbungen, Slots, Mitglieder und Verträge gibt es nicht mehr — jeder User darf alle Jobs ausüben.
 */
export default function CommunityJobsAdminPanel({
  jobs, channelOverrides, voteBonus, dailyLimit,
}: {
  jobs: JobRef[]; channelOverrides: Record<string, string>; voteBonus: VoteBonusTier[]; dailyLimit: number;
}) {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try {
      const disputesData = await api<{ disputes: AdminDispute[] }>("/api/admin/community-jobs/disputes");
      setDisputes(disputesData.disputes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte Daten nicht laden");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

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

  return (
    <div className="space-y-8">
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

      <DailyLimitSection initial={dailyLimit} />
      <ReputationSection />
      <JobSettingsSection jobs={jobs} channelOverrides={channelOverrides} />
      <VoteBonusSection initial={voteBonus} />
    </div>
  );
}

function JobSettingsSection({
  jobs, channelOverrides,
}: { jobs: JobRef[]; channelOverrides: Record<string, string> }) {
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
            <span className="text-xs text-white w-40 shrink-0"><JobIcon jobKey={job.key} className="w-4 h-4 mr-1.5 align-text-bottom" />{job.label}</span>
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
        Gestaffelter Multiplikator auf das Wochengehalt jedes Jobs, abhängig davon, wie viele fremde Beiträge der User diese Woche selbst bewertet hat.
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

function DailyLimitSection({ initial }: { initial: number }) {
  const [limit, setLimit] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/community-jobs/daily-limit", { method: "PATCH", body: JSON.stringify({ limit }) });
      toast.success("Tageslimit gespeichert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Tageslimit</h2>
      <div className="glass rounded-xl p-4 space-y-2">
        <p className="text-[11px] text-gray-500">
          So viele Beiträge pro Tag (Berliner Zeit, über alle Jobs zusammen) zählen fürs Gehalt. Weitere Beiträge
          werden veröffentlicht, Stimmen darauf zählen aber nicht. Ein Mehrfach-Upload oder eine Termin-Serie zählt als ein Beitrag.
        </p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={50} value={limit} onChange={e => setLimit(Number(e.target.value))}
            aria-label="Gezählte Beiträge pro Tag"
            className="w-20 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
          <span className="text-[11px] text-gray-500">Beiträge pro Tag</span>
          <Button size="sm" disabled={busy || !Number.isInteger(limit) || limit < 0 || limit > 50} onClick={save}>Speichern</Button>
        </div>
      </div>
    </section>
  );
}

function ReputationSection() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ReputationUser[] | null>(null);

  async function load(q: string) {
    try {
      const d = await api<{ users: ReputationUser[] }>(`/api/admin/community-jobs/reputation${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setUsers(d.users);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Konnte Ansehen nicht laden");
    }
  }
  useEffect(() => { load(""); }, []);

  async function setLevel(u: ReputationUser) {
    const level = prompt(`Neue Ansehens-Stufe für ${u.username ?? u.name ?? "User"} (1 = Bronze … 4 = Platin). Sie bleibt 28 Tage unverändert:`);
    if (!level) return;
    const reason = prompt("Grund (nur fürs Protokoll):");
    if (!reason?.trim()) return;
    try {
      await api("/api/admin/community-jobs/reputation", { method: "PATCH", body: JSON.stringify({ userId: u.id, level: Number(level), reason }) });
      toast.success("Ansehen gesetzt");
      load(query.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ansehen</h2>
      <p className="text-[11px] text-gray-600">
        Stufe 1–4 (Bronze, Silber, Gold, Platin) aus der Gesamtleistung aller Jobs der letzten 8 Wochen plus Kommentar-Daumen.
        Steuert Profilrahmen und Discord-Rolle. Ohne Suche: User mit Ansehen bzw. manuell gesetzter Stufe.
      </p>
      <form className="flex items-center gap-2" onSubmit={ev => { ev.preventDefault(); load(query.trim()); }}>
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-600 absolute left-2 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="User suchen…" aria-label="User suchen"
            className="w-full bg-white/[0.04] border border-white/10 rounded pl-7 pr-2 py-1 text-xs text-white placeholder:text-gray-600" />
        </div>
        <Button size="sm" variant="outline" type="submit">Suchen</Button>
      </form>
      <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {users === null && <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-teal-400 animate-spin" /></div>}
        {users?.length === 0 && <p className="p-4 text-xs text-gray-600">Keine User gefunden.</p>}
        {users?.map(u => {
          const override = u.reputationOverrideUntil && new Date(u.reputationOverrideUntil) > new Date();
          return (
            <div key={u.id} className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{u.username ?? u.name ?? u.id}</p>
                <p className="text-[11px] text-gray-500">
                  {levelTitle(u.reputationLevel)} (Stufe {u.reputationLevel}) · {u.reputationPoints} Punkte · höchste Stufe {u.reputationPeakLevel}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {override && <Badge tone="warning">manuell bis {formatBerlinDate(u.reputationOverrideUntil!)}</Badge>}
                <Button size="sm" variant="ghost" onClick={() => setLevel(u)}>Stufe setzen</Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

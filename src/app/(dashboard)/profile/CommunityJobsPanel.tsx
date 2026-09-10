"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase, Users, Coins, TrendingUp, Clock, ThumbsUp, Send, LogOut, RefreshCw,
  ChevronRight, Loader2, Sparkles, ImagePlus, Newspaper, Megaphone, GraduationCap, Lightbulb, Upload, Crop, X,
  Wrench, Wallet, UserPlus, CalendarDays, Tag, Rocket, Server as ServerIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import GameCover from "@/components/GameCover";
import { useAllLiveStatus } from "@/lib/useServerLiveStatus";
import DisputeVotesModal from "@/components/community-jobs/DisputeVotesModal";
import StudioEditor from "@/components/community-jobs/StudioEditor";
import ImageCropTool from "@/components/community-jobs/ImageCropTool";

/**
 * Community-Jobs-Reiter/-Sektion: eigenständig von der (inzwischen entfernten)
 * passiven Mancave-Idle-Jobs-Mechanik. Lädt alle Daten selbst per fetch —
 * läuft immer im normalen React-Baum mit vollem Router, kein Bezug zur
 * 3D-Mancave-Szene.
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
      toast.success(result.status === "WAITLISTED" ? "Auf die Warteliste gesetzt" : "Job automatisch angenommen — willkommen!");
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
  events: { eventId: string; title: string; reason: string; url?: string; urgency?: string; urgent?: boolean }[];
  steamSales: { id: number; name: string; discountPercent?: number; url: string }[];
  steamReleases: { id: number; name: string; url: string }[];
}
interface Payout { id: string; weekStart: string; rawScore: number; tierLabel: string | null; coinsAwarded: number; voteBonusMultiplier: number }
interface WaitlistEntry { id: string; user: { id: string; username: string | null; name: string | null } }
interface ProjectedPayout { rawScore: number; tierLabel: string | null; ownVotes: number; voteBonusMultiplier: number; coinsAwarded: number; maxCoinsAwarded: number }
interface ServerSummary { id: string; name: string; game: string }

function OfficeView({ membership, onChanged }: { membership: Membership; onChanged: () => void }) {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [servers, setServers] = useState<ServerSummary[]>([]);
  const liveStatus = useAllLiveStatus();
  const [bonusTiers, setBonusTiers] = useState<{ label: string; minVotes: number; multiplier: number }[]>([]);
  const [projected, setProjected] = useState<ProjectedPayout | null>(null);
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEventId, setCreateEventId] = useState<string | undefined>(undefined);
  const [showAllEvents, setShowAllEvents] = useState(false);

  function openCreateForm(eventId?: string) {
    setCreateEventId(eventId);
    setCreateOpen(true);
  }

  /** Blendet eine Empfehlung dauerhaft aus (optimistisch entfernt, Request läuft im Hintergrund). */
  function dismissRecommendation(itemKey: string) {
    setRecs(r => (r ? { ...r, events: r.events.filter(e => e.eventId !== itemKey) } : r));
    api("/api/community-jobs/recommendations/dismiss", { method: "POST", body: JSON.stringify({ itemKey }) }).catch(() => {});
  }

  useEffect(() => {
    api<Recommendations>("/api/community-jobs/recommendations").then(setRecs).catch(() => {});
    api<{ payouts: Payout[] }>("/api/community-jobs/payouts").then(d => setPayouts(d.payouts)).catch(() => {});
    api<{ waitlist: WaitlistEntry[] }>(`/api/community-jobs/${membership.jobKey}/waitlist`).then(d => setWaitlist(d.waitlist)).catch(() => {});
    api<{ tiers: typeof bonusTiers }>("/api/admin/community-jobs/vote-bonus").then(d => setBonusTiers(d.tiers)).catch(() => {});
    api<ServerSummary[]>("/api/servers").then(setServers).catch(() => {});

    // Der Bonus/Vorschau-Wert hängt von Bewertungen ab, die der User oft an
    // ANDERER Stelle abgibt (z.B. Daumen-hoch im Community-Board). `visibilitychange`/
    // `focus` allein reichen NICHT: auf Desktop hält DesktopProfileTabs.tsx dieses
    // Büro dauerhaft gemountet (nur per CSS `hidden` ausgeblendet, nie unmounted),
    // und wer per In-App-Link zum Community-Board wechselt, dort bewertet und per
    // Link zurückkehrt, bleibt die ganze Zeit im selben Tab/Fenster — es feuert
    // also nie ein echtes Tab-Wechsel-/Fokus-Event, das Next.js-Router-Cache kann
    // denselben Komponenten-Zustand ohne Remount/Refetch wiederverwenden. Deshalb
    // zusätzlich ein kurzes Polling, damit die Kachel sich spätestens nach wenigen
    // Sekunden von selbst korrigiert, unabhängig vom Navigationsweg.
    function reloadProjected() {
      api<ProjectedPayout>("/api/community-jobs/projected-payout").then(setProjected).catch(() => {});
    }
    reloadProjected();
    const interval = setInterval(reloadProjected, 15_000);
    function onVisible() { if (!document.hidden) reloadProjected(); }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", reloadProjected);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", reloadProjected);
    };
  }, [membership.jobKey]);

  const onlineServers = servers
    .filter(s => liveStatus[s.id]?.online)
    .sort((a, b) => (liveStatus[b.id]?.currentPlayers ?? 0) - (liveStatus[a.id]?.currentPlayers ?? 0));

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
        <DashTile tone="blue" icon={<TrendingUp className="w-3.5 h-3.5" />} label="Letzte Woche" value={latestPayout ? `${latestPayout.tierLabel ?? "–"}` : "–"} />
        <DashTile tone="amber" icon={<Coins className="w-3.5 h-3.5" />} label="Diese Woche"
          value={projected ? `${projected.coinsAwarded} Münzen` : "…"}
          sub={projected ? `Max. ${projected.maxCoinsAwarded}` : undefined} />
        <DashTile tone={projected && projected.voteBonusMultiplier < 1 ? "red" : projected && projected.voteBonusMultiplier > 1 ? "emerald" : "gray"}
          icon={<Sparkles className="w-3.5 h-3.5" />} label="Bonus"
          value={projected ? `×${projected.voteBonusMultiplier.toFixed(1)}` : "…"}
          valueClassName={projected ? (
            projected.voteBonusMultiplier < 1 ? "text-red-400"
              : projected.voteBonusMultiplier > 1 ? "text-emerald-400"
              : "text-white"
          ) : undefined}
          sub={projected ? `${projected.ownVotes} ${projected.ownVotes === 1 ? "Bewertung" : "Bewertungen"}` : undefined} />
      </div>

      {bonusTiers.length > 0 && (() => {
        const sortedTiers = [...bonusTiers].sort((a, b) => a.minVotes - b.minVotes);
        const ownVotes = projected?.ownVotes ?? 0;
        const nextTier = sortedTiers.find(t => t.minVotes > ownVotes);
        const minV = sortedTiers[0].minVotes;
        const maxV = sortedTiers[sortedTiers.length - 1].minVotes;
        const span = maxV - minV;
        // Position auf der Gesamtskala (niedrigste bis höchste Stufe), nicht nur bis zur nächsten Stufe.
        const posPct = (v: number) => (span > 0 ? Math.min(100, Math.max(0, ((v - minV) / span) * 100)) : 0);
        const fillPct = posPct(ownVotes);
        return (
          <div className="p-4 border-b border-white/[0.04] bg-amber-500/[0.025] space-y-2.5">
            <SectionHeader tone="amber" icon={<Sparkles className="w-3.5 h-3.5" />} title="Aktivitäts-Bonus" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Bewerte selbst Beiträge anderer Community-Jobs (z.B. Daumen-hoch im Community-Board) — je mehr du diese
              Woche bewertest, desto höher dein Gehalts-Multiplikator. Bewertest du gar nicht, sinkt er sogar unter ×1.
            </p>

            {projected != null && (
              <div className="space-y-1">
                {span > 0 && (
                  // Kein horizontales Padding auf dem Container: `left: %` für die Marker wird
                  // sonst gegen eine andere Box (Padding-Box) berechnet als die Balkenbreite selbst
                  // (normaler Fluss, durch das Padding eingerückt) — Marker und Balken würden dann
                  // nicht mehr zueinander passen. Stattdessen wird nur das Label je Marker an den
                  // Rändern per Ankerpunkt (0%/-50%/-100%) so verschoben, dass es nicht übersteht.
                  <div className="relative pt-3 pb-5">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${nextTier ? "bg-amber-400" : "bg-emerald-400"}`}
                        style={{ width: `${fillPct}%` }} />
                    </div>
                    {sortedTiers.map(t => {
                      const isCurrent = t.multiplier === projected.voteBonusMultiplier;
                      const p = posPct(t.minVotes);
                      const labelAnchor = p <= 1 ? "0%" : p >= 99 ? "-100%" : "-50%";
                      return (
                        <div key={t.label} className="absolute top-4" style={{ left: `${p}%` }}>
                          <div className={
                            isCurrent
                              ? "w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-white border-2 border-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.3)]"
                              : "w-2.5 h-2.5 -ml-[5px] -mt-[5px] rounded-full bg-gray-900 border-2 border-gray-400"
                          } />
                          <span className={`absolute top-3 whitespace-nowrap text-[10px] ${isCurrent ? "text-amber-300 font-bold" : "text-gray-400 font-medium"}`}
                            style={{ transform: `translateX(${labelAnchor})` }}>
                            ×{t.multiplier.toFixed(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-gray-500">
                  {nextTier
                    ? <>Noch <span className="text-amber-400 font-medium">{nextTier.minVotes - ownVotes}</span> bis „{nextTier.label}“ (×{nextTier.multiplier.toFixed(1)})</>
                    : <span className="text-emerald-400">Höchste Stufe erreicht 🎉</span>}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Empfehlungen */}
      {recs && (recs.events.length > 0 || recs.steamSales.length > 0 || recs.steamReleases.length > 0) && (
        <div className="p-4 border-b border-white/[0.04] bg-blue-500/[0.02] space-y-3">
          <SectionHeader tone="blue" icon={<Lightbulb className="w-3.5 h-3.5" />} title="Empfehlungen für deine Beiträge" />

          {recs.events.length > 0 && (() => {
            const EVENT_CAP = 3;
            const visibleEvents = showAllEvents ? recs.events : recs.events.slice(0, EVENT_CAP);
            const hiddenCount = recs.events.length - visibleEvents.length;
            // Nur Journalist/Fotograf/Marketing-Manager-Empfehlungen zeigen auf ein echtes Event —
            // Coach/Visionär-Hinweise sind synthetische Ein-Item-Nudges ohne Event-Bezug.
            const isEventScopedJob = ["journalist", "fotograf", "marketing_manager"].includes(membership.jobKey);
            return (
              <div className="space-y-1">
                <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Events ohne Beitrag</p>
                {visibleEvents.map(e => (
                  <div key={e.eventId} className="flex items-center justify-between gap-2 pl-4">
                    <p className="text-xs text-gray-400 min-w-0 truncate">
                      • {e.url ? <Link href={e.url} className="text-gray-300 hover:text-teal-300 underline underline-offset-2">{e.title}</Link> : e.title}
                      {" — "}<span className="text-amber-400">{e.reason}</span>
                      {e.urgency && <span className={`ml-1.5 ${e.urgent ? "text-red-400" : "text-gray-600"}`}>· {e.urgency}</span>}
                    </p>
                    <span className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openCreateForm(isEventScopedJob ? e.eventId : undefined)}
                        className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors">
                        Erstellen
                      </button>
                      <button onClick={() => dismissRecommendation(e.eventId)} title="Nicht relevant — ausblenden"
                        className="text-gray-600 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <button onClick={() => setShowAllEvents(true)} className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors pl-4">
                    +{hiddenCount} weitere
                  </button>
                )}
              </div>
            );
          })()}
          {recs.steamSales.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Aktuelle Sales</p>
              {recs.steamSales.map(s => (
                <p key={`sale-${s.id}`} className="text-xs text-gray-400 pl-4">
                  • <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-teal-300 underline underline-offset-2">{s.name}</a>
                  {s.discountPercent ? <span className="text-emerald-400"> -{s.discountPercent}%</span> : ""}
                </p>
              ))}
            </div>
          )}
          {recs.steamReleases.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><Rocket className="w-3 h-3" /> Neuveröffentlichungen</p>
              {recs.steamReleases.map(s => (
                <p key={`new-${s.id}`} className="text-xs text-gray-400 pl-4">
                  • <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-teal-300 underline underline-offset-2">{s.name}</a>
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aktive Community-Server */}
      {onlineServers.length > 0 && (
        <div className="p-4 border-b border-white/[0.04] space-y-2">
          <SectionHeader tone="teal" icon={<ServerIcon className="w-3.5 h-3.5" />} title="Aktive Community-Server" />
          <div className="space-y-1">
            {onlineServers.map(s => {
              const status = liveStatus[s.id];
              return (
                <Link key={s.id} href="/servers"
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                  <GameCover game={s.game} className="w-7 h-7 shrink-0" rounded="rounded-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-300 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-600 truncate">{s.game}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 text-teal-400 bg-teal-500/10 border-teal-500/20">
                    <span className="w-1 h-1 rounded-full bg-teal-400 motion-safe:animate-pulse" />
                    {status?.currentPlayers ?? 0}{status?.maxPlayers != null ? `/${status.maxPlayers}` : ""} online
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Werkzeuge */}
      <div className="p-4 border-b border-white/[0.04] space-y-3">
        <SectionHeader tone="teal" icon={<Wrench className="w-3.5 h-3.5" />} title="Werkzeuge"
          action={<Button size="sm" onClick={() => openCreateForm()}>Neuer Beitrag</Button>} />
        <JobToolContent jobKey={membership.jobKey} />
      </div>

      {/* Warteliste */}
      {waitlist.length > 0 && (
        <div className="p-4 border-b border-white/[0.04] bg-orange-500/[0.025] space-y-2">
          <SectionHeader tone="orange" icon={<UserPlus className="w-3.5 h-3.5" />} title={`${waitlist.length} ${waitlist.length === 1 ? "Bewerber wartet" : "Bewerber warten"}`} />
          {waitlist.map(w => (
            <div key={w.id} className="flex items-center justify-between gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-gray-300">{w.user.username ?? w.user.name}</span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => handoff(w.id)}>Job übergeben</Button>
            </div>
          ))}
        </div>
      )}

      {/* Gehaltshistorie */}
      {payouts.length > 0 && (
        <div className="p-4 space-y-2">
          <SectionHeader tone="emerald" icon={<Wallet className="w-3.5 h-3.5" />} title="Gehaltshistorie" />
          <div className="space-y-1">
            {payouts.map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-white/[0.04]" : ""}`}>
                <span className="text-gray-500 w-20 shrink-0">{new Date(p.weekStart).toLocaleDateString("de-DE")}</span>
                <span className="text-gray-400 truncate flex-1 text-center">{p.tierLabel ?? "Keine Bewertung"}</span>
                <span className={`font-medium w-24 text-right ${p.coinsAwarded > 0 ? "text-amber-400" : "text-gray-600"}`}>{p.coinsAwarded} Münzen</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Neuer Beitrag" size="md">
        <CreateContentForm jobKey={membership.jobKey} eventId={createEventId} onDone={() => { setCreateOpen(false); onChanged(); }} />
      </Modal>
    </div>
  );
}

const DASH_TILE_TONE_CLASSES: Record<"blue" | "amber" | "emerald" | "red" | "gray", string> = {
  blue: "text-blue-400", amber: "text-amber-400", emerald: "text-emerald-400", red: "text-red-400", gray: "text-gray-500",
};

function DashTile({
  icon, label, value, sub, valueClassName, tone = "blue",
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; valueClassName?: string;
  tone?: "blue" | "amber" | "emerald" | "red" | "gray";
}) {
  return (
    <div className="p-2 sm:p-3 text-center min-w-0">
      <div className={`flex items-center justify-center gap-1 mb-1 ${DASH_TILE_TONE_CLASSES[tone]}`}>{icon}</div>
      <p className={`text-[11px] sm:text-xs font-semibold truncate ${valueClassName ?? "text-white"}`}>{value}</p>
      <p className="text-[9px] text-gray-600 truncate">{label}</p>
      {sub && <p className="text-[9px] text-gray-600 mt-1 truncate">{sub}</p>}
    </div>
  );
}

/** Konsistenter Section-Header (Icon-Badge + Titel) für die Büro-Karten-Abschnitte — löst die
 * bisherigen reinen Emoji-Prefixe ab, damit Abschnitte auf einen Blick unterscheidbar sind. */
const SECTION_TONE_CLASSES: Record<"amber" | "blue" | "teal" | "orange" | "emerald", string> = {
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  teal: "bg-teal-500/10 border-teal-500/20 text-teal-400",
  orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
};

function SectionHeader({
  icon, tone, title, action,
}: { icon: React.ReactNode; tone: "amber" | "blue" | "teal" | "orange" | "emerald"; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${SECTION_TONE_CLASSES[tone]}`}>{icon}</div>
        <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-widest">{title}</p>
      </div>
      {action}
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

/** Kleine quadratische Vorschau für Bild-Beiträge (Fotograf-Assets, Marketing-Posts) — macht die
 * sonst reinen Text-Zeilen in "Werkzeuge" auf einen Blick erkennbar statt nur an der Caption. */
function Thumb({ url }: { url: string | null }) {
  if (!url) return <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/10 shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- kleine Listen-Vorschau beliebiger Blob-URLs
    <img src={url} alt="" className="w-8 h-8 rounded-md object-cover border border-white/10 shrink-0" />
  );
}

/**
 * Bild-Bearbeitung für eigene, bereits veröffentlichte Beiträge — Zuschneiden
 * (wiederverwendet ImageCropTool), Ersetzen durch komplett neuen Upload,
 * optional Entfernen. Jede Aktion speichert sofort (ruft `onSaved` mit der
 * neuen URL bzw. `null` bei Entfernen auf), analog zum Admin-Bearbeiten-Muster
 * in AdminContentSection.tsx.
 */
function ImageEditControls({
  imageUrl, onSaved, allowRemove,
}: { imageUrl: string | null; onSaved: (url: string | null) => void; allowRemove?: boolean }) {
  const [cropping, setCropping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "community-job-asset");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
      onSaved(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- Vorschau beliebiger Blob-URLs
        <img src={imageUrl} alt="" className="w-full max-h-40 object-contain rounded-lg border border-white/10 bg-black/20" />
      )}
      <div className="flex flex-wrap gap-1.5">
        {imageUrl && (
          <Button size="sm" variant="outline" icon={<Crop className="w-3.5 h-3.5" />} onClick={() => setCropping(true)}>Zuschneiden</Button>
        )}
        <Button size="sm" variant="outline" loading={uploading} icon={<Upload className="w-3.5 h-3.5" />} onClick={() => fileRef.current?.click()}>
          {imageUrl ? "Ersetzen" : "Bild hochladen"}
        </Button>
        {imageUrl && allowRemove && (
          <Button size="sm" variant="outline" icon={<X className="w-3.5 h-3.5" />} onClick={() => onSaved(null)}>Entfernen</Button>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Modal open={cropping} onClose={() => setCropping(false)} title="Bild zuschneiden" size="lg">
        {imageUrl && <ImageCropTool imageUrl={imageUrl} onCropped={url => { setCropping(false); onSaved(url); }} onCancel={() => setCropping(false)} />}
      </Modal>
    </div>
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
  const [items, setItems] = useState<{ id: string; caption: string | null; type: string; url: string; _count: { votes: number } }[]>([]);
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
  async function saveImage(id: string, url: string) {
    try {
      await api(`/api/community-jobs/media/${id}`, { method: "PATCH", body: JSON.stringify({ url }) });
      toast.success("Bild gespeichert"); reload();
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
        <div key={a.id} className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
          <div className="flex items-center gap-1.5">
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bildunterschrift"
              className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white" />
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button size="sm" onClick={() => save(a.id)}>Speichern</Button>
          </div>
          <ImageEditControls imageUrl={a.url} onSaved={url => url && saveImage(a.id, url)} />
        </div>
      ) : (
        <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <Thumb url={a.url} />
            <span className="text-gray-300 truncate">{a.caption ?? a.type}</span>
          </span>
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
  const [items, setItems] = useState<{ id: string; caption: string; imageUrl: string | null; assetId: string | null; asset?: { url: string } | null; _count: { votes: number } }[]>([]);
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
  async function saveImage(id: string, url: string | null) {
    try {
      await api(`/api/community-jobs/marketing-posts/${id}`, { method: "PATCH", body: JSON.stringify({ imageUrl: url }) });
      toast.success(url ? "Bild gespeichert" : "Bild entfernt"); reload();
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
          <ImageEditControls imageUrl={p.imageUrl ?? p.asset?.url ?? null} allowRemove onSaved={url => saveImage(p.id, url)} />
        </div>
      ) : (
        <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <Thumb url={p.imageUrl ?? p.asset?.url ?? null} />
            <span className="text-gray-300 truncate">{p.caption}</span>
          </span>
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

function CreateContentForm({ jobKey, eventId, onDone }: { jobKey: string; eventId?: string; onDone: () => void }) {
  if (jobKey === "fotograf") return <UploadAssetForm eventId={eventId} onDone={onDone} />;
  if (jobKey === "marketing_manager") return <CreateMarketingPostForm eventId={eventId} onDone={onDone} />;
  return <TextContentForm jobKey={jobKey} eventId={eventId} onDone={onDone} />;
}

/** Journalist (Bericht), Coach (Trainings-Termin), Visionär (Idee) — alle drei sind Titel + Text. */
interface DiscordChannel { id: string; name: string; category: string | null }

function TextContentForm({ jobKey, eventId, onDone }: { jobKey: string; eventId?: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    if (jobKey !== "coach") return;
    api<{ channels: DiscordChannel[] }>("/api/community-jobs/discord-channels").then(d => setChannels(d.channels)).catch(() => {});
  }, [jobKey]);

  async function submit() {
    setBusy(true);
    try {
      if (jobKey === "journalist") {
        await api("/api/community-jobs/reports", { method: "POST", body: JSON.stringify({ title, bodyMarkdown: body, eventId }) });
      } else if (jobKey === "coach") {
        await api("/api/community-jobs/coach/training-sessions", {
          method: "POST", body: JSON.stringify({
            title, description: body, startAt: new Date(Date.now() + 86_400_000).toISOString(),
            discordChannelId: channelId || undefined,
          }),
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
      {jobKey === "coach" && (
        <>
          <p className="text-[11px] text-gray-600">Termin wird standardmäßig für morgen angelegt — Zeitpunkt lässt sich später anpassen.</p>
          {channels.length > 0 && (
            <Select value={channelId} onChange={e => setChannelId(e.target.value)} className="w-full">
              <option value="">Keine Discord-Ankündigung</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.category ? `${c.category} / ` : ""}#{c.name}</option>)}
            </Select>
          )}
        </>
      )}
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

function UploadAssetForm({ eventId, onDone }: { eventId?: string; onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [type, setType] = useState("SCREENSHOT");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/media", { method: "POST", body: JSON.stringify({ type, url, caption: caption || undefined, eventId }) });
      toast.success("Hochgeladen");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (!url) return <StudioEditor onExported={setUrl} />;

  return (
    <div className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau des Studio-Exports, beliebiger Blob-Host */}
      <img src={url} alt="" className="w-full rounded-lg" />
      <Select value={type} onChange={e => setType(e.target.value)} className="w-full">
        {ASSET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bildunterschrift (optional)"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={() => setUrl("")}>Neu gestalten</Button>
        <Button loading={busy} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Hochladen</Button>
      </div>
    </div>
  );
}

interface EventOption { id: string; title: string; startAt: string }

type PostImageMode = "none" | "library" | "studio" | "upload";

function CreateMarketingPostForm({ eventId: initialEventId, onDone }: { eventId?: string; onDone: () => void }) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState(initialEventId ?? "");
  const [caption, setCaption] = useState("");
  const [assetId, setAssetId] = useState("");
  const [studioImageUrl, setStudioImageUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<PostImageMode>("none");
  const [assets, setAssets] = useState<{ id: string; caption: string | null; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadOwnImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "community-job-asset");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
      setUploadedImageUrl(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => {
      const upcoming = all.filter(e => new Date(e.startAt).getTime() > Date.now());
      setEvents(upcoming);
      if (!initialEventId && upcoming[0]) setEventId(upcoming[0].id);
    }).catch(() => {});
    api<{ assets: typeof assets }>("/api/community-jobs/media").then(d => setAssets(d.assets)).catch(() => {});
  }, []);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/marketing-posts", {
        method: "POST", body: JSON.stringify({
          eventId, caption,
          assetId: imageMode === "library" ? (assetId || undefined) : undefined,
          imageUrl: imageMode === "studio" ? (studioImageUrl || undefined)
            : imageMode === "upload" ? (uploadedImageUrl || undefined) : undefined,
        }),
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

      <div className="flex gap-1.5">
        <Button size="sm" variant={imageMode === "none" ? "primary" : "outline"} onClick={() => setImageMode("none")}>Kein Bild</Button>
        {assets.length > 0 && (
          <Button size="sm" variant={imageMode === "library" ? "primary" : "outline"} onClick={() => setImageMode("library")}>Aus Mediathek</Button>
        )}
        <Button size="sm" variant={imageMode === "studio" ? "primary" : "outline"} onClick={() => setImageMode("studio")}>Im Studio erstellen</Button>
        <Button size="sm" variant={imageMode === "upload" ? "primary" : "outline"} onClick={() => setImageMode("upload")}>Eigenes Bild hochladen</Button>
      </div>

      {imageMode === "library" && (
        <Select value={assetId} onChange={e => setAssetId(e.target.value)} className="w-full">
          <option value="">Bild wählen…</option>
          {assets.map(a => <option key={a.id} value={a.id}>{a.caption ?? a.id}</option>)}
        </Select>
      )}
      {imageMode === "upload" && (
        uploadedImageUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host */}
            <img src={uploadedImageUrl} alt="" className="w-full rounded-lg" />
            <Button size="sm" variant="ghost" onClick={() => setUploadedImageUrl("")}>Anderes Bild</Button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-8 cursor-pointer hover:border-teal-500/30 transition-colors">
            {uploading ? <Loader2 className="w-5 h-5 text-gray-500 animate-spin" /> : <Upload className="w-5 h-5 text-gray-500" />}
            <span className="text-xs text-gray-500">Bild auswählen</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadOwnImage(f); }} />
          </label>
        )
      )}
      {imageMode === "studio" && (
        studioImageUrl ? (
          <div className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau des Studio-Exports */}
            <img src={studioImageUrl} alt="" className="w-full rounded-lg" />
            <Button size="sm" variant="ghost" onClick={() => setStudioImageUrl("")}>Neu gestalten</Button>
          </div>
        ) : (
          <StudioEditor onExported={setStudioImageUrl} />
        )
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

"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase, Users, Coins, TrendingUp, Clock, ThumbsUp, Send, LogOut, RefreshCw,
  ChevronRight, Loader2, Sparkles, ImagePlus, Newspaper, Megaphone, GraduationCap, Lightbulb, Upload, Crop, X,
  Wrench, Wallet, UserPlus, CalendarDays, Tag, Rocket, Server as ServerIcon, BookOpen, AlertTriangle, ChevronDown, Star, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { COMMUNITY_JOBS } from "@/lib/community-jobs";
import ReportEditor from "@/components/community-jobs/ReportEditor";
import { JournalistStatsBlock, JournalistExtras } from "@/components/community-jobs/JournalistTools";
import { VisionaerStatsBlock } from "@/components/community-jobs/VisionaerTools";
import IdeaForm from "@/components/community-jobs/IdeaForm";
import MarkdownLite from "@/components/community-jobs/MarkdownLite";
import { ideaLifecycleMeta, ideaCategoryLabel } from "@/lib/idea-lifecycle";
import { MarketingStatsBlock, MarketingCampaignsBlock } from "@/components/community-jobs/MarketingTools";
import {
  MARKETING_TEMPLATES, buildMarketingText, isMarketingTemplate, withEventLink, type MarketingEventFacts, type MarketingTemplateId,
} from "@/lib/marketing-templates";
import { PhotoRequestList, FotografStatsBlock, FotografExtras, BulkUploadForm, MonthCollageBuilder, AlbumSelect, useAlbums } from "@/components/community-jobs/FotografTools";
import { reportCategoryLabel } from "@/lib/report-categories";
import {
  CoachAvailability, CoachStatsBlock, CoachAttendance, CoachMentees, CoachHelpInbox, CoachSpecialties, CoachNewcomers, CoachGuideList,
} from "@/components/community-jobs/CoachTools";
import GameCover from "@/components/GameCover";
import { useAllLiveStatus } from "@/lib/useServerLiveStatus";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";
import { upload } from "@vercel/blob/client";
import { CLIP_MAX_BYTES, CLIP_ALLOWED_TYPES, CLIP_EXTENSION_BY_MIME, CLIP_UPLOAD_PREFIX, isVideoUrl } from "@/lib/upload-limits";
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

interface CatalogHolder { userId: string; username: string | null; status: string; lastPayoutCoins: number | null; availableUntil?: string | null }
interface CatalogEntry {
  key: string; label: string; emoji: string; description: string; officeGuideMarkdown?: string;
  maxSlots: number; filledSlots: number; holders: CatalogHolder[]; waitlistCount: number;
}
interface Membership {
  id: string; jobKey: string; status: string;
  contractStartAt: string; contractEndAt: string;
  warnedAt?: string | null; warningReason?: string | null; lastContributionAt?: string | null; assignedAt?: string; availableUntil?: string | null; specialties?: string[];
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
        <OfficeView membership={overview.activeMembership} guide={overview.catalog.find(j => j.key === overview.activeMembership?.jobKey)?.officeGuideMarkdown} onChanged={reload} />
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
                    {h.availableUntil && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 align-middle" title="Gerade verfügbar" />}
                    {h.username ?? "?"}<JobBadge userId={h.userId} variant="compact" className="ml-1" />{h.lastPayoutCoins != null && ` · ${h.lastPayoutCoins} Münzen`}
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

/** Vorbelegung für einen Beitrag zu einem Steam-Spiel; `link` wird beim Absenden automatisch angehängt, falls er im Text fehlt. */
interface PostPrefill {
  title?: string; body?: string; link?: string; linkLabel?: string;
  /** Coach-Termin: Beginn (datetime-local), Plätze, Event-Bezug. */
  startAt?: string; capacity?: string; eventId?: string; meetingUrl?: string;
  /** Journalist: Rückblick-Vorlage (Woche/Monat) automatisch einsetzen. */
  recap?: "week" | "month";
  /** Marketing: Werbetext-Baustein (announce | reminder | lastspots | today) und Kampagne, zu der der Post gehört. */
  template?: string; campaignId?: string;
  /** Marketing "Als Vorlage": Bild und Titel des ursprünglichen Events (wird im Text ersetzt). */
  assetId?: string; imageUrl?: string; fromEventTitle?: string;
  /** Fotograf: Monats-Collage-Assistent direkt öffnen. */
  collage?: boolean;
  /** Fotograf: Upload erfüllt diesen Bildwunsch. */
  photoRequestId?: string;
}

function withLink(text: string, link?: string): string {
  if (!link || text.includes(link)) return text;
  return `${text.trim()}\n\n${link}`;
}

function steamPrefill(kind: "sales" | "new", jobKey: string, s: { name: string; discountPercent?: number; url: string }): PostPrefill {
  const discount = s.discountPercent ? ` (-${s.discountPercent}%)` : "";
  const headline = kind === "sales" ? `${s.name} im Steam-Sale${discount}` : `Neu auf Steam: ${s.name}`;
  const line = kind === "sales"
    ? `${s.name} ist gerade im Steam-Sale${s.discountPercent ? ` mit -${s.discountPercent}%` : ""}.`
    : `${s.name} ist neu auf Steam erschienen.`;
  return {
    title: jobKey === "visionaer" ? `Gemeinsam spielen: ${s.name}?` : headline,
    body: jobKey === "visionaer" ? `${line} Wäre das etwas für die Community?\n\n${s.url}` : `${line}\n\n${s.url}`,
    link: s.url, linkLabel: s.name,
  };
}

const SWITCH_ON = "bg-teal-500 text-black shadow-sm";
const SWITCH_OFF = "text-gray-300 hover:text-white";
const URGENT_CHIP = "text-red-300 bg-red-500/10 border-red-500/25";
const CALM_CHIP = "text-gray-300 bg-white/[0.06] border-white/10";

interface Recommendations {
  events: { eventId: string; title: string; reason: string; url?: string; urgency?: string; urgent?: boolean; eventScoped?: boolean; noCreate?: boolean; recap?: "week" | "month"; photoRequestId?: string; collage?: boolean; scopeEventId?: string; postTemplate?: string }[];
  steamSales: { id: number; name: string; discountPercent?: number; headerImage?: string; url: string }[];
  steamReleases: { id: number; name: string; discountPercent?: number; headerImage?: string; url: string }[];
}
interface Payout { id: string; weekStart: string; weekEnd: string; rawScore: number; tierLabel: string | null; baseCoins: number; coinsAwarded: number; voteBonusMultiplier: number }
interface WaitlistEntry { id: string; user: { id: string; username: string | null; name: string | null } }
interface ProjectedPayout { rawScore: number; tierLabel: string | null; ownVotes: number; voteBonusMultiplier: number; coinsAwarded: number; maxCoinsAwarded: number }
interface ServerSummary { id: string; name: string; game: string }

function OfficeView({ membership, guide, onChanged }: { membership: Membership; guide?: string; onChanged: () => void }) {
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
  const [createPrefill, setCreatePrefill] = useState<PostPrefill | undefined>(undefined);
  const [toolsKey, setToolsKey] = useState(0);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [steamTab, setSteamTab] = useState<"sales" | "new">("sales");
  const [tab, setTab] = useState<"work" | "pay">("work");
  const [guideOpen, setGuideOpen] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirm();
  const rootRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(true);

  function openCreateForm(eventId?: string, prefill?: PostPrefill) {
    setCreateEventId(eventId);
    setCreatePrefill(prefill);
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
    // Gepollt wird nur, solange das Büro tatsächlich sichtbar ist (Browser-Tab im
    // Vordergrund UND Element nicht per display:none ausgeblendet) — ein per CSS
    // versteckter, aber gemounteter Reiter fragt sonst dauerhaft umsonst ab.
    function reloadProjected() {
      if (document.hidden || !inViewRef.current) return;
      api<ProjectedPayout>("/api/community-jobs/projected-payout").then(setProjected).catch(() => {});
    }
    reloadProjected();
    const interval = setInterval(reloadProjected, 15_000);
    const observer = typeof IntersectionObserver !== "undefined" && rootRef.current
      ? new IntersectionObserver(entries => {
          const visible = entries.some(e => e.isIntersecting);
          const becameVisible = visible && !inViewRef.current;
          inViewRef.current = visible;
          if (becameVisible) reloadProjected();
        })
      : null;
    if (observer && rootRef.current) observer.observe(rootRef.current);
    document.addEventListener("visibilitychange", reloadProjected);
    window.addEventListener("focus", reloadProjected);
    return () => {
      clearInterval(interval);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", reloadProjected);
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
    const ok = await confirm({
      title: "Job kündigen?",
      description: "Du scheidest sofort aus: das Gehalt der laufenden Woche entfällt und die Discord-Rolle wird entfernt. Der Slot wird frei — bewirbst du dich später neu, landest du ggf. auf der Warteliste.",
      confirmLabel: "Kündigen", variant: "danger",
    });
    if (!ok) return;
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

  async function handoff(targetApplicationId: string, applicantName: string) {
    const ok = await confirm({
      title: `Job an ${applicantName} übergeben?`,
      description: `${applicantName} übernimmt sofort deinen Job. Du scheidest aus, das Gehalt der laufenden Woche entfällt.`,
      confirmLabel: "Übergeben", variant: "danger",
    });
    if (!ok) return;
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

  const jobGuide = guide ?? COMMUNITY_JOBS.find(j => j.key === membership.jobKey)?.officeGuideMarkdown;
  const lastActivity = new Date(membership.lastContributionAt ?? membership.assignedAt ?? membership.contractStartAt);
  const daysSinceContribution = Math.floor((Date.now() - lastActivity.getTime()) / 86_400_000);
  const recCount = recs ? recs.events.length : 0;
  // Journalist (Bericht), Visionär (Idee) und Marketing Manager (Werbe-Post) können direkt zu einem Steam-Spiel posten.
  const canPostAboutSteam = ["journalist", "visionaer", "marketing_manager"].includes(membership.jobKey);

  return (
    <div ref={rootRef} className="glass card-shine rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Büro</p>
            <p className="text-[11px] text-gray-500">
              Vertrag bis {formatBerlinDate(contractEnd)}
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
        <DashTile tone="blue" icon={<TrendingUp className="w-3.5 h-3.5" />} label="Letzte Woche"
          value={latestPayout ? `${latestPayout.coinsAwarded} Münzen` : "–"}
          sub={latestPayout ? (latestPayout.tierLabel ?? "Keine Bewertung") : undefined} />
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

      {/* Verwarnung / Inaktivitäts-Hinweis */}
      {membership.status === "WARNED" && (
        <div className="p-4 border-b border-white/[0.04] bg-amber-500/[0.06] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-amber-300">
              Verwarnt{membership.warnedAt ? ` seit ${formatBerlinDate(new Date(membership.warnedAt))}` : ""}
            </p>
            <p className="text-[11px] text-gray-400">
              {membership.warningReason ?? "Inaktivität: keine neuen Beiträge"}. Ein neuer Beitrag hebt die Verwarnung auf
              (wird täglich geprüft). Bis dahin kannst du den Vertrag nicht verlängern.
            </p>
          </div>
        </div>
      )}
      {membership.status === "ACTIVE" && daysSinceContribution >= 7 && (
        <div className="p-4 border-b border-white/[0.04] bg-amber-500/[0.03] flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-500/70 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-400">
            Dein letzter Beitrag ist {daysSinceContribution} Tage her. Nach 14 Tagen ohne Beitrag erhältst du eine Verwarnung.
          </p>
        </div>
      )}

      {/* Anleitung */}
      {jobGuide && (
        <div className="border-b border-white/[0.04]">
          <button onClick={() => setGuideOpen(v => !v)} aria-expanded={guideOpen}
            className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-white/[0.02] transition-colors">
            <span className="flex items-center gap-2 text-[11px] font-semibold text-gray-300 uppercase tracking-widest">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" /> So funktioniert dein Job
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${guideOpen ? "rotate-180" : ""}`} />
          </button>
          {guideOpen && (
            <div className="px-4 pb-4 space-y-2 text-xs text-gray-400 leading-relaxed">
              <MarkdownLite text={jobGuide} className="text-xs text-gray-400" />
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-gray-500">
                <li>Das Gehalt wird jeden Montag für die abgeschlossene Vorwoche gebucht.</li>
                <li>Bewertest du selbst Beiträge anderer, steigt dein Aktivitäts-Bonus (siehe Reiter „Gehalt“).</li>
                <li>Der Vertrag läuft 3 Monate, Verlängern ist ab dem 3. Monat möglich.</li>
                <li>Nach 14 Tagen ohne Beitrag gibt es eine Verwarnung.</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04]" role="tablist">
        {([["work", "Arbeit", recCount], ["pay", "Gehalt", 0]] as const).map(([key, label, count]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`flex-1 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest transition-colors border-b-2 ${
              tab === key ? "text-teal-300 border-teal-400" : "text-gray-500 border-transparent hover:text-gray-300"
            }`}>
            {label}{count > 0 && <span className="ml-1.5 text-[10px] rounded-full bg-blue-500/20 text-blue-300 px-1.5 py-0.5">{count}</span>}
          </button>
        ))}
      </div>

      {tab === "work" && (
      <>
      {/* Empfehlungen */}
      {recs && (recs.events.length > 0 || recs.steamSales.length > 0 || recs.steamReleases.length > 0) && (
        <div className="p-4 border-b border-white/[0.04] bg-blue-500/[0.02] space-y-4">
          <SectionHeader tone="blue" icon={<Lightbulb className="w-3.5 h-3.5" />} title="Empfehlungen für deine Beiträge" />

          {recs.events.length > 0 && (() => {
            const EVENT_CAP = 3;
            const visibleEvents = showAllEvents ? recs.events : recs.events.slice(0, EVENT_CAP);
            const hiddenCount = recs.events.length - visibleEvents.length;
            // Nur Journalist/Fotograf/Marketing-Manager-Empfehlungen zeigen auf ein echtes Event —
            // Coach/Visionär-Hinweise sind synthetische Ein-Item-Nudges ohne Event-Bezug.
            const isEventScopedJob = ["journalist", "fotograf", "marketing_manager"].includes(membership.jobKey);
            // Coach-Empfehlung "neue Spieler": kein Event, aber ein sinnvoller Vorschlag fürs Formular.
            const newcomerPrefill: PostPrefill = { title: "Einsteiger-Training", body: "Für alle, die neu in der Community sind: Wir zeigen euch, wie alles funktioniert, und spielen zusammen." };
            return (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-blue-400" /> Events ohne Beitrag</p>
                <div className="space-y-1.5">
                  {visibleEvents.map(e => (
                    <div key={e.eventId} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
                      {e.urgency && (
                        <span className={`shrink-0 min-w-[3.25rem] text-center text-[10px] font-semibold rounded-lg px-2 py-1 border ${
                          e.urgent ? URGENT_CHIP : CALM_CHIP
                        }`}>{e.urgency}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200 truncate">
                          {e.url ? <Link href={e.url} className="hover:text-teal-300 transition-colors">{e.title}</Link> : e.title}
                        </p>
                        <p className="text-[11px] text-amber-400/90">{e.reason}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!e.noCreate && (
                          <Button size="sm" variant="outline"
                            onClick={() => (e.recap
                              ? openCreateForm(undefined, { recap: e.recap })
                              : e.scopeEventId
                              ? openCreateForm(e.scopeEventId, { template: e.postTemplate })
                              : e.collage
                              ? openCreateForm(undefined, { collage: true })
                              : e.photoRequestId
                              ? openCreateForm(undefined, { photoRequestId: e.photoRequestId, title: e.title })
                              : openCreateForm(isEventScopedJob || e.eventScoped ? e.eventId : undefined, e.eventId === "coach-newcomers" ? newcomerPrefill : undefined))}>
                            Erstellen
                          </Button>
                        )}
                        <button onClick={() => dismissRecommendation(e.eventId)} title="Nicht relevant — ausblenden" aria-label="Ausblenden"
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <button onClick={() => setShowAllEvents(true)} className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
                    +{hiddenCount} weitere anzeigen
                  </button>
                )}
              </div>
            );
          })()}

          {(recs.steamSales.length > 0 || recs.steamReleases.length > 0) && (() => {
            const activeSteamTab = steamTab === "sales" && recs.steamSales.length === 0 ? "new"
              : steamTab === "new" && recs.steamReleases.length === 0 ? "sales" : steamTab;
            const items = activeSteamTab === "sales" ? recs.steamSales : recs.steamReleases;
            const both = recs.steamSales.length > 0 && recs.steamReleases.length > 0;
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5">
                    {activeSteamTab === "sales"
                      ? <><Tag className="w-3.5 h-3.5 text-emerald-400" /> Aktuelle Steam-Sales</>
                      : <><Rocket className="w-3.5 h-3.5 text-blue-400" /> Neuveröffentlichungen</>}
                  </p>
                  {both && (
                    <div className="flex rounded-full bg-white/[0.06] border border-white/15 p-0.5 text-xs font-semibold" role="tablist">
                      {([["sales", "Sales"], ["new", "Neu"]] as const).map(([key, label]) => (
                        <button key={key} role="tab" aria-selected={activeSteamTab === key} onClick={() => setSteamTab(key)}
                          className={`px-4 py-1.5 rounded-full transition-colors ${
                            activeSteamTab === key ? SWITCH_ON : SWITCH_OFF
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                  {items.map(s => (
                    <div key={`${activeSteamTab}-${s.id}`}
                      className="group snap-start shrink-0 w-44 rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-teal-500/30 transition-colors flex flex-col">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="relative aspect-[460/215] bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                          {s.headerImage && (
                            // eslint-disable-next-line @next/next/no-img-element -- Steam-CDN-Cover, beliebiger Host
                            <img src={s.headerImage} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {s.discountPercent ? (
                            <span className="absolute top-1.5 right-1.5 text-[11px] font-bold text-emerald-950 bg-emerald-400 rounded-md px-1.5 py-0.5">
                              -{s.discountPercent}%
                            </span>
                          ) : null}
                        </div>
                        <p className="px-2.5 pt-2 text-xs text-gray-300 truncate group-hover:text-teal-300 transition-colors">{s.name}</p>
                      </a>
                      {canPostAboutSteam && (
                        <div className="px-2.5 pb-2.5 pt-1.5 mt-auto">
                          <Button size="sm" variant="outline" className="w-full justify-center"
                            onClick={() => openCreateForm(undefined, steamPrefill(activeSteamTab, membership.jobKey, s))}>
                            Beitrag dazu
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
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
        <JobToolContent key={toolsKey} jobKey={membership.jobKey} membership={membership} onDuplicate={p => openCreateForm(undefined, p)} onCompose={openCreateForm} />
      </div>

      {/* Warteliste */}
      {waitlist.length > 0 && (
        <div className="p-4 border-b border-white/[0.04] bg-orange-500/[0.025] space-y-2">
          <SectionHeader tone="orange" icon={<UserPlus className="w-3.5 h-3.5" />} title={`${waitlist.length} ${waitlist.length === 1 ? "Bewerber wartet" : "Bewerber warten"}`} />
          {waitlist.map(w => (
            <div key={w.id} className="flex items-center justify-between gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5">
              <span className="text-xs text-gray-300">{w.user.username ?? w.user.name}<JobBadge userId={w.user.id} variant="compact" className="ml-1" /></span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => handoff(w.id, w.user.username ?? w.user.name ?? "dem Bewerber")}>Job übergeben</Button>
            </div>
          ))}
        </div>
      )}

      </>
      )}

      {tab === "pay" && (
      <>
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

      {/* Gehaltshistorie */}
      <div className="p-4 space-y-2">
        <SectionHeader tone="emerald" icon={<Wallet className="w-3.5 h-3.5" />} title="Gehaltshistorie" />
        {payouts.length === 0 ? (
          <p className="text-[11px] text-gray-600">Noch keine Auszahlung. Das Gehalt wird jeweils montags für die abgeschlossene Vorwoche gebucht.</p>
        ) : (
          <div className="space-y-1">
            {payouts.map((p, i) => {
              const weekLabel = `${formatBerlinDate(new Date(p.weekStart))} – ${formatBerlinDate(new Date(new Date(p.weekEnd).getTime() - 1))}`;
              return (
                <div key={p.id} className={`text-xs rounded-lg px-2.5 py-1.5 space-y-0.5 ${i === 0 ? "bg-white/[0.04]" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{weekLabel}</span>
                    <span className={`font-medium ${p.coinsAwarded > 0 ? "text-amber-400" : "text-gray-600"}`}>{p.coinsAwarded} Münzen</span>
                  </div>
                  <p className="text-[10px] text-gray-600">
                    {p.tierLabel ?? "Keine Bewertung"} · Score {p.rawScore}
                    {p.baseCoins > 0 && <> · Basis {p.baseCoins}</>}
                    {" · "}Bonus ×{p.voteBonusMultiplier.toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      </>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Neuer Beitrag" size={membership.jobKey === "journalist" ? "lg" : "md"}>
        <CreateContentForm jobKey={membership.jobKey} eventId={createEventId} prefill={createPrefill} onDone={() => { setCreateOpen(false); setToolsKey(k => k + 1); onChanged(); }} />
      </Modal>
      {ConfirmDialogElement}
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

function CoachToolbox({ membership, onDuplicate }: { membership: Membership; onDuplicate: (prefill: PostPrefill) => void }) {
  const [menteeKey, setMenteeKey] = useState(0);
  return (
    <div className="space-y-4">
      <CoachHelpInbox />
      <CoachAvailability initialUntil={membership.availableUntil} />
      <CoachSpecialties initial={membership.specialties} />
      <CoachStatsBlock />
      <TrainingSessionList onDuplicate={onDuplicate} />
      <CoachAttendance onMenteeAdded={() => setMenteeKey(k => k + 1)} />
      <CoachNewcomers onMenteeAdded={() => setMenteeKey(k => k + 1)} />
      <CoachMentees refreshKey={menteeKey} />
      <CoachGuideList />
      <CoachRatingsReceived />
    </div>
  );
}

function JobToolContent({ jobKey, membership, onDuplicate, onCompose }: {
  jobKey: string; membership: Membership; onDuplicate: (prefill: PostPrefill) => void;
  onCompose: (eventId?: string, prefill?: PostPrefill) => void;
}) {
  if (jobKey === "journalist") return <ReportList onCompose={onCompose} />;
  if (jobKey === "fotograf") {
    return (
      <div className="space-y-4">
        <FotografStatsBlock />
        <PhotoRequestList onFulfill={r => onCompose(r.eventId ?? undefined, { photoRequestId: r.id, title: r.description })} />
        <AssetList />
        <FotografExtras />
      </div>
    );
  }
  if (jobKey === "marketing_manager") {
    return (
      <div className="space-y-4">
        <MarketingStatsBlock />
        <MarketingCampaignsBlock onCompose={(eventId, p) => onCompose(eventId, p)} />
        <MarketingPostList onDuplicate={onDuplicate} />
      </div>
    );
  }
  if (jobKey === "coach") return <CoachToolbox membership={membership} onDuplicate={onDuplicate} />;
  if (jobKey === "visionaer") {
    return (
      <div className="space-y-4">
        <VisionaerStatsBlock />
        <IdeaList />
      </div>
    );
  }
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
  if (isVideoUrl(url)) {
    return <video src={url} muted playsInline className="w-8 h-8 rounded-md object-cover border border-white/10 shrink-0" />;
  }
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

interface MyReport {
  id: string; title: string; bodyMarkdown: string; category: string | null; eventId: string | null;
  coverAssetId: string | null; referencedMarketingPostId: string | null; seriesId?: string | null; isDraft: boolean; publishedAt: string;
  _count: { votes: number; contributions: number };
}

function ReportList({ onCompose }: { onCompose: (eventId?: string, prefill?: PostPrefill) => void }) {
  const [items, setItems] = useState<MyReport[] | null>(null);
  const [editing, setEditing] = useState<MyReport | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [statsKey, setStatsKey] = useState(0);
  const { confirm, ConfirmDialogElement } = useConfirm();

  function reload() {
    api<{ reports: MyReport[] }>("/api/community-jobs/reports").then(d => {
      // Entwürfe zuerst, danach neueste zuerst.
      setItems([...d.reports].sort((a, b) => Number(b.isDraft) - Number(a.isDraft) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      setStatsKey(k => k + 1);
    }).catch(() => setItems([]));
  }
  useEffect(reload, []);

  async function publish(r: MyReport) {
    setBusy(r.id);
    try {
      await api(`/api/community-jobs/reports/${r.id}/publish`, { method: "POST" });
      toast.success("Veröffentlicht");
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(null); }
  }
  async function remove(r: MyReport) {
    const ok = await confirm({
      title: r.isDraft ? "Entwurf löschen?" : "Bericht löschen?",
      description: r.isDraft ? `„${r.title}“ wird gelöscht.` : `„${r.title}“ wird samt Ergänzungen und Bewertungen gelöscht.`,
      confirmLabel: "Löschen", variant: "danger",
    });
    if (!ok) return;
    try {
      await api(`/api/community-jobs/reports/${r.id}`, { method: "DELETE" });
      toast.success("Gelöscht");
      reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  if (!items) return null;
  return (
    <div className="space-y-3">
      <JournalistStatsBlock refreshKey={statsKey} />
      <JournalistExtras onCompose={recap => onCompose(undefined, { recap })} />
      {items.length === 0 ? (
        <p className="text-xs text-gray-600">Noch keine Berichte. Über „Neuer Beitrag“ schreibst du deinen ersten — mit „Aus Event vorbefüllen“ startest du direkt mit den Fakten.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 min-w-0">
                {r.isDraft && <Badge tone="warning">Entwurf</Badge>}
                {reportCategoryLabel(r.category) && <Badge tone="neutral">{reportCategoryLabel(r.category)}</Badge>}
                <span className="text-gray-300 truncate">{r.title}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                {!r.isDraft && <VoteRow upvotes={r._count.votes} votedByMe={false} />}
                {!r.isDraft && <span className="text-gray-600">{r._count.contributions} Ergänzungen</span>}
                {r.isDraft && <Button size="sm" variant="outline" loading={busy === r.id} onClick={() => publish(r)}>Veröffentlichen</Button>}
                <EditDeleteBar onEdit={() => setEditing(r)} onDelete={() => remove(r)} />
              </span>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.isDraft ? "Entwurf bearbeiten" : "Bericht bearbeiten"} size="lg">
        {editing && (
          <ReportEditor reportId={editing.id} initial={editing} onDone={() => { setEditing(null); reload(); }} />
        )}
      </Modal>
      {ConfirmDialogElement}
    </div>
  );
}

function AssetList() {
  const [items, setItems] = useState<{ id: string; caption: string | null; type: string; url: string; album?: { id: string; title: string } | null; _count: { votes: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [albumId, setAlbumId] = useState("");
  const { albums } = useAlbums();

  function reload() {
    api<{ assets: typeof items }>("/api/community-jobs/media?mine=1").then(d => setItems(d.assets)).catch(() => {});
  }
  useEffect(reload, []);

  async function save(id: string) {
    try {
      await api(`/api/community-jobs/media/${id}`, { method: "PATCH", body: JSON.stringify({ caption, albumId: albumId || null }) });
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
          <AlbumSelect albums={albums} value={albumId} onChange={setAlbumId} />
          {!isVideoUrl(a.url) && <ImageEditControls imageUrl={a.url} onSaved={url => url && saveImage(a.id, url)} />}
        </div>
      ) : (
        <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 min-w-0">
            <Thumb url={a.url} />
            <span className="text-gray-300 truncate">{a.caption ?? a.type}{a.album && <span className="ml-1.5 text-[10px] text-teal-400/80">📁 {a.album.title}</span>}</span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <VoteRow upvotes={a._count.votes} votedByMe={false} />
            <EditDeleteBar onEdit={() => { setEditing(a.id); setCaption(a.caption ?? ""); setAlbumId(a.album?.id ?? ""); }} onDelete={() => remove(a.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

interface MyMarketingPost {
  id: string; caption: string; imageUrl: string | null; assetId: string | null; asset?: { url: string } | null;
  adminConfirmedPosted: boolean; kind: string | null; event?: { id: string; title: string; startAt: string };
  _count: { votes: number };
}

function MarketingPostList({ onDuplicate }: { onDuplicate?: (prefill: PostPrefill) => void }) {
  const [items, setItems] = useState<MyMarketingPost[]>([]);
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

  async function copyText(p: MyMarketingPost) {
    const link = p.event ? `${window.location.origin}/tournament/${p.event.id}` : "";
    const text = link && !p.caption.includes(link) && !p.caption.includes("/tournament/") ? `${p.caption.trim()}\n\n\u{1F449} Jetzt anmelden: ${link}` : p.caption;
    try { await navigator.clipboard.writeText(text); toast.success("Text kopiert — zum Einfügen z.B. in Instagram oder Discord"); }
    catch { toast.error("Kopieren nicht möglich"); }
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
            <span className="min-w-0">
              <span className="block text-gray-300 truncate">{p.caption}</span>
              <span className="block text-[10px] text-gray-600 truncate">
                {p.event?.title}
                {p.adminConfirmedPosted
                  ? <span className="ml-1.5 text-emerald-400" title="Ein Admin hat bestätigt, dass dieser Post extern veröffentlicht wurde">✓ extern gepostet</span>
                  : <span className="ml-1.5" title="Noch nicht von einem Admin als extern gepostet bestätigt">· noch nicht extern bestätigt</span>}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <VoteRow upvotes={p._count.votes} votedByMe={false} />
            <button onClick={() => copyText(p)} title="Text kopieren (inkl. Anmelde-Link)" aria-label="Text kopieren" className="p-1 text-gray-600 hover:text-teal-400 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
            {onDuplicate && (
              <button onClick={() => onDuplicate({ body: p.caption, assetId: p.assetId ?? undefined, imageUrl: p.imageUrl ?? undefined, fromEventTitle: p.event?.title })}
                title="Als Vorlage für ein anderes Event verwenden" className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors">Als Vorlage</button>
            )}
            <EditDeleteBar onEdit={() => { setEditing(p.id); setCaption(p.caption); }} onDelete={() => remove(p.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

interface TrainingSession {
  id: string; title: string; description?: string | null; eventId?: string | null; seriesId?: string | null; meetingUrl?: string | null;
  startAt: string; capacity: number | null;
  isMine: boolean; signedUp: boolean; onWaitlist?: boolean; waitlistCount?: number;
  coach: { id: string; username: string | null; name: string | null };
  _count: { signups: number };
  participants?: { id: string; username: string | null; name: string | null }[];
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }
/** Wert für <input type="datetime-local"> (lokale Zeit des Browsers). */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function defaultTrainingStart(): string {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(18, 0, 0, 0);
  return toLocalInput(d);
}

const INPUT_CLS = "bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500/40";

function MeetingLink({ url }: { url?: string | null }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 underline underline-offset-2" onClick={e => e.stopPropagation()}>
      Treffpunkt
    </a>
  );
}

function TrainingSessionList({ onDuplicate }: { onDuplicate?: (prefill: PostPrefill) => void }) {
  const [items, setItems] = useState<TrainingSession[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", startAt: "", capacity: "", meetingUrl: "", message: "", wholeSeries: false });
  const [deleting, setDeleting] = useState<{ id: string; message: string } | null>(null);
  const [openParticipants, setOpenParticipants] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirm();

  function reload() {
    api<{ sessions: TrainingSession[] }>("/api/community-jobs/coach/training-sessions").then(d => setItems(d.sessions)).catch(() => setItems([]));
  }
  useEffect(reload, []);

  async function run(id: string, fn: () => Promise<unknown>, successMsg: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(successMsg);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  function startEdit(s: TrainingSession) {
    setEditing(s.id);
    setDeleting(null);
    setForm({
      title: s.title, startAt: toLocalInput(new Date(s.startAt)), capacity: s.capacity != null ? String(s.capacity) : "",
      meetingUrl: s.meetingUrl ?? "", message: "", wholeSeries: false,
    });
  }
  async function save(s: TrainingSession) {
    await run(s.id, async () => {
      await api(`/api/community-jobs/coach/training-sessions/${s.id}`, {
        method: "PATCH", body: JSON.stringify({
          title: form.title, startAt: new Date(form.startAt).toISOString(),
          capacity: form.capacity.trim() ? Number(form.capacity) : null,
          meetingUrl: form.meetingUrl.trim() || null,
          scope: form.wholeSeries ? "series" : "single", message: form.message.trim() || undefined,
        }),
      });
      setEditing(null);
    }, form.wholeSeries ? "Serie gespeichert" : "Gespeichert");
  }
  async function remove(s: TrainingSession) {
    // Termine einer Serie: Auswahl "nur dieser" / "ab hier alle" inline statt einfachem Bestätigen.
    if (s.seriesId) { setDeleting({ id: s.id, message: "" }); setEditing(null); return; }
    const ok = await confirm({
      title: "Termin löschen?",
      description: `„${s.title}“ wird gelöscht${s._count.signups > 0 ? ` — ${s._count.signups} angemeldete Teilnehmer werden benachrichtigt` : ""}.`,
      confirmLabel: "Löschen", variant: "danger",
    });
    if (!ok) return;
    await run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}`, { method: "DELETE" }), "Gelöscht");
  }
  async function removeSeries(s: TrainingSession, scope: "single" | "series", message: string) {
    const qs = new URLSearchParams({ scope });
    if (message.trim()) qs.set("message", message.trim());
    setDeleting(null);
    await run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}?${qs}`, { method: "DELETE" }), scope === "series" ? "Serie abgesagt" : "Gelöscht");
  }

  if (!items) return null;
  const mine = items.filter(s => s.isMine);
  const others = items.filter(s => !s.isMine);
  if (items.length === 0) return <p className="text-xs text-gray-600">Keine anstehenden Trainings-Termine.</p>;

  return (
    <div className="space-y-3">
      {mine.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Meine Termine</p>
          {mine.map(s => editing === s.id ? (
            <div key={s.id} className="space-y-1.5 bg-white/[0.03] rounded-lg p-2">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titel" className={`w-full ${INPUT_CLS}`} />
              <div className="flex flex-wrap items-center gap-2">
                <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} className={INPUT_CLS} />
                <label className="flex items-center gap-1 text-[10px] text-gray-500">
                  Plätze
                  <input type="number" min={1} value={form.capacity} placeholder="∞" onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className={`w-16 ${INPUT_CLS}`} />
                </label>
              </div>
              <input value={form.meetingUrl} onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="Treffpunkt-Link (z.B. Discord-Voice-Kanal)" className={`w-full ${INPUT_CLS}`} />
              <input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} maxLength={200} placeholder="Hinweis an die Teilnehmer (optional)" className={`w-full ${INPUT_CLS}`} />
              {s.seriesId && (
                <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <input type="checkbox" checked={form.wholeSeries} onChange={e => setForm(f => ({ ...f, wholeSeries: e.target.checked }))} />
                  Für diesen und alle folgenden Termine der Serie übernehmen (Zeit wird um dieselbe Differenz verschoben)
                </label>
              )}
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
                <Button size="sm" loading={busy === s.id} disabled={!form.title.trim() || !form.startAt} onClick={() => save(s)}>Speichern</Button>
              </div>
            </div>
          ) : deleting?.id === s.id ? (
            <div key={s.id} className="space-y-1.5 bg-red-500/[0.06] border border-red-500/20 rounded-lg p-2">
              <p className="text-xs text-gray-200">„{s.title}“ gehört zu einer Serie. Was absagen?</p>
              <input value={deleting.message} onChange={e => setDeleting({ id: s.id, message: e.target.value })} maxLength={200}
                placeholder="Hinweis an die Teilnehmer (optional)" className={`w-full ${INPUT_CLS}`} />
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>Abbrechen</Button>
                <Button size="sm" variant="outline" onClick={() => removeSeries(s, "single", deleting.message)}>Nur diesen Termin</Button>
                <Button size="sm" variant="danger" onClick={() => removeSeries(s, "series", deleting.message)}>Diesen + alle folgenden</Button>
              </div>
            </div>
          ) : (
            <div key={s.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-gray-300 truncate">
                  {s.title} — {formatBerlinDateTime(s.startAt)}
                  {s.seriesId && <span className="text-gray-600"> · Serie</span>}
                  {s.meetingUrl && <> · <MeetingLink url={s.meetingUrl} /></>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setOpenParticipants(openParticipants === s.id ? null : s.id)}
                    className="text-gray-500 hover:text-teal-400 transition-colors" aria-expanded={openParticipants === s.id}>
                    {s._count.signups}{s.capacity != null ? `/${s.capacity}` : ""} angemeldet{(s.waitlistCount ?? 0) > 0 ? ` · ${s.waitlistCount} wartend` : ""}
                  </button>
                  {onDuplicate && (
                    <button title="Duplizieren (Vorschlag: eine Woche später)" aria-label="Termin duplizieren"
                      onClick={() => onDuplicate({
                        title: s.title, body: s.description ?? "",
                        startAt: toLocalInput(new Date(new Date(s.startAt).getTime() + 7 * 86_400_000)),
                        capacity: s.capacity != null ? String(s.capacity) : undefined, eventId: s.eventId ?? undefined,
                        meetingUrl: s.meetingUrl ?? undefined,
                      })}
                      className="p-1 text-gray-600 hover:text-teal-400 transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <EditDeleteBar onEdit={() => startEdit(s)} onDelete={() => remove(s)} />
                </span>
              </div>
              {openParticipants === s.id && (
                <p className="pl-3 text-[11px] text-gray-500">
                  {s.participants && s.participants.length > 0
                    ? s.participants.map(p => p.username ?? p.name ?? "?").join(", ")
                    : "Noch keine Anmeldungen."}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-1.5">
          {mine.length > 0 && <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Weitere Termine</p>}
          {others.map(s => {
            const full = s.capacity != null && s._count.signups >= s.capacity;
            return (
              <div key={s.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-gray-300 truncate">{s.title} — {formatBerlinDateTime(s.startAt)}
                  <span className="text-gray-600"> · {s.coach.username ?? s.coach.name}<JobBadge userId={s.coach.id} variant="compact" className="ml-1" /></span>
                  {s.signedUp && s.meetingUrl && <> · <MeetingLink url={s.meetingUrl} /></>}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-600">{s._count.signups}{s.capacity != null ? `/${s.capacity}` : ""} angemeldet</span>
                  {s.signedUp ? (
                    <Button size="sm" variant="ghost" disabled={busy === s.id}
                      onClick={() => run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}/signup`, { method: "DELETE" }), "Abgemeldet")}>Abmelden</Button>
                  ) : s.onWaitlist ? (
                    <Button size="sm" variant="ghost" disabled={busy === s.id}
                      onClick={() => run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}/waitlist`, { method: "DELETE" }), "Von der Warteliste entfernt")}>
                      Warteliste verlassen
                    </Button>
                  ) : full ? (
                    <Button size="sm" variant="outline" disabled={busy === s.id}
                      onClick={() => run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}/waitlist`, { method: "POST" }), "Du stehst auf der Warteliste")}>
                      Auf Warteliste{(s.waitlistCount ?? 0) > 0 ? ` (${s.waitlistCount})` : ""}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy === s.id}
                      onClick={() => run(s.id, () => api(`/api/community-jobs/coach/training-sessions/${s.id}/signup`, { method: "POST" }), "Angemeldet")}>
                      Anmelden
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialogElement}
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
  const average = items.length > 0 ? items.reduce((sum, r) => sum + r.stars, 0) / items.length : 0;
  return (
    <div className="pt-3 mt-3 border-t border-white/[0.04] space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Meine Bewertungen</p>
        {items.length > 0 && <Button size="sm" variant="ghost" onClick={() => setDisputeOpen(true)}>Ansehen/Anfechten</Button>}
      </div>
      {items.length === 0 && <p className="text-xs text-gray-600">Noch keine Bewertungen erhalten.</p>}
      {items.length > 0 && (
        <>
          <p className="text-xs text-gray-300 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-semibold">{average.toFixed(1)}</span>
            <span className="text-gray-600">· {items.length} {items.length === 1 ? "Bewertung" : "Bewertungen"}</span>
          </p>
          <div className="space-y-1">
            {items.slice(0, 5).map(r => (
              <div key={r.id} className="text-[11px] text-gray-500 flex items-start gap-2">
                <span className="text-amber-400 shrink-0">{"★".repeat(r.stars)}<span className="text-gray-700">{"★".repeat(5 - r.stars)}</span></span>
                <span className="min-w-0">
                  <span className="text-gray-400">{r.rater.username ?? r.rater.name ?? "?"}:</span> {r.reason}
                  {r.disputed && <span className="text-amber-500"> · angefochten</span>}
                </span>
              </div>
            ))}
            {items.length > 5 && <p className="text-[10px] text-gray-600">+{items.length - 5} weitere unter „Ansehen/Anfechten“</p>}
          </div>
        </>
      )}
      <DisputeVotesModal open={disputeOpen} onClose={() => setDisputeOpen(false)} kind="coachRating"
        fetchUrl="/api/community-jobs/coach/ratings" listKey="ratings" voterField="rater" />
    </div>
  );
}

function IdeaList() {
  const [items, setItems] = useState<{ id: string; title: string; description?: string; status: string; lifecycle?: string; category?: string | null; version?: number; _count: { votes: number } }[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editNote, setEditNote] = useState("");

  function reload() {
    api<{ ideas: typeof items }>("/api/community-jobs/ideas?mine=1").then(d => setItems(d.ideas)).catch(() => {});
  }
  useEffect(reload, []);

  async function save(id: string) {
    try {
      await api(`/api/community-jobs/ideas/${id}`, { method: "PATCH", body: JSON.stringify({ title, description, editNote }) });
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
          {i._count.votes > 0 && (
            <input value={editNote} onChange={e => setEditNote(e.target.value)} maxLength={200} placeholder="Was hast du geändert? (alle Bewerter werden informiert und dürfen neu bewerten)"
              className="w-full bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600" />
          )}
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Abbrechen</Button>
            <Button size="sm" onClick={() => save(i.id)}>Speichern</Button>
          </div>
        </div>
      ) : (
        <div key={i.id} className="flex items-center justify-between text-xs">
          <span className="min-w-0">
            <Link href={`/community-board/idea/${i.id}`} className="block text-gray-300 truncate hover:text-teal-300 transition-colors">{i.title}{(i.version ?? 1) > 1 && <span className="ml-1.5 text-[10px] text-gray-600">v{i.version}</span>}</Link>
            {(i.category || (i.lifecycle && i.lifecycle !== "OPEN")) && (
              <span className="block text-[10px] text-gray-600 truncate">
                {ideaCategoryLabel(i.category)}
                {i.lifecycle && i.lifecycle !== "OPEN" && <span className={`${i.category ? "ml-1.5 " : ""}${i.lifecycle === "DONE" ? "text-emerald-400" : "text-amber-400/90"}`}>{ideaLifecycleMeta(i.lifecycle).label}</span>}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 shrink-0 ml-2">
            {i.status === "CLOSED"
              ? <Badge tone="neutral">Beendet</Badge>
              : <button onClick={() => close(i.id)} className="text-[10px] text-gray-600 hover:text-amber-400 transition-colors">Beenden</button>}
            <VoteRow upvotes={i._count.votes} votedByMe={false} />
            <EditDeleteBar onEdit={() => { setEditing(i.id); setTitle(i.title); setDescription(i.description ?? ""); setEditNote(""); }} onDelete={() => remove(i.id)} />
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Erstellungs-Formulare ─────────────────────────────────────────────────────

function CreateContentForm({ jobKey, eventId, prefill, onDone }: { jobKey: string; eventId?: string; prefill?: PostPrefill; onDone: () => void }) {
  const [coachKind, setCoachKind] = useState<"session" | "guide">("session");
  if (jobKey === "journalist") return <ReportEditor eventId={eventId} recap={prefill?.recap} prefill={prefill} onDone={onDone} />;
  if (jobKey === "coach") {
    return (
      <div className="space-y-3">
        <div className="flex gap-1.5">
          <Button size="sm" variant={coachKind === "session" ? "primary" : "outline"} onClick={() => setCoachKind("session")}>Trainings-Termin</Button>
          <Button size="sm" variant={coachKind === "guide" ? "primary" : "outline"} onClick={() => setCoachKind("guide")}>Anleitung</Button>
        </div>
        {coachKind === "session"
          ? <TextContentForm jobKey={jobKey} eventId={eventId} prefill={prefill} onDone={onDone} />
          : <GuideForm onDone={onDone} />}
      </div>
    );
  }
  if (jobKey === "fotograf") return <UploadAssetForm eventId={eventId} requestId={prefill?.photoRequestId} startCollage={prefill?.collage} onDone={onDone} />;
  if (jobKey === "visionaer") {
    return <IdeaForm prefill={{ title: prefill?.title, body: prefill?.body, link: prefill?.link, linkLabel: prefill?.linkLabel, eventId }} onDone={onDone} />;
  }
  if (jobKey === "marketing_manager") return <CreateMarketingPostForm eventId={eventId} prefill={prefill} onDone={onDone} />;
  return <TextContentForm jobKey={jobKey} eventId={eventId} prefill={prefill} onDone={onDone} />;
}

/** Journalist (Bericht), Coach (Trainings-Termin), Visionär (Idee) — alle drei sind Titel + Text. */
interface DiscordChannel { id: string; name: string; category: string | null }

/** Coach: Einsteiger-Anleitung fürs Community-Board (wird per Daumen-hoch bewertet, zählt in den Score). */
function GuideForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/coach/guides", { method: "POST", body: JSON.stringify({ title, game: game || undefined, bodyMarkdown: body }) });
      toast.success("Anleitung veröffentlicht");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Titel, z.B. „Erste Schritte in R6 Siege“"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <input value={game} onChange={e => setGame(e.target.value)} maxLength={40} placeholder="Spiel (optional)"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={6000} rows={9} placeholder="Deine Tipps und Schritte — Links werden im Board klickbar."
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!title.trim() || !body.trim()} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
      </div>
    </div>
  );
}

function TextContentForm({ jobKey, eventId, prefill, onDone }: { jobKey: string; eventId?: string; prefill?: PostPrefill; onDone: () => void }) {
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [body, setBody] = useState(prefill?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [startAt, setStartAt] = useState(() => prefill?.startAt ?? defaultTrainingStart());
  const [capacity, setCapacity] = useState(prefill?.capacity ?? "");
  const [coachEventId, setCoachEventId] = useState(prefill?.eventId ?? eventId ?? "");
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [meetingUrl, setMeetingUrl] = useState(prefill?.meetingUrl ?? "");
  const [events, setEvents] = useState<EventOption[]>([]);

  useEffect(() => {
    if (jobKey !== "coach") return;
    api<{ channels: DiscordChannel[] }>("/api/community-jobs/discord-channels").then(d => setChannels(d.channels)).catch(() => {});
    api<EventOption[]>("/api/events").then(all => {
      const upcoming = all.filter(e => new Date(e.startAt).getTime() > Date.now());
      setEvents(upcoming);
      // Vom Event aus gestartet (Empfehlung): Titel vorschlagen, wenn noch keiner da ist.
      const preset = upcoming.find(e => e.id === (prefill?.eventId ?? eventId));
      if (preset) setTitle(t => t || `Vorbereitung: ${preset.title}`);
    }).catch(() => {});
  }, [jobKey]); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Öffnen laden

  async function submit() {
    setBusy(true);
    try {
      if (jobKey === "coach") {
        await api("/api/community-jobs/coach/training-sessions", {
          method: "POST", body: JSON.stringify({
            title, description: body, startAt: new Date(startAt).toISOString(),
            capacity: capacity.trim() ? Number(capacity) : undefined,
            eventId: coachEventId || undefined, repeatWeeks: repeatWeeks > 1 ? repeatWeeks : undefined,
            meetingUrl: meetingUrl.trim() || undefined,
            discordChannelId: channelId || undefined,
          }),
        });
      } else if (jobKey === "visionaer") {
        await api("/api/community-jobs/ideas", { method: "POST", body: JSON.stringify({ title, description: withLink(body, prefill?.link) }) });
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
      {prefill?.link && (
        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Tag className="w-3 h-3" /> Link zu {prefill.linkLabel ?? "dem Spiel"} wird automatisch angehängt.
        </p>
      )}
      {jobKey === "coach" && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-[11px] text-gray-500">
              Beginn
              <input type="datetime-local" value={startAt} min={toLocalInput(new Date())} onChange={e => setStartAt(e.target.value)}
                className="block bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/40" />
            </label>
            <label className="space-y-1 text-[11px] text-gray-500">
              Plätze (optional)
              <input type="number" min={1} value={capacity} placeholder="unbegrenzt" onChange={e => setCapacity(e.target.value)}
                className="block w-28 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-[11px] text-gray-500 flex-1 min-w-[200px]">
              Vorbereitung für Event (optional)
              <Select value={coachEventId} className="w-full" onChange={e => {
                setCoachEventId(e.target.value);
                const ev = events.find(x => x.id === e.target.value);
                if (ev) setTitle(t => t || `Vorbereitung: ${ev.title}`);
              }}>
                <option value="">Kein Event</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} — {formatBerlinDate(ev.startAt)}</option>)}
              </Select>
            </label>
            <label className="space-y-1 text-[11px] text-gray-500">
              Wiederholung
              <Select value={String(repeatWeeks)} className="w-full" onChange={e => setRepeatWeeks(Number(e.target.value))}>
                <option value="1">Einmalig</option>
                <option value="4">Wöchentlich, 4 Termine</option>
                <option value="8">Wöchentlich, 8 Termine</option>
              </Select>
            </label>
          </div>
          <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} maxLength={300} placeholder="Treffpunkt-Link (optional, z.B. Discord-Voice-Kanal)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
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
        <Button loading={busy} disabled={!title.trim() || !body.trim() || (jobKey === "coach" && !startAt)} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>
          Veröffentlichen
        </Button>
      </div>
    </div>
  );
}

// "CLIP" heißt hier bewusst "Clip-Vorschaubild" statt "Highlight-Clip" — dieses
// Dropdown gilt nur im Bild-gestalten-Pfad (Studio-Export), das echte Video
// lädt man über den zweiten Modus ("Video-Clip hochladen", ClipUploadField).
const ASSET_TYPE_OPTIONS = [
  { value: "CLIP", label: "Clip-Vorschaubild" },
  { value: "COLLAGE", label: "Collage" },
  { value: "SCREENSHOT", label: "Screenshot" },
  { value: "BANNER", label: "Event-Banner" },
  { value: "GRAPHIC", label: "Grafik" },
];

type AssetUploadMode = "design" | "clip" | "bulk" | "collage";

function UploadAssetForm({ eventId, requestId, startCollage, onDone }: { eventId?: string; requestId?: string; startCollage?: boolean; onDone: () => void }) {
  const [mode, setMode] = useState<AssetUploadMode>(startCollage ? "collage" : "design");
  const [albumId, setAlbumId] = useState("");
  const { albums } = useAlbums();
  const [url, setUrl] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [type, setType] = useState("SCREENSHOT");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/media", { method: "POST", body: JSON.stringify({ type, url, caption: caption || undefined, eventId, requestId, albumId: albumId || undefined }) });
      toast.success("Hochgeladen");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setUrl("");
    setIsVideo(false);
  }

  if (mode === "bulk" && !url) {
    return (
      <div className="space-y-3">
        <UploadModeTabs mode={mode} onChange={setMode} />
        <BulkUploadForm eventId={eventId} onDone={onDone} />
      </div>
    );
  }

  if (!url) {
    return (
      <div className="space-y-3">
        <UploadModeTabs mode={mode} onChange={setMode} />
        <p className="text-[10px] text-gray-600">
          {mode === "design"
            ? "Screenshot/Foto mit Vorlage + Logo zu einer Grafik zusammenstellen (z.B. Collage, Banner oder Vorschaubild für einen Clip). Format, Logo und Wasserzeichen sind wählbar."
            : mode === "clip" ? "Lädt eine echte Videodatei hoch (z.B. einen Highlight-Clip)."
            : "Stellt aus den beliebtesten Bildern der Community eine Monats-Collage zusammen."}
        </p>
        {mode === "design" && <StudioEditor allowWatermark onExported={u => { setUrl(u); setIsVideo(false); }} />}
        {mode === "clip" && <ClipUploadField onUploaded={u => { setUrl(u); setIsVideo(true); setType("CLIP"); }} />}
        {mode === "collage" && <MonthCollageBuilder onExported={(u, cap) => { setUrl(u); setIsVideo(false); setType("COLLAGE"); setCaption(cap); }} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isVideo ? (
        <video src={url} controls className="w-full rounded-lg" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- Vorschau des Studio-Exports, beliebiger Blob-Host
        <img src={url} alt="" className="w-full rounded-lg" />
      )}
      {!isVideo && (
        <Select value={type} onChange={e => setType(e.target.value)} className="w-full">
          {ASSET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
      <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Bildunterschrift (optional)"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      <AlbumSelect albums={albums} value={albumId} onChange={setAlbumId} />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={reset}>{isVideo ? "Anderer Clip" : "Neu gestalten"}</Button>
        <Button loading={busy} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Hochladen</Button>
      </div>
    </div>
  );
}

function UploadModeTabs({ mode, onChange }: { mode: AssetUploadMode; onChange: (m: AssetUploadMode) => void }) {
  const tabs: { id: AssetUploadMode; label: string }[] = [
    { id: "design", label: "Bild gestalten" }, { id: "bulk", label: "Mehrere Bilder" },
    { id: "clip", label: "Video-Clip" }, { id: "collage", label: "Monats-Collage" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map(t => <Button key={t.id} size="sm" variant={mode === t.id ? "primary" : "outline"} onClick={() => onChange(t.id)}>{t.label}</Button>)}
    </div>
  );
}

/**
 * Lädt eine Video-Datei direkt aus dem Browser zu Vercel Blob hoch (siehe
 * /api/community-jobs/media/clip-upload) — Video-Dateien sind zu groß fürs
 * Body-Limit einer normalen Server-Route wie /api/upload. Die eigentliche
 * Größen-/Typ-Grenze erzwingt Vercel Blob serverseitig über das Upload-Token;
 * die Prüfung hier ist nur ein schneller Client-Check ohne Netzwerk-Rundtrip.
 */
function ClipUploadField({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    if (!CLIP_ALLOWED_TYPES.includes(file.type as (typeof CLIP_ALLOWED_TYPES)[number])) {
      toast.error("Nur MP4, WebM oder MOV erlaubt");
      return;
    }
    if (file.size > CLIP_MAX_BYTES) {
      toast.error(`Datei zu groß (max. ${Math.round(CLIP_MAX_BYTES / 1_000_000)} MB)`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const ext = CLIP_EXTENSION_BY_MIME[file.type as (typeof CLIP_ALLOWED_TYPES)[number]];
      const blob = await upload(`${CLIP_UPLOAD_PREFIX}${crypto.randomUUID()}.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/community-jobs/media/clip-upload",
        contentType: file.type,
        onUploadProgress: p => setProgress(p.percentage),
      });
      onUploaded(blob.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-10 cursor-pointer hover:border-teal-500/30 transition-colors">
      {uploading ? <Loader2 className="w-5 h-5 text-gray-500 animate-spin" /> : <Upload className="w-5 h-5 text-gray-500" />}
      <span className="text-xs text-gray-500">{uploading ? `Wird hochgeladen… ${Math.round(progress)}%` : "Video-Clip auswählen"}</span>
      {uploading && (
        <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-teal-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <span className="text-[10px] text-gray-700">MP4, WebM oder MOV — max. {Math.round(CLIP_MAX_BYTES / 1_000_000)} MB</span>
      <input type="file" accept={CLIP_ALLOWED_TYPES.join(",")} className="hidden" disabled={uploading}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </label>
  );
}

interface EventOption { id: string; title: string; startAt: string }

type PostImageMode = "none" | "library" | "studio" | "upload";

function CreateMarketingPostForm({ eventId: initialEventId, prefill, onDone }: { eventId?: string; prefill?: PostPrefill; onDone: () => void }) {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState(initialEventId ?? "");
  const [caption, setCaption] = useState(prefill?.body ?? "");
  const [assetId, setAssetId] = useState(prefill?.assetId ?? "");
  const [studioImageUrl, setStudioImageUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState(prefill?.imageUrl ?? "");
  const [imageMode, setImageMode] = useState<PostImageMode>(prefill?.assetId ? "library" : prefill?.imageUrl ? "upload" : "none");
  const [assets, setAssets] = useState<{ id: string; caption: string | null; url: string }[]>([]);
  const [related, setRelated] = useState<{ id: string; caption: string | null; url: string }[]>([]);
  const [assetQuery, setAssetQuery] = useState("");
  const [facts, setFacts] = useState<MarketingEventFacts | null>(null);
  const [templateId, setTemplateId] = useState<MarketingTemplateId>(isMarketingTemplate(prefill?.template) ? prefill.template : "announce");
  const [usedTemplate, setUsedTemplate] = useState<MarketingTemplateId | undefined>(undefined);
  const [includeLink, setIncludeLink] = useState(true);
  const [preview, setPreview] = useState(false);
  const autoApplied = useRef(false);
  const lastEventTitle = useRef(prefill?.fromEventTitle);
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
  }, []);

  // Marketing-Post-Bild muss ein Standbild sein — Video-Clips aus der Mediathek ausschließen. Mit Suche (leicht verzögert).
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (assetQuery.trim()) params.set("q", assetQuery.trim());
      api<{ assets: typeof assets }>(`/api/community-jobs/media?${params}`).then(d => setAssets(d.assets.filter(a => !isVideoUrl(a.url)))).catch(() => {});
    }, assetQuery ? 250 : 0);
    return () => clearTimeout(handle);
  }, [assetQuery]);

  // Event-Fakten laden (Datum, Spiel, Anmeldungen, Link) — Grundlage für die Vorlagen.
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    api<MarketingEventFacts>(`/api/community-jobs/marketing-posts/facts?eventId=${encodeURIComponent(eventId)}`)
      .then(f => { if (!cancelled) setFacts(f); }).catch(() => { if (!cancelled) setFacts(null); });
    return () => { cancelled = true; };
  }, [eventId]);

  // Passende Bilder zum Event (gleiches Event oder gleiches Spiel) — nur im Mediathek-Modus nötig.
  useEffect(() => {
    if (imageMode !== "library" || !eventId) return;
    api<{ assets: typeof related }>(`/api/community-jobs/media?relatedEventId=${encodeURIComponent(eventId)}&take=8`)
      .then(d => setRelated(d.assets.filter(a => !isVideoUrl(a.url)))).catch(() => {});
  }, [imageMode, eventId]);

  useEffect(() => {
    if (!facts) return;
    // Leerer Text: einmalig mit dem gewählten Baustein vorbelegen.
    if (!autoApplied.current && !caption.trim()) {
      autoApplied.current = true;
      setCaption(buildMarketingText(templateId, facts));
      setUsedTemplate(templateId);
    }
    // "Als Vorlage": Event-Titel des Originals durch den neuen ersetzen.
    const old = lastEventTitle.current;
    if (old && old !== facts.title && caption.includes(old)) {
      setCaption(caption.split(old).join(facts.title));
      lastEventTitle.current = facts.title;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur auf neue Event-Fakten reagieren
  }, [facts]);

  function applyTemplate() {
    if (!facts) return;
    if (caption.trim() && !confirm("Den aktuellen Text durch die Vorlage ersetzen?")) return;
    setCaption(buildMarketingText(templateId, facts));
    setUsedTemplate(templateId);
    lastEventTitle.current = undefined;
  }

  const finalText = facts && includeLink ? withEventLink(caption, facts, true) : caption;
  const previewImage = imageMode === "library" ? [...related, ...assets].find(a => a.id === assetId)?.url
    : imageMode === "studio" ? studioImageUrl : imageMode === "upload" ? uploadedImageUrl : "";

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/marketing-posts", {
        method: "POST", body: JSON.stringify({
          eventId, caption: withLink(finalText, prefill?.link),
          campaignId: prefill?.campaignId, kind: usedTemplate ?? (isMarketingTemplate(prefill?.template) ? prefill.template : undefined),
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
      <Select value={eventId} onChange={e => setEventId(e.target.value)} disabled={!!prefill?.campaignId} className="w-full">
        {events.map(e => <option key={e.id} value={e.id}>{e.title} — {formatBerlinDate(e.startAt)}</option>)}
      </Select>

      <div className="flex gap-1.5">
        <Button size="sm" variant={imageMode === "none" ? "primary" : "outline"} onClick={() => setImageMode("none")}>Kein Bild</Button>
        {(assets.length > 0 || assetQuery) && (
          <Button size="sm" variant={imageMode === "library" ? "primary" : "outline"} onClick={() => setImageMode("library")}>Aus Mediathek</Button>
        )}
        <Button size="sm" variant={imageMode === "studio" ? "primary" : "outline"} onClick={() => setImageMode("studio")}>Im Studio erstellen</Button>
        <Button size="sm" variant={imageMode === "upload" ? "primary" : "outline"} onClick={() => setImageMode("upload")}>Eigenes Bild hochladen</Button>
      </div>

      {imageMode === "library" && (
        <div className="space-y-1.5">
          {related.length > 0 && !assetQuery && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500">Passend zum Event (gleiches Event oder Spiel)</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {related.map(a => (
                  <button key={a.id} onClick={() => setAssetId(a.id)} aria-pressed={assetId === a.id} title={a.caption ?? undefined}
                    className={`shrink-0 rounded-lg overflow-hidden border-2 ${assetId === a.id ? "border-teal-400" : "border-transparent hover:border-white/20"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau, beliebiger Blob-Host */}
                    <img src={a.url} alt="" className="w-16 h-12 object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <input value={assetQuery} onChange={e => setAssetQuery(e.target.value)} placeholder="Mediathek durchsuchen (Unterschrift, Event, Fotograf)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
          <Select value={assetId} onChange={e => setAssetId(e.target.value)} className="w-full">
            <option value="">{assets.length === 0 ? "Nichts gefunden" : "Bild wählen…"}</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.caption ?? a.id}</option>)}
          </Select>
        </div>
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

      <div className="flex flex-wrap items-center gap-1.5">
        <Select size="sm" value={templateId} onChange={e => setTemplateId(e.target.value as MarketingTemplateId)} aria-label="Werbetext-Baustein">
          {MARKETING_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </Select>
        <Button size="sm" variant="outline" disabled={!facts} onClick={applyTemplate}>Text aus Vorlage</Button>
        <label className="flex items-center gap-1.5 text-xs text-gray-400" title="Hängt „Jetzt anmelden“ mit dem Link zur Event-Seite an">
          <input type="checkbox" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} />
          Anmelde-Link
        </label>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setPreview(v => !v)}>{preview ? "Bearbeiten" : "Vorschau"}</Button>
      </div>
      {preview ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
          {previewImage && (
            // eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebiger Blob-Host
            <img src={previewImage} alt="" className="w-full rounded-lg" />
          )}
          <p className="text-sm text-gray-200 whitespace-pre-line break-words">{withLink(finalText, prefill?.link) || "—"}</p>
        </div>
      ) : (
        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Werbetext" rows={6}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-y" />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} disabled={!eventId || !caption.trim()} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
      </div>
    </div>
  );
}

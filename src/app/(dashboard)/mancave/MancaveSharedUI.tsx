"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  Trophy, Package, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2, Wrench, Lock,
  ArrowUpCircle, ArrowDownCircle, ArrowLeft, FlaskConical, Home, Mail, Briefcase, BarChart3, Loader2,
  Check, Sparkles,
} from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { useNow } from "@/lib/useNow";
import { computeAccrual, formatDuration, getJob } from "@/lib/jobs";
import { RANKS } from "@/lib/ranks";
import type { JobListEntry, JobOverview } from "@/lib/job-service";
import type { MancaveData } from "./mancave-data";
import { cn } from "@/lib/utils";

export type MancavePanel = "trophy" | "items" | "jobs" | "mail" | null;

/**
 * Wie viele Benachrichtigungen gerade anliegen (neue Jobs verfügbar,
 * bezahlbare Upgrades) — treibt den Mail-Badge im Monitor-Dock. Rein aus den
 * ohnehin geladenen Daten berechnet, kein eigener "gelesen"-Zustand (siehe
 * MailPanel-Kommentar).
 */
function notificationCount(data: MancaveData): number {
  const jobCount = data.jobs.jobs.filter(j => j.unlocked && !j.isCurrent).length;
  const upgradeCount = data.items.filter(i => i.nextCost !== null && i.nextCost <= data.totalPoints).length;
  return jobCount + upgradeCount;
}

const PANEL_TITLES: Record<Exclude<MancavePanel, null>, string> = {
  trophy: "Statistik", items: "Ausbau", jobs: "Jobbörse", mail: "Postfach",
};

/**
 * "Echter Desktop"-Look: dunkler Hintergrund mit großem, blassem OMA-Logo
 * als Wallpaper-Wasserzeichen (wie ein echter PC-Desktop), oben rechts eine
 * schmale "System-Tray"-Leiste (Rang + Münzen), unten ein Dock/Taskbar mit
 * den Panel-Icons. Rendert bei fester Pixelgröße (siehe SCREEN_CONTENT_W/H
 * in MancaveScene3D.tsx), daher feste px-Werte statt vw-Clamp-Werten.
 *
 * Verwaltet den geöffneten Panel-Zustand SELBST (statt über die 3D-Szene) —
 * ein Klick auf ein Dock-Icon öffnet das Panel DIREKT AUF DEM MONITOR
 * (schmale Titelleiste mit Zurück-Pfeil + scrollbarer Inhalt), statt eines
 * bildschirmfüllenden Popups. User-Wunsch: "Anzeige bleibt auf dem Monitor".
 * Der separate Pokale-Hotspot auf dem Schreibtisch (SHELF_POS) nutzt weiter
 * das große Popup — das ist bewusst unverändert, hat nichts mit dem Monitor
 * zu tun.
 */
export function MonitorScreenContent({ data }: { data: MancaveData }) {
  const [view, setView] = useState<MancavePanel>(null);
  const notifs = notificationCount(data);

  if (view) {
    return (
      <div className="relative w-full h-full flex flex-col select-none" style={{ background: "#05100d" }}>
        <div className="shrink-0 flex items-center gap-1.5 px-2" style={{ height: 20, background: "rgba(8,16,15,0.9)", borderBottom: "1px solid rgba(45,212,191,0.15)" }}>
          <button onClick={() => setView(null)} aria-label="Zurück zum Desktop"
            className="flex items-center justify-center rounded hover:bg-white/10 transition-colors" style={{ width: 14, height: 14 }}>
            <ArrowLeft className="text-teal-300" style={{ width: 10, height: 10 }} />
          </button>
          <span className="text-teal-200 font-semibold" style={{ fontSize: 9 }}>{PANEL_TITLES[view]}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2" style={{ fontSize: 9 }}>
          <div style={{ transform: "scale(0.72)", transformOrigin: "top left", width: "138.9%" }}>
            {view === "trophy" && <TrophyPanel data={data} />}
            {view === "items" && <ItemsPanel data={data} />}
            {view === "jobs" && <JobsPanel data={data} />}
            {view === "mail" && <MailPanel data={data} onOpenPanel={setView} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ background: "#05100d" }}>
      {/* Wallpaper: OMA-Logo als blasses, zentriertes Wasserzeichen */}
      <div className="absolute inset-0" style={{
        backgroundImage: "url(/OMALogoNew.png)", backgroundRepeat: "no-repeat",
        backgroundPosition: "center", backgroundSize: "62%", opacity: 0.1,
      }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(13,59,54,0.35), rgba(3,8,7,0.85) 75%)" }} />

      {/* System-Tray oben rechts: Rang + Münzen, wie eine echte OS-Menüleiste */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-end gap-2.5 px-3" style={{ height: 22 }}>
        <span className={`font-bold leading-none ${data.rankColor}`} style={{ fontSize: 10 }}>
          {data.rankLabel} <span className="text-teal-300/60 font-normal">#{data.leaderboardRank}</span>
        </span>
        <span className="flex items-center gap-1 text-amber-300 font-semibold tabular-nums leading-none" style={{ fontSize: 10 }}>
          <CoinIcon size={10} />{data.totalPoints.toLocaleString("de-DE")}
        </span>
      </div>
      <div className="absolute top-[22px] inset-x-0 h-px" style={{ background: "rgba(45,212,191,0.15)" }} />

      {/* Rang-Fortschritt, dezent wie ein Desktop-Widget in der Ecke */}
      <div className="absolute left-3 bottom-[46px] w-[110px]">
        <div className="h-1 rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
        </div>
      </div>

      {/* Taskbar/Dock unten — jedes Icon öffnet sein Panel direkt auf dem Monitor */}
      <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-1.5">
        <div className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-lg"
          style={{ background: "rgba(8,16,15,0.65)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(2px)" }}>
          <DockIcon icon={<BarChart3 />} onClick={() => setView("trophy")} />
          <DockIcon icon={<Briefcase />} onClick={() => setView("jobs")} />
          <DockIcon icon={<Wrench />} onClick={() => setView("items")} />
          <DockIcon icon={<Mail />} badge={notifs} onClick={() => setView("mail")} />
        </div>
      </div>
    </div>
  );
}

function DockIcon({ icon, badge, onClick }: { icon: React.ReactNode; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="relative flex items-center justify-center rounded-[3px] transition-colors hover:brightness-125"
      style={{ width: 24, height: 24, background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)" }}>
      <span className="text-teal-300" style={{ width: 13, height: 13 }}>{icon}</span>
      {!!badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-rose-500 text-white font-bold leading-none"
          style={{ width: 10, height: 10, fontSize: 7 }}>
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

function tierLabel(tier: number): string {
  return RANKS.find(r => r.tier === tier)?.label ?? `Stufe ${tier}`;
}

const JOB_ACCENT: Record<JobListEntry["accent"], string> = {
  slate:  "border-white/[0.08]",
  teal:   "border-teal-500/25",
  violet: "border-violet-500/25",
  amber:  "border-amber-500/25",
  rose:   "border-rose-500/25",
};

/**
 * Job-Börse direkt am Rechner. Jobs hängen jetzt an `data.surfaceTier` statt
 * an einzelnen Möbeln (siehe jobs.ts) — höhere Mancave-Stufe schaltet
 * automatisch neue Stellen frei. Startet mit den server-seitig geladenen
 * Daten (kein Ladeblitzer beim Öffnen), lädt nach jeder Aktion nach.
 */
export function JobsPanel({ data }: { data: MancaveData }) {
  const router = useRouter();
  const now = useNow(1000);
  const [overview, setOverview] = useState<JobOverview>(data.jobs);
  const [acting, setActing] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState(0);

  async function reload() {
    const d: JobOverview = await fetch("/api/jobs").then(r => r.json()).catch(() => null);
    if (d && !("error" in d)) setOverview(d);
    router.refresh();
  }

  async function hire(job: JobListEntry) {
    setActing(job.key);
    try {
      const res  = await fetch("/api/jobs/hire", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: job.key }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Bewerbung fehlgeschlagen"); return; }
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 } });
      toast.success(
        body.autoClaimed > 0
          ? `${job.emoji} Eingestellt als ${job.label} — ${body.autoClaimed} Münzen vom alten Job abgerechnet`
          : `${job.emoji} Eingestellt als ${job.label}!`
      );
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setActing(null);
    }
  }

  async function quit() {
    if (!confirm("Wirklich kündigen? Der aufgelaufene Lohn wird ausgezahlt.")) return;
    setActing("__quit");
    try {
      const res  = await fetch("/api/jobs/quit", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Kündigung fehlgeschlagen"); return; }
      toast.success(body.paidOut > 0 ? `Gekündigt — ${body.paidOut} Münzen ausgezahlt` : "Gekündigt");
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setActing(null);
    }
  }

  async function claim() {
    setActing("__claim");
    try {
      const res  = await fetch("/api/jobs/claim", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Abholen fehlgeschlagen"); return; }
      setClaimedAt(Date.now());
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      toast.success(`+${body.coins} Münzen für ${formatDuration(body.countedMinutes)} Arbeit`);
      if (body.fired) toast.error(body.fired, { duration: 8000 });
      await reload();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setActing(null);
    }
  }

  if (!overview.enabled) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">Jobbörse</h3>
        </div>
        <p className="text-xs text-gray-600">Die Idle-Jobs sind gerade deaktiviert.</p>
      </div>
    );
  }

  const job = overview.current ? getJob(overview.current.jobKey) : null;
  const accrual = overview.current && job
    ? computeAccrual(
        job,
        Math.max(new Date(overview.current.accrualFrom!).getTime(), claimedAt),
        now,
        { wageCapHours: overview.wageCapHours, multiplierPct: overview.wageMultiplierPct },
      )
    : null;
  const canClaim = (accrual?.countedMinutes ?? 0) >= overview.minClaimMinutes;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pr-8">
        <Briefcase className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Jobbörse</h3>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Ein Job auf einmal. Der Lohn läuft stündlich auf und wartet bis zu {overview.wageCapHours} Stunden
        auf dich. Bessere Stellen verlangen einen höheren Rang <em>und</em> eine höhere Mancave-Stufe
        (aktuell: Stufe {overview.roomTier}).
      </p>

      {overview.current && job && accrual && (
        <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] p-3 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xl shrink-0">{job.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{job.label}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">
                seit {formatDuration(accrual.workedMinutes)} · {job.coinsPerHour} Münzen/h
              </p>
            </div>
            <p className="text-lg font-black text-amber-400 tabular-nums flex items-center gap-1 leading-none shrink-0">
              {accrual.coins.toLocaleString("de-DE")}<CoinIcon size={13} />
            </p>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className={cn(
              "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
              accrual.capped ? "from-rose-600 to-rose-400" : "from-teal-600 to-teal-400"
            )} style={{ width: `${Math.min(100, Math.round((accrual.countedMinutes / (overview.wageCapHours * 60)) * 100))}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={claim} disabled={acting !== null || !canClaim}
              title={!canClaim ? `Erst ab ${overview.minClaimMinutes} Minuten Arbeit` : undefined}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors",
                canClaim ? "bg-amber-500/20 border border-amber-500/30 text-amber-200 hover:bg-amber-500/30"
                         : "bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed"
              )}>
              {acting === "__claim" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CoinIcon size={12} />}
              Lohn abholen
            </button>
            <button onClick={quit} disabled={acting !== null}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/25 transition-colors disabled:opacity-50">
              {acting === "__quit" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Kündigen"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {overview.jobs.map(j => (
          <div key={j.key} className={cn(
            "rounded-xl border p-2.5 bg-white/[0.02] transition-opacity",
            JOB_ACCENT[j.accent], !j.unlocked && !j.isCurrent && "opacity-60"
          )}>
            <div className="flex items-start gap-2.5">
              <span className="text-lg shrink-0 leading-none mt-0.5">{j.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-white">{j.label}</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-0.5 tabular-nums">
                    {j.coinsPerHour}<CoinIcon size={8} />/h
                  </span>
                  {j.isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-300 font-semibold">Aktuell</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{j.flavor}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded border",
                    j.rankOk ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.04] border-white/[0.08] text-gray-500")}>
                    {j.rankOk ? "✓" : "🔒"} {tierLabel(j.minTier)}
                  </span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded border",
                    j.roomTierOk ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/[0.04] border-white/[0.08] text-gray-500")}>
                    {j.roomTierOk ? "✓" : "🔒"} Mancave-Stufe {j.minRoomTier}
                  </span>
                </div>
              </div>
              {!j.isCurrent ? (
                <button onClick={() => hire(j)} disabled={!j.unlocked || acting !== null}
                  className={cn(
                    "shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors self-center",
                    j.unlocked ? "bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25"
                               : "bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed"
                  )}>
                  {acting === j.key ? <Loader2 className="w-3 h-3 animate-spin" /> : !j.unlocked ? <Lock className="w-3 h-3" /> : "Bewerben"}
                </button>
              ) : <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 self-center" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "Postfach": zeigt gerade AKTUELL zutreffende Hinweise (neue erreichbare
 * Jobs, bezahlbare Upgrades) — bewusst kein persistenter Gelesen/Ungelesen-
 * Zustand (keine neue DB-Tabelle dafür), sondern live aus den ohnehin
 * geladenen Daten berechnet. Klick auf einen Eintrag springt direkt ins
 * passende Panel.
 */
export function MailPanel({ data, onOpenPanel }: { data: MancaveData; onOpenPanel: (p: MancavePanel) => void }) {
  const newJobs = data.jobs.jobs.filter(j => j.unlocked && !j.isCurrent);
  const affordable = data.items.filter(i => i.nextCost !== null && i.nextCost <= data.totalPoints);

  const empty = newJobs.length === 0 && affordable.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Postfach</h3>
      </div>
      {empty && (
        <p className="text-xs text-gray-600">Keine neuen Nachrichten — schau später wieder vorbei.</p>
      )}
      {newJobs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Neue Jobs verfügbar
          </p>
          {newJobs.map(j => (
            <button key={j.key} onClick={() => onOpenPanel("jobs")}
              className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <span className="text-base shrink-0">{j.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-200 truncate">{j.label} ist jetzt verfügbar</p>
                <p className="text-[10px] text-gray-500">{j.coinsPerHour} Münzen/Stunde</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {affordable.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
            <CoinIcon size={11} /> Genug Münzen für ein Upgrade
          </p>
          {affordable.map(i => (
            <button key={i.key} onClick={() => onOpenPanel("items")}
              className="w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <ArrowUpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-200 truncate">
                  {i.tier === 0 ? `${i.label} freischalten` : `${i.label} auf Stufe ${i.tier + 1}`}
                </p>
                <p className="text-[10px] text-gray-500">
                  {i.nextCost === 0 ? "Kostenlos (Testphase)" : `${i.nextCost!.toLocaleString("de-DE")} Münzen`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrophyPanel({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Pokale &amp; Abzeichen</h3>
      </div>
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-gray-300 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Pokale gewonnen.</p>}
      {data.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.badges.map(b => (
            <span key={b.key} title={`${b.name} — ${b.desc}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/[0.04] border border-white/[0.06]">
              {b.icon}
            </span>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1"><Package className="w-3 h-3" /> Aktivität & Spiele</p>
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" />
          <StatTile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" />
          <StatTile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" />
          <StatTile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Std." value={`${data.voiceHours}h`} color="text-teal-400" />
          <StatTile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" />
        </div>
        {data.topGames.length > 0 && (
          <p className="text-xs text-gray-300 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {data.topGames.slice(0, 3).join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Ausbau-Panel des neuen Mancave-Systems (siehe mancave-items.ts,
 * mancave-economy.ts) — Phase 1: nur Wirtschaft/Buttons, die Szene selbst
 * sieht optisch noch gleich aus, bis es Blender-Stufenvarianten gibt.
 * Boden/Wand/Fenster tauchen hier bewusst NICHT als eigene Kaufzeile auf —
 * ihre Stufe steigt automatisch mit (Durchschnitt aller Objekt-Stufen).
 */
export function ItemsPanel({ data }: { data: MancaveData }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, itemKey: string, fallbackError: string) {
    setPending(itemKey);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? fallbackError);
        return;
      }
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen");
    } finally {
      setPending(null);
    }
  }

  const upgrade   = (itemKey: string) => run("/api/mancave/upgrade", itemKey, "Konnte nicht aufgerüstet werden");
  const downgrade = (itemKey: string) => run("/api/mancave/downgrade", itemKey, "Konnte nicht zurückgestuft werden");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pr-8">
        <Wrench className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Ausbau</h3>
      </div>
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
        style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.22)" }}>
        <Home className="w-3.5 h-3.5 text-teal-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-teal-200">Boden/Wand/Fenster</span>
            <span className="text-[10px] font-bold text-teal-300 tabular-nums">Stufe {data.surfaceTier}/4</span>
          </div>
          <div className="mt-1 h-[3px] rounded-full overflow-hidden bg-white/10">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(data.surfaceTier / 4) * 100}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
          </div>
        </div>
      </div>
      {data.devFreeMode && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-amber-200"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <FlaskConical className="w-3 h-3 shrink-0" />
          Testphase: Upgrades sind kostenlos, Rückstufen ist möglich.
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <div className="space-y-1.5">
        {data.items.map(item => {
          const minTier = item.baseline ? 1 : 0;
          const canDowngrade = data.devFreeMode && item.tier > minTier;
          return (
          <div key={item.key} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
            <div className="min-w-0 flex items-center gap-2">
              {item.tier === 0 ? <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ArrowUpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs text-gray-200 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.tier === 0 ? "Nicht freigeschaltet" : `Stufe ${item.tier}/${item.maxTier}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canDowngrade && (
                <button
                  onClick={() => downgrade(item.key)}
                  disabled={pending === item.key}
                  aria-label={`${item.label} zurückstufen`}
                  className="flex items-center justify-center w-6 h-6 rounded-full disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                </button>
              )}
              {item.nextCost === null ? (
                <span className="text-[10px] text-amber-300/80 whitespace-nowrap">Max</span>
              ) : (
                <button
                  onClick={() => upgrade(item.key)}
                  disabled={pending === item.key}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap disabled:opacity-50"
                  style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: "#5eead4" }}
                >
                  {item.nextCost === 0 ? null : <CoinIcon size={10} />}
                  {pending === item.key ? "…" : item.nextCost === 0 ? "Gratis" : item.nextCost.toLocaleString("de-DE")}
                  {item.tier === 0 && " · Freischalten"}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

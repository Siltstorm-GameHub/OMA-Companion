"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "@/components/icons";

// Aus SeriesDetailClient.tsx ausgelagert: Typen, Konstanten und kleine Bausteine, die Hook und Reiter teilen.

export const inputCls = "w-full rounded-control px-3 py-2 text-sm text-fg outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const numCls   = "w-24 rounded-control px-3 py-2 text-sm text-fg outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const PLATFORMS: { value: string; label: string; icon: string }[] = [
  { value: "PC",     label: "PC",     icon: "🖥️" },
  { value: "Xbox",   label: "Xbox",   icon: "🟢" },
  { value: "PS",     label: "PS",     icon: "🔵" },
  { value: "Mobile", label: "Mobile", icon: "📱" },
];
export type SeriesEvent = {
  id: string; title: string; startAt: Date | string; endAt?: Date | string | null; status: string; slotIndex?: number | null;
  maxPlayers: number | null; hidden: boolean; tournamentStatus: string | null;
  _count: { registrations: number };
};
// "closed" heißt nur "voll" und braucht nach dem Termin trotzdem einen Abschluss
export const NOT_ACTIVE_STATUSES = ["finished", "archived", "cancelled"];
export type SettingsTabKey = "general" | "schedule" | "goal" | "rewards" | "polls" | "stats";
export const SETTINGS_TABS: { key: SettingsTabKey; label: string }[] = [
  { key: "general", label: "Allgemein" },
  { key: "schedule", label: "📅 Termine" },
  { key: "goal",    label: "🎯 Ziel" },
  { key: "rewards", label: "Belohnungen" },
  { key: "polls",   label: "Umfragen" },
  { key: "stats",   label: "Stats & Bonus" },
];
// Spiegelt die Logik der "Braucht Aufmerksamkeit"-Kacheln im Admin-Dashboard, damit man
// auch direkt in der Eventreihe sieht, welches Event gerade Handlung braucht.
export function needsAttention(ev: SeriesEvent): { label: string; href: string } | null {
  if (NOT_ACTIVE_STATUSES.includes(ev.status)) return null;

  if (ev.tournamentStatus === "active" || ev.tournamentStatus === "pending") {
    return {
      label: ev.tournamentStatus === "active" ? "Turnier läuft — Ergebnisse eintragen" : "Turnier bereit zum Start",
      href: `/events/verwalten/${ev.id}/bracket`,
    };
  }
  if (ev.status === "umfrage") {
    return { label: "Umfragephase läuft", href: `/events/verwalten/${ev.id}/complete` };
  }
  if (!ev.tournamentStatus && new Date(ev.startAt) < new Date()) {
    const running = ev.endAt && new Date(ev.endAt) > new Date();
    return { label: running ? "Läuft gerade" : "Vorbei, noch nicht abgeschlossen", href: `/events/verwalten/${ev.id}` };
  }
  return null;
}
export type User = { id: string; name: string | null; username: string | null; image: string | null };
export type PlacementReward = { place: number; coins: number; rankPoints: number };
export type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
export type PollConfig = {
  label: string;
  question: string;
  voterEligibility: "all" | "participants" | "players" | "spectators";
  answerType: "players" | "spectators" | "custom";
  customAnswers: string[];
  startOffsetHours: number;
  endOffsetHours: number;
  participationCoins: number;
  participationSeriesPoints: number;
  winnerCoins: number;
  winnerRankPoints: number;
};
export const DEFAULT_REWARDS: RewardsConfig = {
  participationCoins: 10,
  placements: [
    { place: 1, coins: 500, rankPoints: 3 },
    { place: 2, coins: 250, rankPoints: 2 },
    { place: 3, coins: 100, rankPoints: 1 },
  ],
};
export const DEFAULT_POLL_ITEM: PollConfig = {
  label: "MVP",
  question: "Wer war der MVP?",
  voterEligibility: "participants",
  answerType: "players",
  customAnswers: [],
  startOffsetHours: 0,
  endOffsetHours: 24,
  participationCoins: 10,
  participationSeriesPoints: 0,
  winnerCoins: 100,
  winnerRankPoints: 0,
};
export const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  // Gleiche Begriffe wie in der Übersicht "Verwalten" (lib/event-manage.ts statusText)
  open:     { label: "Anmeldung offen", cls: "text-primary-fg bg-primary-soft border-primary/30" },
  closed:   { label: "Voll",            cls: "text-primary-fg bg-primary-soft border-primary/30" },
  active:   { label: "Läuft",           cls: "text-success bg-success-soft border-success/30" },
  umfrage:  { label: "Umfragephase",    cls: "text-warning bg-warning-soft border-warning/30" },
  finished: { label: "Beendet",         cls: "text-subtle bg-surface-2 border-line" },
  cancelled: { label: "Fällt aus",      cls: "text-danger bg-danger-soft border-red-800/40" },
};
export function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
export function parsePollConfigs(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      // Migrate old format: { enabled, question, coins, rankPoints }
      if (parsed.enabled) {
        return [{
          ...DEFAULT_POLL_ITEM,
          label: parsed.question ?? "MVP",
          question: `Wer war der ${parsed.question ?? "MVP"}?`,
          winnerCoins: parsed.coins ?? 100,
          winnerRankPoints: parsed.rankPoints ?? 0,
        }];
      }
      return [];
    }
    return parsed as PollConfig[];
  } catch { return []; }
}
export function EventHiddenToggle({ id, hidden }: { id: string; hidden: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const res = await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: id, hidden: !hidden }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success(hidden ? "Event wieder sichtbar" : "Event ausgeblendet");
      router.refresh();
    } else {
      toast.error("Fehler");
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={hidden ? "Einblenden (für alle sichtbar machen)" : "Ausblenden (nur in der Verwaltung sichtbar)"}
      className={`shrink-0 p-1.5 rounded transition-colors disabled:opacity-40 ${
        hidden
          ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
          : "text-subtle hover:text-muted hover:bg-line"
      }`}
    >
      {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    </button>
  );
}
export type SquadOption = { id: string; name: string };
/* ── Small helper components ── */
/** Abschnitt eines Reiters. instant = speichert selbst und sofort (nicht über die Speicherleiste) — einheitlich
 *  mit "Wirkt sofort" gekennzeichnet, damit klar ist, welche Bereiche "Speichern" brauchen. */
export function Section({ title, children, overflowVisible, instant }: { title: string; children: React.ReactNode; overflowVisible?: boolean; instant?: boolean }) {
  return (
    <div className={`rounded-control border border-line bg-surface-2/50 ${overflowVisible ? "overflow-visible" : "overflow-hidden"}`}>
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider flex-1">{title}</h3>
        {instant && <InstantBadge />}
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>
    </div>
  );
}
/** Kennzeichen für Bereiche/Knöpfe, die sofort speichern */
export function InstantBadge() {
  return (
    <span className="shrink-0 rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-fg" title="Speichert direkt — ohne „Speichern“ unten">
      ⚡ Wirkt sofort
    </span>
  );
}
export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-subtle flex items-center gap-1.5">{label}</label>
      {children}
    </div>
  );
}
export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded accent-primary" />
      <span className="text-xs text-subtle">{label}</span>
    </label>
  );
}

export type SeriesDetailProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series: any; allUsers: User[]; squads?: SquadOption[]; hasActiveSibling?: boolean; isModerator?: boolean;
  isAdmin?: boolean;
  /** Archivierte Saison ohne spätere Saison — der Abschluss kann noch aufgehoben werden */
  canUndoCompletion?: boolean;
  /** Anzahl Saisons der Saison-Gruppe (inkl. dieser) */
  seasonCount?: number;
  /** Alle Stat-Felder der Saison-Gruppe (für das Zusammenführen in der All-Time-Tabelle) */
  groupStatFields?: string[];
  /** Mitglieder: Obergrenzen für das Community-Ziel (null = Mod/Admin) */
  goalLimits?: { coins: number; seriesPoints: number } | null;
  /** Mitglieder: Obergrenzen der Reihen-Belohnungen (Anzeige an den Feldern; der Server kürzt beim Speichern) */
  rewardLimits?: import("@/lib/captain-reward-limits").RewardLimits | null;
  /** Reiter beim Öffnen (aus ?tab=) */
  initialTab?: SettingsTabKey;
  /** Mods, laufende Saison: Spielwahl-Einstellungen (Reiter "Allgemein") */
  gameVote?: { initial: import("@/lib/game-vote/rules").GameVoteConfig; upcoming: { id: string; title: string; startAt: string; game: string | null }[]; squadName: string | null } | null;
  /** Übersicht: die ersten drei der Reihentabelle */
  top3?: { id: string; name: string; image: string | null; points: number }[];
};

/** Farbpunkt je Termin in der Terminliste: offen, läuft, braucht dich, fertig */
export function eventDot(ev: { status: string }, attention: boolean): { cls: string; label: string } {
  if (attention) return { cls: "bg-warning", label: "Braucht dich" };
  if (ev.status === "finished" || ev.status === "archived") return { cls: "bg-success", label: "Fertig" };
  if (ev.status === "active") return { cls: "bg-live animate-pulse", label: "Läuft" };
  if (ev.status === "umfrage") return { cls: "bg-warning", label: "Umfragephase" };
  return { cls: "bg-line-strong", label: "Offen" };
}

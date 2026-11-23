"use client";
import type { RewardLimits } from "@/lib/captain-reward-limits";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Trash2, Copy } from "@/components/icons";
import { EventCategory } from "@prisma/client";
import { deriveEventStatFields } from "@/lib/series-stat-fields";
import { parseAvgDirection, type AvgDirection } from "@/lib/avg-stats";
import { TOURNAMENT_FORMATS } from "@/lib/tournament-formats";
import { type CommunityGoal } from "@/lib/community-goal";

// Aus EventEditClient.tsx ausgelagert: Typen, Konstanten und kleine Bausteine, die Hook und Reiter teilen.

/* ── Types ── */
export type User = { id: string; name: string | null; username: string | null; image: string | null };
export type PlacementReward = { place: number; coins: number; rankPoints: number };
export type RewardsConfig   = { participationCoins: number; participationRankPts?: number; placements: PlacementReward[] };
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
// Punkt 3: zentrale Format-Liste (siehe @/lib/tournament-formats) statt eigener Kopie —
// verhindert, dass dieser Reiter, TournamentManager.tsx und der Erstellungs-Wizard auseinanderlaufen.
export const TMT_FORMATS = TOURNAMENT_FORMATS;
export const CATEGORIES: { value: EventCategory; label: string; emoji: string }[] = [
  { value: "competitive",     label: "Kompetitiv", emoji: "🏆" },
  { value: "fun",             label: "Fun",        emoji: "🎉" },
  { value: "casual",          label: "Casual",     emoji: "🛋️" },
  { value: "training",        label: "Training",   emoji: "🎓" },
  { value: "community_event", label: "Community",  emoji: "🤝" },
  { value: "special",         label: "Special",    emoji: "⭐" },
];
/** Sieg/Unentschieden-Münzen pro Match (Liga-Modus "Sieg/Unentschieden-Münzen") aus pointsConfig.
 *  Platzierungsbelohnungen stehen NICHT mehr in pointsConfig, sondern im Reiter "Belohnungen"
 *  (placementRewardsJson, siehe lib/placement-rewards.ts). */
export function parseTmtConfig(pc: string | null) {
  const d = { win: 30, draw: 10 };
  if (!pc) return d;
  try {
    const p = JSON.parse(pc) as Record<string, unknown>;
    const n = (v: unknown, fb: number) => (typeof v === "number" ? v : fb);
    return { win: n(p["win"], 30), draw: n(p["draw"], 10) };
  } catch { return d; }
}
/** Leitet die Statistik-Felder aus den Eventreihen-Wizard-Einstellungen (seriesStatConfig) ab. */
export function deriveStatFieldsFromSeries(series: { seriesStatConfig?: string | null } | null | undefined): string[] | null {
  if (!series?.seriesStatConfig) return null;
  try {
    const parsed = JSON.parse(series.seriesStatConfig) as {
      stats?: { field: string; isWinnerStat?: boolean; isMatchWinStat?: boolean }[];
      eventStatFields?: string[];
    };
    // Prefer explicit eventStatFields if configured
    if (parsed.eventStatFields?.length) {
      return parsed.eventStatFields.filter(Boolean);
    }
    // Fall back to stats but exclude winner stats (set automatically) and match-win stats
    // (fed from the per-round "Match Win" checkbox, not manually entered)
    const fields = parsed.stats
      ?.filter(s => !s.isWinnerStat && !s.isMatchWinStat && s.field)
      .map(s => s.field) ?? [];
    return fields.length ? fields : null;
  } catch { return null; }
}
/** Statistiken der Reihe, die jedes Event fest erfasst — mit den Punkten, die im Event (Skill-Index)
 *  gelten (eventPointsPer ?? pointsPer). Einzelne Events können nur ZUSÄTZLICHE Stats ergänzen. */
export function seriesEventStatRows(series: { seriesStatConfig?: string | null } | null | undefined): { field: string; points: number }[] {
  if (!series?.seriesStatConfig) return [];
  try {
    const parsed = JSON.parse(series.seriesStatConfig) as {
      stats?: { field: string; pointsPer: number; eventPointsPer?: number; isWinnerStat?: boolean; isMatchWinStat?: boolean }[];
      eventStatFields?: string[];
    };
    const stats = parsed.stats ?? [];
    const fields = deriveEventStatFields(stats);
    // Altbestand: separat gepflegte Event-Felder ohne gleichnamigen Reihen-Stat
    for (const f of parsed.eventStatFields ?? []) if (f && !fields.includes(f)) fields.push(f);
    return fields.map(field => {
      const s = stats.find(x => x.field.trim() === field);
      return { field, points: s ? (typeof s.eventPointsPer === "number" ? s.eventPointsPer : s.pointsPer) : 0 };
    });
  } catch { return []; }
}
export type PlacementPointRow = { place: number; points: number };
export type EventStatConfigForm = {
  pointsByField: Record<string, number>;
  /** Optionale Endplatzierung je Teilnehmer (z.B. 1./2./3. Platz) mit frei konfigurierbaren Punkten
   *  pro Platz — unabhängig von den laufend erfassten Stats, wird beim Event-Abschluss eingetragen. */
  placementEnabled: boolean;
  placementPoints: PlacementPointRow[];
  /** Nur avg_stats: höchster oder niedrigster Ø gewinnt — gilt schon live, nicht erst beim Abschluss */
  avgDirection: AvgDirection;
};
export const EMPTY_EVENT_STAT_CONFIG: EventStatConfigForm = {
  pointsByField: {},
  placementEnabled: false,
  placementPoints: [{ place: 1, points: 10 }, { place: 2, points: 6 }, { place: 3, points: 3 }],
  avgDirection: "high",
};
/** Parst die Event-eigene Stat-Konfiguration (statConfigJson) für die Bearbeitungsform — siehe
 * schema.prisma. */
export function parseEventStatConfig(json: string | null | undefined): EventStatConfigForm {
  if (!json) return EMPTY_EVENT_STAT_CONFIG;
  try {
    const cfg = JSON.parse(json) as {
      stats?: { field: string; pointsPer: number }[];
      placementPoints?: Record<string, number>;
      avgDirection?: unknown;
    };
    const pointsByField: Record<string, number> = {};
    for (const s of cfg.stats ?? []) pointsByField[s.field] = s.pointsPer;
    const placementEntries = Object.entries(cfg.placementPoints ?? {});
    const placementEnabled = placementEntries.length > 0;
    const placementPoints = placementEnabled
      ? placementEntries
          .map(([place, points]) => ({ place: Number(place), points }))
          .sort((a, b) => a.place - b.place)
      : EMPTY_EVENT_STAT_CONFIG.placementPoints;
    return { pointsByField, placementEnabled, placementPoints, avgDirection: parseAvgDirection(cfg.avgDirection) ?? "high" };
  } catch { return EMPTY_EVENT_STAT_CONFIG; }
}
/** Baut statConfigJson (siehe schema.prisma) aus der Bearbeitungsform. Gibt null zurück, wenn weder
 * Stat-Punkte noch Platzierungspunkte noch "niedrigster Ø gewinnt" noch ein Community-Ziel gesetzt
 * sind — dann gilt weiter die Reihen-Konfiguration. */
export function buildEventStatConfig(fields: string[], form: EventStatConfigForm, isAvg: boolean, goal: CommunityGoal | null): {
  stats: { field: string; pointsPer: number }[];
  placementPoints: Record<string, number>;
  avgDirection?: AvgDirection;
  goal?: CommunityGoal;
} | null {
  const stats = fields
    .filter(f => (form.pointsByField[f] ?? 0) !== 0)
    .map(f => ({ field: f, pointsPer: form.pointsByField[f] }));
  const placementPoints: Record<string, number> = {};
  if (form.placementEnabled) {
    for (const row of form.placementPoints) {
      if (row.place > 0) placementPoints[String(row.place)] = row.points;
    }
  }
  const avgDirection = isAvg ? form.avgDirection : undefined;
  if (stats.length === 0 && Object.keys(placementPoints).length === 0 && avgDirection !== "low" && !goal) return null;
  return { stats, placementPoints, ...(avgDirection && { avgDirection }), ...(goal && { goal }) };
}
// Von Hand nur vor dem Abschluss: "Umfragephase"/"Beendet" setzt ausschließlich der Abschluss
export const STATUS_OPTIONS = ["open", "active"];
export const STATUS_STYLES: Record<string, string> = {
  open:     "text-primary-fg bg-primary-soft border-primary/30",
  active:   "text-success bg-success-soft border-success/30",
  umfrage:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  finished: "text-subtle bg-surface-2 border-line",
};
export const inputCls = "w-full rounded-control px-3 py-2 text-sm text-fg outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const numCls   = "w-24 rounded-control px-3 py-2 text-sm text-fg outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const labelCls = "text-xs text-subtle mb-1 block";
export function parseRewards(json: string | null | undefined): RewardsConfig {
  if (!json) return DEFAULT_REWARDS;
  try { return { ...DEFAULT_REWARDS, ...JSON.parse(json) }; } catch { return DEFAULT_REWARDS; }
}
/** Normalisiert einen Poll-Eintrag auf das moderne Format (voterEligibility/answerType/...),
 * da ältere gespeicherte Konfigurationen noch das Legacy-Format (coins/rankPoints/type) nutzen. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePoll(raw: any): PollConfig {
  return {
    label: raw.label ?? "",
    question: raw.question ?? "",
    voterEligibility: raw.voterEligibility ?? "participants",
    answerType: raw.answerType ?? (raw.type === "spectator" ? "spectators" : "players"),
    customAnswers: raw.customAnswers ?? [],
    startOffsetHours: raw.startOffsetHours ?? 0,
    endOffsetHours: raw.endOffsetHours ?? 24,
    participationCoins: raw.participationCoins ?? 0,
    participationSeriesPoints: raw.participationSeriesPoints ?? 0,
    winnerCoins: raw.winnerCoins ?? raw.coins ?? 100,
    winnerRankPoints: raw.winnerRankPoints ?? raw.rankPoints ?? 0,
  };
}
export function parsePolls(json: string | null | undefined): PollConfig[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.map(normalizePoll);
    // legacy single-poll format
    if (parsed.enabled) return [normalizePoll({ label: parsed.question ?? "MVP", question: parsed.question ?? "", coins: parsed.coins ?? 250, rankPoints: parsed.rankPoints ?? 3 })];
    return [];
  } catch { return []; }
}
export function parseSpectatorReward(json: string | null | undefined) {
  if (!json) return { coins: 5, rankPoints: 0 };
  try { return JSON.parse(json) as { coins: number; rankPoints: number }; }
  catch { return { coins: 5, rankPoints: 0 }; }
}
export type TabKey = "details" | "rewards" | "tournament" | "bracket" | "participants" | "series" | "goal";
export type SquadOption = { id: string; name: string };
export const STATUS_LABELS_DE: Record<string, string> = { open: "Anmeldung offen", active: "Läuft", umfrage: "Umfragephase", finished: "Beendet" };
/** Karte einer Formular-Gruppe (Grunddaten, Zeit und Teilnahme, …) */
export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card border border-line bg-surface-2/50 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}
/** Schalter mit Beschriftung — Teil des Formulars, gespeichert über die Speicherleiste */
export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-fg/90">{label}</span>
        {hint && <span className="block text-xs text-subtle">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
      <span aria-hidden className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-white/[0.12] transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/60 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}
/** ⋯-Menü im Kopf: Duplizieren, Absagen/Löschen */
export function HeaderMenu({ duplicateHref, deleteLabel, onDelete }: { duplicateHref: string; deleteLabel: string | null; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-line";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="Weitere Aktionen" aria-expanded={open}
        className="h-[30px] w-8 rounded-control border border-line-strong text-fg/90 hover:text-fg hover:border-line-strong flex items-center justify-center">⋯</button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-control border border-line-strong bg-surface-2 shadow-xl">
          <Link role="menuitem" href={duplicateHref} className={`${item} text-fg`}><Copy className="w-3.5 h-3.5 text-subtle" /> Duplizieren</Link>
          {deleteLabel && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onDelete(); }} className={`${item} border-t border-line text-danger`}>
              <Trash2 className="w-3.5 h-3.5" /> {deleteLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** rewardLimits: Belohnungs-Obergrenzen für Mitglieder (null = Mod/Admin, keine Grenze) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventEditProps = { event: any; registeredUsers: User[]; squads?: SquadOption[]; rewardLimits?: RewardLimits | null; goalStatus?: GoalStatus | null };

/** Stand des Community-Ziels für den Reiter "Ziel" (serverseitig berechnet, siehe page.tsx) */
export type GoalStatus = {
  percent: number;
  current: string;
  target: string;
  reached: boolean;
  /** Zeitraum abgerechnet (Ende erreicht oder Spielphase abgeschlossen) */
  settled: boolean;
  /** Wartet auf die Mod-Freigabe — bis dahin wird nichts ausgezahlt */
  awaitingApproval: boolean;
  /** Wer etwas bekommen hat (Münzen aus Belohnung + Serien-Bonus, Tabellenpunkte) */
  rewarded: { id: string; name: string; coins: number | null; seriesPoints: number }[];
};

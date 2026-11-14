/**
 * Spielwahl für Eventreihen — reine Regeln (client-sicher, kein Prisma), siehe rules.test.ts.
 *
 * Ablauf: Beim Anlegen des nächsten Reihen-Termins entsteht ein Platzhalter-Event ohne Spiel und dazu
 * eine Wahl mit Kandidaten aus der Spieleliste (automatisch nach "Passt-Wert" + Platz 2/3 der vorigen Wahl,
 * Mods können tauschen). Mitglieder haken alle Spiele an, die sie spielen würden (Zustimmungswahl, jederzeit
 * änderbar); die erste Stimme meldet als Mitspieler an. Zum Ende wird das meistgewählte Spiel eingetragen,
 * Regeln/Format gibt danach ein Mod frei. Server-Teil: service.ts.
 */

import type { GameMode, GamePlatform } from "@/lib/games/options";

// ── Einstellungen der Reihe ─────────────────────────────────────────────────────

export interface GameVoteConfig {
  enabled: boolean;
  /** "on_create": Abstimmung startet, sobald der Termin angelegt ist; "days_before": X Tage vor Start */
  opensMode: "on_create" | "days_before";
  opensDaysBefore: number;
  /** Abstimmung endet X Stunden vor Start */
  closesHoursBefore: number;
  candidateCount: number;
  /** Spiele der letzten N Termine sind keine Kandidaten */
  excludeLastN: number;
  /** Münzen fürs Abstimmen (0 = aus) */
  voteCoins: number;
}

export const DEFAULT_GAME_VOTE_CONFIG: GameVoteConfig = {
  enabled: false, opensMode: "on_create", opensDaysBefore: 5, closesHoursBefore: 24, candidateCount: 5, excludeLastN: 2, voteCoins: 0,
};

export const GAME_VOTE_LIMITS = {
  opensDaysBefore: [1, 30], closesHoursBefore: [1, 168], candidateCount: [2, 8], excludeLastN: [0, 10], voteCoins: [0, 500],
} as const;

/** Unter so vielen Stunden zwischen Ende der Abstimmung und Start warnt die Oberfläche (Regeln, Kauf) */
export const TIGHT_CLOSE_HOURS = 12;

const clampInt = (v: unknown, [min, max]: readonly [number, number], fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeGameVoteConfig(input: unknown): GameVoteConfig {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_GAME_VOTE_CONFIG;
  return {
    enabled: raw.enabled === true,
    opensMode: raw.opensMode === "days_before" ? "days_before" : "on_create",
    opensDaysBefore: clampInt(raw.opensDaysBefore, GAME_VOTE_LIMITS.opensDaysBefore, d.opensDaysBefore),
    closesHoursBefore: clampInt(raw.closesHoursBefore, GAME_VOTE_LIMITS.closesHoursBefore, d.closesHoursBefore),
    candidateCount: clampInt(raw.candidateCount, GAME_VOTE_LIMITS.candidateCount, d.candidateCount),
    excludeLastN: clampInt(raw.excludeLastN, GAME_VOTE_LIMITS.excludeLastN, d.excludeLastN),
    voteCoins: clampInt(raw.voteCoins, GAME_VOTE_LIMITS.voteCoins, d.voteCoins),
  };
}

export function parseGameVoteConfig(json: string | null | undefined): GameVoteConfig {
  if (!json) return { ...DEFAULT_GAME_VOTE_CONFIG };
  try { return sanitizeGameVoteConfig(JSON.parse(json)); } catch { return { ...DEFAULT_GAME_VOTE_CONFIG }; }
}

// ── Zeitfenster ─────────────────────────────────────────────────────────────────

const HOUR = 3_600_000;

/**
 * Beginn und Ende der Abstimmung für einen Termin. Liegt der Beginn in der Vergangenheit, startet sie
 * sofort; reicht die Zeit nicht für das eingestellte Ende, endet sie auf halbem Weg zum Start.
 */
export function voteWindow(startAt: Date, now: Date, cfg: GameVoteConfig): { opensAt: Date; closesAt: Date; shortened: boolean } {
  let opensAt = cfg.opensMode === "days_before" ? new Date(startAt.getTime() - cfg.opensDaysBefore * 24 * HOUR) : now;
  if (opensAt < now) opensAt = now;
  let closesAt = new Date(startAt.getTime() - cfg.closesHoursBefore * HOUR);
  let shortened = false;
  if (closesAt.getTime() - opensAt.getTime() < HOUR) {
    closesAt = new Date(opensAt.getTime() + Math.max(0, startAt.getTime() - opensAt.getTime()) / 2);
    shortened = true;
  }
  return { opensAt, closesAt, shortened };
}

// ── Passt das Spiel zur Reihe? ──────────────────────────────────────────────────

/** Formate, in denen zwei Teilnehmer direkt gegeneinander antreten (Spiel braucht PvP) */
const HEAD_TO_HEAD = new Set(["single_elimination", "double_elimination", "group_knockout", "round_robin", "liga", "ffa"]);

export interface FitFields {
  modes: GameMode[] | string[];
  platforms: GamePlatform[] | string[];
  minPlayers: number | null;
  maxPlayers: number | null;
}

/** Plattform-Angabe der Reihe ("PC, Xbox") → Plattform-Schlüssel der Spieleliste */
export function seriesPlatformKeys(platform: string | null | undefined): string[] {
  if (!platform) return [];
  const out = new Set<string>();
  for (const part of platform.toLowerCase().split(/[,/;]+/).map(s => s.trim()).filter(Boolean)) {
    if (part.includes("pc") || part.includes("windows") || part.includes("steam")) out.add("pc");
    else if (part.includes("playstation") || part.startsWith("ps")) out.add("playstation");
    else if (part.includes("xbox")) out.add("xbox");
    else if (part.includes("switch") || part.includes("nintendo")) out.add("switch");
    else if (part.includes("mobil") || part.includes("handy") || part.includes("android") || part.includes("ios")) out.add("mobile");
  }
  return [...out];
}

/**
 * Darf das Spiel Kandidat dieser Reihe sein? Mehrspieler muss es sein, bei Turnier-Formaten mit direkten
 * Duellen PvP, und es muss auf einer Plattform der Reihe laufen. Unbekannte Angaben schließen nicht aus.
 */
export function fitsSeries(game: FitFields, series: { format: string | null; platform: string | null }): boolean {
  const modes = game.modes as string[];
  const solo = modes.length > 0 && modes.every(m => m === "solo");
  if (solo || game.maxPlayers === 1) return false;
  if (series.format && HEAD_TO_HEAD.has(series.format) && modes.length > 0 && !modes.includes("pvp")) return false;
  const wanted = seriesPlatformKeys(series.platform);
  const has = game.platforms as string[];
  if (wanted.length > 0 && has.length > 0 && !has.some(p => wanted.includes(p))) return false;
  return true;
}

// ── Passt-Wert ──────────────────────────────────────────────────────────────────

export interface FitInput {
  /** Stammspieler der Reihe, die das Spiel "Am Start" bzw. auf der Wunschliste haben */
  regularsIn: number;
  regularsWish: number;
  regularsTotal: number;
  /** Gesamt in der Community (für Reihen ohne Stammspieler) */
  inCount: number;
  wishCount: number;
  isFree: boolean | null;
  discountPercent: number;
  subscriptions: string[];
}

/** Kostet das Spiel nichts extra (gratis / im Abo)? */
export const costsNothing = (g: Pick<FitInput, "isFree" | "subscriptions" | "discountPercent">) =>
  g.isFree === true || g.subscriptions.length > 0 || g.discountPercent >= 100;

export function fitScore(g: FitInput): number {
  const base = g.regularsTotal > 0 ? g.regularsIn * 3 + g.regularsWish * 2 : Math.min(g.inCount, 20) * 2 + Math.min(g.wishCount, 20);
  return base + (costsNothing(g) ? 3 : g.discountPercent >= 20 ? 1 : 0);
}

/** Wer aus der Reihe bzw. Community das Spiel hat — kurz für die Kandidaten-Karte. */
export function fitLabel(g: FitInput): string {
  const parts: string[] = [];
  if (g.regularsTotal > 0) {
    if (g.regularsIn > 0) parts.push(`${g.regularsIn} von ${g.regularsTotal} Stammspielern sind am Start`);
    else if (g.regularsWish > 0) parts.push(`${g.regularsWish} Stammspieler würden es holen`);
  } else if (g.inCount > 0) {
    parts.push(`${g.inCount} in der Community am Start`);
  }
  // Preis, Rabatt und Abo zeigt die Karte als eigenes Abzeichen
  return parts.join(" · ");
}

// ── Auswertung ──────────────────────────────────────────────────────────────────

export interface TallyCandidate {
  id: string;
  approvals: number;
  /** Abstimmende, die das Spiel schon "Am Start" haben */
  votersIn: number;
  /** 0 = kostet nichts extra, 1 = im Angebot, 2 = Vollpreis/unbekannt */
  costRank: number;
  fitScore: number;
  /** Spiel noch freigeschaltet und passend? Sonst nicht wählbar */
  eligible: boolean;
}

/**
 * Reihenfolge nach der Wahl: Stimmen → wer es schon hat → günstiger → Passt-Wert → Los.
 * Nicht (mehr) wählbare Kandidaten landen ohne Platz am Ende. rng ist für Tests austauschbar.
 */
export function rankCandidates(cands: TallyCandidate[], rng: () => number = Math.random): { id: string; place: number | null }[] {
  const lot = new Map(cands.map(c => [c.id, rng()]));
  const ok = cands.filter(c => c.eligible).sort((a, b) =>
    b.approvals - a.approvals || b.votersIn - a.votersIn || a.costRank - b.costRank || b.fitScore - a.fitScore || lot.get(a.id)! - lot.get(b.id)!);
  return [
    ...ok.map((c, i) => ({ id: c.id, place: i + 1 })),
    ...cands.filter(c => !c.eligible).map(c => ({ id: c.id, place: null })),
  ];
}

export function costRankOf(g: Pick<FitInput, "isFree" | "subscriptions" | "discountPercent">): number {
  return costsNothing(g) ? 0 : g.discountPercent > 0 ? 1 : 2;
}

// ── Kauf-Hinweis ────────────────────────────────────────────────────────────────

export interface BuyInfo {
  isFree: boolean | null;
  subscriptions: string[];
  /** Abo-Namen zur Anzeige (z.B. "Game Pass") */
  subscriptionLabels: string[];
  priceLabel: string | null;
  initialPriceLabel: string | null;
  discountPercent: number;
}

/** Ein Satz, wie man an das gewählte Spiel kommt. */
export function buyHint(g: BuyInfo): string {
  if (g.isFree === true) return "Das Spiel ist kostenlos — einfach installieren.";
  if (g.subscriptionLabels.length > 0) return `Im ${g.subscriptionLabels.join(" / ")} enthalten.`;
  if (g.discountPercent > 0 && g.priceLabel) {
    return `Gerade −${g.discountPercent} % auf Steam: ${g.priceLabel}${g.initialPriceLabel ? ` statt ${g.initialPriceLabel}` : ""}.`;
  }
  if (g.priceLabel) return `Kostet ${g.priceLabel} auf Steam.`;
  return "Schau rechtzeitig, wo du es bekommst.";
}

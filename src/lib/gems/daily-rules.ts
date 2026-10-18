// ============================================
// OMA Gems — Tages- und Wochenregeln (rein, ohne DB)
// ============================================
// Münzbudget: rund 1000 Münzen pro Woche aus OMA Gems, umgesetzt als festes Tageslimit
// (GEMS_DAILY_COIN_CAP × 7 ≈ 1050). Alle wiederkehrenden Münzquellen zählen ins Limit. Außerhalb
// liegen die einmaligen Kapitel-Sterne (höchstens 12 × 3 × CHAPTER_COINS_PER_STAR = 720 Münzen),
// damit neue Spieler das Limit nicht schon in den ersten Minuten erreichen, und Wächter-Packs. Tage und Wochen laufen nach Berliner Zeit (Woche ab Montag).
// Die DB-Seite (Gutschrift, Serie, Tages-Herausforderung) liegt in daily.ts.

import { fromDatetimeLocalBerlin, getBerlinDateParts } from "@/lib/time";
import { ENDLESS_FIRST_STAGE } from "./endless-levels";

export const GEMS_DAILY_COIN_CAP = 150;
export const STREAK_MAX_DAYS = 7;
const FIRST_WIN_BASE_COINS = 20;
const FIRST_WIN_COINS_PER_STREAK_DAY = 5;
export const CHAPTER_COINS_PER_STAR = 20;
export const DAILY_CHALLENGE_COINS = 40;
/** Last Stand: Münzen für jede in der Saison neu erreichte Welle (zählt ins Tageslimit). */
export const LAST_STAND_COINS_PER_WAVE = 4;
const ENDLESS_STAGE_BASE_COINS = 10;
const ENDLESS_STAGE_COINS_PER_TEN = 2;

const pad = (n: number) => String(n).padStart(2, "0");

/** Berliner Kalendertag als "YYYY-MM-DD". */
export function berlinDateKey(date: Date = new Date()): string {
  const { year, month, day } = getBerlinDateParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function keyToUtcDays(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

function utcDaysToKey(days: number): string {
  const d = new Date(days * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Tage von `from` bis `to` (beide "YYYY-MM-DD"), positiv wenn `to` später liegt. */
export function daysBetween(from: string, to: string): number {
  return keyToUtcDays(to) - keyToUtcDays(from);
}

/** Montag der Woche des Tages `key` als "YYYY-MM-DD". */
export function weekStartKey(key: string): string {
  const days = keyToUtcDays(key);
  const weekday = (new Date(days * 86_400_000).getUTCDay() + 6) % 7; // Montag = 0
  return utcDaysToKey(days - weekday);
}

/** Laufende Nummer der Woche (seit 1970) — Seed für Wochen-Modifikator und Wochen-Wächter. */
export function weekIndex(key: string): number {
  return Math.floor((keyToUtcDays(weekStartKey(key)) + 3) / 7);
}

/** Montag 00:00 Berliner Zeit der aktuellen Woche, als Zeitpunkt. */
export function berlinWeekStart(date: Date = new Date()): Date {
  return fromDatetimeLocalBerlin(`${weekStartKey(berlinDateKey(date))}T00:00`);
}

/** Serie nach einem Sieg am Tag `today`: +1 je Tag mit Sieg (höchstens STREAK_MAX_DAYS),
 *  jeder verpasste Tag zieht einen Serientag ab — statt die Serie auf null zu setzen. */
export function nextStreak(current: { streakDays: number; lastWinDate: string | null } | null, today: string): number {
  if (!current?.lastWinDate) return 1;
  const gap = daysBetween(current.lastWinDate, today);
  if (gap <= 0) return Math.max(1, current.streakDays);
  const missed = gap - 1;
  return Math.min(STREAK_MAX_DAYS, Math.max(0, current.streakDays - missed) + 1);
}

/** Serie, wie sie heute angezeigt wird (ohne Sieg heute): verpasste Tage schon abgezogen,
 *  der laufende Tag zählt noch nicht als verpasst. */
export function displayStreak(current: { streakDays: number; lastWinDate: string | null } | null, today: string): number {
  if (!current?.lastWinDate) return 0;
  const missed = Math.max(0, daysBetween(current.lastWinDate, today) - 1);
  return Math.max(0, current.streakDays - missed);
}

export function firstWinBonusCoins(streakDays: number): number {
  return FIRST_WIN_BASE_COINS + FIRST_WIN_COINS_PER_STREAK_DAY * Math.min(STREAK_MAX_DAYS, Math.max(1, streakDays));
}

/** Münzen für eine zum ersten Mal geschaffte Stufe. */
export function endlessStageCoins(stage: number): number {
  return ENDLESS_STAGE_BASE_COINS + ENDLESS_STAGE_COINS_PER_TEN * Math.floor(Math.max(0, stage - ENDLESS_FIRST_STAGE) / 10);
}

export interface RewardRequest {
  label: string;
  coins: number;
  /** Einmalige Belohnung außerhalb des Tageslimits (Kapitel-Sterne). */
  uncapped?: boolean;
}

export interface RewardLine {
  label: string;
  uncapped?: boolean;
  /** Angefragte Münzen vor dem Tageslimit. */
  requested: number;
  /** Tatsächlich gutgeschrieben. */
  coins: number;
}

/** Verteilt angefragte Münzen der Reihe nach auf das restliche Tageslimit. `uncapped`-Zeilen
 *  werden immer voll gutgeschrieben und belasten das Limit nicht. `cappedTotal` ist der Teil,
 *  der ins Tageslimit zählt. */
export function applyDailyCap(
  requests: RewardRequest[],
  earnedToday: number,
  cap: number = GEMS_DAILY_COIN_CAP
): { lines: RewardLine[]; total: number; cappedTotal: number; capReached: boolean } {
  let remaining = Math.max(0, cap - earnedToday);
  const lines = requests.map((r) => {
    if (r.uncapped) return { label: r.label, requested: r.coins, coins: r.coins, uncapped: true };
    const coins = Math.min(r.coins, remaining);
    remaining -= coins;
    return { label: r.label, requested: r.coins, coins };
  });
  const total = lines.reduce((sum, l) => sum + l.coins, 0);
  const cappedTotal = lines.filter((l) => !l.uncapped).reduce((sum, l) => sum + l.coins, 0);
  return { lines, total, cappedTotal, capReached: remaining === 0 };
}

/** Punktzahl eines Kampfs für Tages-Herausforderung und Turnier: Sieg zählt am meisten,
 *  dann Rest-Leben des eigenen Teams, abzüglich je Runde. */
export function battleScore(won: boolean, hpPercent: number, rounds: number): number {
  return Math.max(0, (won ? 1000 : 0) + Math.round(hpPercent * 500) - rounds * 10);
}

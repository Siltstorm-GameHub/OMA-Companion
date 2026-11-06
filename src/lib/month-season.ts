// ============================================
// Monats-Saisons der Community-Spiele (OMA Gems, OMA Blocks)
// ============================================
// Jeder Kalendermonat (Berliner Zeit, "YYYY-MM") ist eine Saison mit eigener Rangliste. Zum Monatswechsel
// frieren die Crons den Endstand ein und zahlen die Belohnungen aus.

import { getBerlinDateParts } from "@/lib/time";

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const pad = (n: number) => String(n).padStart(2, "0");

export function seasonKey(date: Date = new Date()): string {
  const { year, month } = getBerlinDateParts(date);
  return `${year}-${pad(month)}`;
}

export function previousSeason(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

export function seasonLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Ganze Tage bis zum Saisonende (Monatsende, Berliner Kalendertag mitgezählt). */
export function seasonDaysLeft(date: Date = new Date()): number {
  const { year, month, day } = getBerlinDateParts(date);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return daysInMonth - day + 1;
}

/** Berliner Kalendertag "YYYY-MM-DD". */
export function berlinDayKey(date: Date = new Date()): string {
  const { year, month, day } = getBerlinDateParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** "2026-11-06" → "6. November 2026". */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

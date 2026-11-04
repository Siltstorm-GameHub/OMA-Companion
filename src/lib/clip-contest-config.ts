// ============================================
// Clip des Monats — Dauer der automatischen Umfrage (im Adminbereich einstellbar)
// ============================================
// Der Cron (api/cron/monthly-clip-contest) legt am 1. jedes Monats die Abstimmung für den Vormonat an.
// Wie viele Tage sie läuft, steht in BotConfig (Key AUTO_VOTING_DAYS_KEY), bearbeitet unter
// Admin → Highlight Clips → Clip des Monats.

import { prisma } from "@/lib/prisma";

const AUTO_VOTING_DAYS_KEY = "clip_contest_auto_voting_days";

export const DEFAULT_AUTO_VOTING_DAYS = 7;
export const MIN_AUTO_VOTING_DAYS = 1;
export const MAX_AUTO_VOTING_DAYS = 28;

export function normalizeAutoVotingDays(input: unknown): number | null {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isInteger(n) || n < MIN_AUTO_VOTING_DAYS || n > MAX_AUTO_VOTING_DAYS) return null;
  return n;
}

export async function getAutoVotingDays(): Promise<number> {
  const row = await prisma.botConfig.findUnique({ where: { key: AUTO_VOTING_DAYS_KEY } }).catch(() => null);
  return normalizeAutoVotingDays(row?.value) ?? DEFAULT_AUTO_VOTING_DAYS;
}

export async function setAutoVotingDays(days: number): Promise<void> {
  await prisma.botConfig.upsert({
    where: { key: AUTO_VOTING_DAYS_KEY },
    create: { key: AUTO_VOTING_DAYS_KEY, value: String(days) },
    update: { value: String(days) },
  });
}

// ============================================
// OMA Blocks — Monatsziele: Belohnung ab einem bestimmten Bestwert (im Adminbereich einstellbar)
// ============================================
// Ergänzt die Top-3-Belohnung (rewards-config.ts): Jeder, dessen Solo-Bestwert im Monat eine Schwelle
// erreicht, bekommt beim Monatsabschluss (cron/blocks-season) die Belohnung der höchsten erreichten
// Schwelle — so hat nicht nur die Spitze ein erreichbares Ziel. Gespeichert als JSON in BotConfig
// (Key BLOCKS_GOALS_KEY), bearbeitet unter Admin → Tools → Minigames.

import { prisma } from "@/lib/prisma";
import type { BlocksPlaceReward } from "./rewards-config";

export interface BlocksGoal extends BlocksPlaceReward {
  /** Mindest-Bestwert im Monat */
  score: number;
}

const BLOCKS_GOALS_KEY = "blocks_monthly_goals";
export const MAX_GOALS = 5;
const MAX_VALUE = 10_000_000;

export const DEFAULT_BLOCKS_GOALS: BlocksGoal[] = [
  { score: 25_000, coins: 75, rankPoints: 0 },
  { score: 75_000, coins: 150, rankPoints: 10 },
  { score: 150_000, coins: 300, rankPoints: 25 },
];

function clampValue(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_VALUE, Math.max(0, Math.round(n)));
}

/** Rein, damit testbar: gültige Ziele, aufsteigend nach Punkten, ohne doppelte oder leere Schwellen. */
export function normalizeBlocksGoals(input: unknown): BlocksGoal[] {
  if (!Array.isArray(input)) return DEFAULT_BLOCKS_GOALS.map((g) => ({ ...g }));
  const goals = input
    .filter((g): g is Partial<BlocksGoal> => !!g && typeof g === "object")
    .map((g) => ({ score: clampValue(g.score), coins: clampValue(g.coins), rankPoints: clampValue(g.rankPoints) }))
    .filter((g) => g.score > 0 && (g.coins > 0 || g.rankPoints > 0))
    .sort((a, b) => a.score - b.score);
  return goals.filter((g, i) => i === 0 || g.score !== goals[i - 1].score).slice(0, MAX_GOALS);
}

/** Höchstes erreichtes und nächstes Ziel für einen Bestwert (rein, für Anzeige und Auszahlung). */
export function goalProgress(score: number, goals: BlocksGoal[]): { reached: BlocksGoal | null; next: BlocksGoal | null } {
  let reached: BlocksGoal | null = null;
  for (const g of goals) if (score >= g.score) reached = g;
  return { reached, next: goals.find((g) => score < g.score) ?? null };
}

export async function getBlocksGoals(): Promise<BlocksGoal[]> {
  const row = await prisma.botConfig.findUnique({ where: { key: BLOCKS_GOALS_KEY } });
  if (!row) return normalizeBlocksGoals(DEFAULT_BLOCKS_GOALS);
  try {
    return normalizeBlocksGoals(JSON.parse(row.value));
  } catch {
    return normalizeBlocksGoals(DEFAULT_BLOCKS_GOALS);
  }
}

export async function updateBlocksGoals(input: unknown): Promise<BlocksGoal[]> {
  // Leere Liste ist erlaubt (= keine Monatsziele) — nur kaputter Input fällt auf die Vorgabe zurück.
  const value = Array.isArray(input) ? normalizeBlocksGoals(input) : normalizeBlocksGoals(DEFAULT_BLOCKS_GOALS);
  await prisma.botConfig.upsert({
    where: { key: BLOCKS_GOALS_KEY },
    create: { key: BLOCKS_GOALS_KEY, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
  return value;
}

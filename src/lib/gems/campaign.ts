// ============================================
// Kampagnen-Logik — Kampagne im "OMA Gems"-Modus
// ============================================
// Bindeglied zwischen den Level-Inhalten (campaign-levels.ts, endless-levels.ts)
// und dem Spieler-Fortschritt in der DB (UserCampaignProgress, siehe
// schema.prisma). Enthält bewusst KEINE Kampf-Start-Logik (die lebt in
// live-battle.ts, um Zirkelimporte zu vermeiden — live-battle.ts importiert
// von hier, nicht umgekehrt).

import { prisma } from "@/lib/prisma";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import type { InteractiveBattleState } from "@/lib/battle-engine/interactive";
import { instantiateMonster } from "./monster-content";
import { CAMPAIGN_LEVELS, getCampaignLevel, type CampaignLevelDef } from "./campaign-levels";
import { ENDLESS_FIRST_STAGE, endlessLevelId, generateEndlessLevel, parseEndlessStage } from "./endless-levels";

export { CAMPAIGN_LEVELS, getCampaignLevel };

/** Münz-Belohnung je NEU erreichtem Stern (nicht je Level) — siehe
 *  recordCampaignResult: schon erreichte Sterne zahlen bei erneutem Sieg
 *  nicht nochmal aus, nur der Zuwachs gegenüber der bisherigen Bestleistung. */
export const CAMPAIGN_COINS_PER_STAR = 100;

export function buildCampaignEnemyTeam(levelDef: CampaignLevelDef): BattleUnitDefinition[] {
  return levelDef.monsters.map((m) => instantiateMonster(m, levelDef.level, levelDef.statMultiplier));
}

/** 1-3 Sterne aus der am Kampfende verbliebenen Team-HP (Team A, der Spieler)
 *  — 3 Sterne ab 66% Rest-HP, 2 Sterne ab 33%, sonst 1 Stern für jeden Sieg.
 *  Nur für gewonnene Kämpfe aufrufen (state.winner === "A"). */
export function computeStars(state: InteractiveBattleState): 1 | 2 | 3 {
  const totalMaxHp = state.unitsA.reduce((sum, u) => sum + u.maxHp, 0);
  const totalCurrentHp = state.unitsA.reduce((sum, u) => sum + Math.max(0, u.currentHp), 0);
  const hpPct = totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0;
  if (hpPct >= 0.66) return 3;
  if (hpPct >= 0.33) return 2;
  return 1;
}

export interface CampaignBoardLevel {
  id: string;
  order: number;
  name: string;
  tagline: string;
  isBoss: boolean;
  stars: number;
  completed: boolean;
  unlocked: boolean;
  /** "chapter" = die 12 festen Kampagnen-Level, "endless" = Endlos-Turm (siehe endless-levels.ts). */
  section: "chapter" | "endless";
}

/** Wie viele schon geschaffte Endlos-Stufen und gesperrte Vorschau-Stufen die Karte zeigt. */
const ENDLESS_SHOWN_COMPLETED = 3;
const ENDLESS_SHOWN_PREVIEW = 2;

/** Rein, damit testbar: Kapitel-Level N braucht Level N-1, die erste Endlos-Stufe das
 *  letzte Kapitel-Level, jede weitere Endlos-Stufe ihre Vorgängerin. */
export function isLevelUnlocked(levelId: string, completedLevelIds: ReadonlySet<string>): boolean {
  const chapterIndex = CAMPAIGN_LEVELS.findIndex((l) => l.id === levelId);
  if (chapterIndex === 0) return true;
  if (chapterIndex > 0) return completedLevelIds.has(CAMPAIGN_LEVELS[chapterIndex - 1].id);
  const stage = parseEndlessStage(levelId);
  if (stage === null) return false;
  const previous = stage === ENDLESS_FIRST_STAGE ? CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1].id : endlessLevelId(stage - 1);
  return completedLevelIds.has(previous);
}

/** Höchste geschaffte Endlos-Stufe, oder null. */
export function highestEndlessStage(completedLevelIds: Iterable<string>): number | null {
  let best: number | null = null;
  for (const id of completedLevelIds) {
    const stage = parseEndlessStage(id);
    if (stage !== null && (best === null || stage > best)) best = stage;
  }
  return best;
}

/** Rein, damit testbar: welche Endlos-Stufen die Karte zeigt — die letzten geschafften,
 *  die nächste spielbare und zwei gesperrte zur Vorschau. Leer, solange das Kapitel offen ist. */
export function endlessStagesToShow(chapterCompleted: boolean, highest: number | null): number[] {
  if (!chapterCompleted) return [];
  const next = (highest ?? ENDLESS_FIRST_STAGE - 1) + 1;
  const first = Math.max(ENDLESS_FIRST_STAGE, next - ENDLESS_SHOWN_COMPLETED);
  const stages: number[] = [];
  for (let stage = first; stage <= next + ENDLESS_SHOWN_PREVIEW; stage++) stages.push(stage);
  return stages;
}

/** Kompletter Kartenzustand für die Kampagnen-Map-UI: Kapitel-Level + der sichtbare
 *  Ausschnitt des Endlos-Turms, jeweils mit Spieler-Fortschritt und Freischaltung. */
export async function getCampaignBoard(userId: string): Promise<CampaignBoardLevel[]> {
  const progressRows = await prisma.userCampaignProgress.findMany({ where: { userId } });
  const progressByLevelId = new Map(progressRows.map((p) => [p.levelId, p]));
  const completed = new Set(progressRows.filter((p) => p.completed).map((p) => p.levelId));

  const toBoardLevel = (levelDef: CampaignLevelDef, section: CampaignBoardLevel["section"]): CampaignBoardLevel => {
    const progress = progressByLevelId.get(levelDef.id);
    return {
      id: levelDef.id,
      order: levelDef.order,
      name: levelDef.name,
      tagline: levelDef.tagline,
      isBoss: levelDef.isBoss ?? false,
      stars: progress?.stars ?? 0,
      completed: progress?.completed ?? false,
      unlocked: isLevelUnlocked(levelDef.id, completed),
      section,
    };
  };

  const chapterCompleted = completed.has(CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1].id);
  const endless = endlessStagesToShow(chapterCompleted, highestEndlessStage(completed));
  return [
    ...CAMPAIGN_LEVELS.map((l) => toBoardLevel(l, "chapter")),
    ...endless.map((stage) => toBoardLevel(generateEndlessLevel(stage), "endless")),
  ];
}

export async function isCampaignLevelUnlocked(userId: string, levelId: string): Promise<boolean> {
  const completed = await prisma.userCampaignProgress.findMany({
    where: { userId, completed: true },
    select: { levelId: true },
  });
  return isLevelUnlocked(levelId, new Set(completed.map((p) => p.levelId)));
}

/** Aktualisiert den Fortschritt nach einem gewonnenen Kampf — die beste je
 *  erzielte Sternebewertung bleibt erhalten, ein erneuter Sieg mit weniger
 *  Sternen verschlechtert nichts. Gibt zurück, wie viele Sterne NEU
 *  hinzugekommen sind (Differenz zur bisherigen Bestleistung) — nur dafür
 *  gibt live-battle.ts Münzen (CAMPAIGN_COINS_PER_STAR je neuem Stern);
 *  schon erreichte Sterne zahlen bei erneutem Sieg nicht nochmal aus, sonst
 *  ließe sich durch wiederholtes Replayen unbegrenzt farmen. */
export async function recordCampaignResult(
  userId: string,
  levelId: string,
  stars: 1 | 2 | 3
): Promise<{ starsGained: number }> {
  const existing = await prisma.userCampaignProgress.findUnique({
    where: { userId_levelId: { userId, levelId } },
  });
  const previousBestStars = existing?.stars ?? 0;
  const starsGained = Math.max(0, stars - previousBestStars);
  // Ohne Verbesserung nichts schreiben: updatedAt markiert so den Zeitpunkt des letzten
  // Sterne-Zuwachses und dient der Rangliste als Gleichstands-Regel (siehe leaderboard.ts).
  if (existing?.completed && starsGained === 0) return { starsGained };

  await prisma.userCampaignProgress.upsert({
    where: { userId_levelId: { userId, levelId } },
    create: { userId, levelId, stars, completed: true, completedAt: new Date() },
    update: {
      stars: Math.max(stars, previousBestStars),
      completed: true,
      completedAt: existing?.completedAt ?? new Date(),
    },
  });

  return { starsGained };
}

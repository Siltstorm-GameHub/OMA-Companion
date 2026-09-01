// ============================================
// Kampagnen-Logik — "Edelstein-Kampf"-Kampagne
// ============================================
// Bindeglied zwischen den hart hinterlegten Level-Inhalten (campaign-levels.ts)
// und dem Spieler-Fortschritt in der DB (UserCampaignProgress, siehe
// schema.prisma). Enthält bewusst KEINE Kampf-Start-Logik (die lebt in
// live-battle.ts, um Zirkelimporte zu vermeiden — live-battle.ts importiert
// von hier, nicht umgekehrt).

import { prisma } from "@/lib/prisma";
import type { BattleUnitDefinition } from "@/lib/battle-engine/types";
import type { InteractiveBattleState } from "@/lib/battle-engine/interactive";
import { instantiateMonster } from "./monster-content";
import { CAMPAIGN_LEVELS, getCampaignLevel, type CampaignLevelDef } from "./campaign-levels";

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
}

/** Kompletter Kartenzustand für die Kampagnen-Map-UI: Level-Inhalte +
 *  Spieler-Fortschritt + berechnete Freischaltung (Level N braucht Level N-1
 *  abgeschlossen; Level 1 ist immer freigeschaltet). */
export async function getCampaignBoard(userId: string): Promise<CampaignBoardLevel[]> {
  const progressRows = await prisma.userCampaignProgress.findMany({ where: { userId } });
  const progressByLevelId = new Map(progressRows.map((p) => [p.levelId, p]));

  let previousCompleted = true;
  return CAMPAIGN_LEVELS.map((levelDef) => {
    const progress = progressByLevelId.get(levelDef.id);
    const unlocked = previousCompleted;
    previousCompleted = progress?.completed ?? false;
    return {
      id: levelDef.id,
      order: levelDef.order,
      name: levelDef.name,
      tagline: levelDef.tagline,
      isBoss: levelDef.isBoss ?? false,
      stars: progress?.stars ?? 0,
      completed: progress?.completed ?? false,
      unlocked,
    };
  });
}

export async function isCampaignLevelUnlocked(userId: string, levelId: string): Promise<boolean> {
  const board = await getCampaignBoard(userId);
  return board.some((l) => l.id === levelId && l.unlocked);
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

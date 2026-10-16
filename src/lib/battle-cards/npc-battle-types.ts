// ============================================
// OMA Gems — Schwierigkeit und LiveBattle.mode der Event-Turniere
// ============================================

export type NpcDifficulty = "EASY" | "MEDIUM" | "HARD";

/** Monster-Stufe je Turnier-Schwierigkeit (siehe LEVEL_STAT_MULTIPLIER in
 *  battle-engine/constants.ts und generateGemsTournamentBossTeam). */
export const DIFFICULTY_LEVEL: Record<NpcDifficulty, number> = { EASY: 1, MEDIUM: 3, HARD: 5 };

const TOURNAMENT_MODE_PREFIX = "TOURNAMENT_";

export function tournamentModeFor(gemsTournamentId: string): string {
  return `${TOURNAMENT_MODE_PREFIX}${gemsTournamentId}`;
}

export function parseTournamentMode(mode: string): { gemsTournamentId: string } | null {
  if (!mode.startsWith(TOURNAMENT_MODE_PREFIX)) return null;
  return { gemsTournamentId: mode.slice(TOURNAMENT_MODE_PREFIX.length) };
}

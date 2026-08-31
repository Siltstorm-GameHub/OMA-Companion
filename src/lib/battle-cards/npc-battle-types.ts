export type NpcDifficulty = "EASY" | "MEDIUM" | "HARD";

/** NPC-Kartenstufe je Schwierigkeit (siehe LEVEL_STAT_MULTIPLIER in
 *  battle-engine/constants.ts) — zentral hier, damit live-battle.ts (echte
 *  NPC-Kämpfe) und die Gewinnchancen-Einschätzung (matchup-strength) exakt
 *  dieselbe Skalierung verwenden. */
export const DIFFICULTY_LEVEL: Record<NpcDifficulty, number> = { EASY: 1, MEDIUM: 3, HARD: 5 };

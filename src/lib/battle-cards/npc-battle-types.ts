export type NpcDifficulty = "EASY" | "MEDIUM" | "HARD";

/** NPC-Kartenstufe je Schwierigkeit (siehe LEVEL_STAT_MULTIPLIER in
 *  battle-engine/constants.ts) — zentral hier, damit live-battle.ts (echte
 *  NPC-Kämpfe) und die Gewinnchancen-Einschätzung (matchup-strength) exakt
 *  dieselbe Skalierung verwenden. */
export const DIFFICULTY_LEVEL: Record<NpcDifficulty, number> = { EASY: 1, MEDIUM: 3, HARD: 5 };

/** Münz-Belohnung bei Sieg gegen NPC, je Schwierigkeit — zentral hier, damit
 *  live-battle.ts (Vergabe) und NpcBattleLauncher.tsx (Anzeige) denselben Wert nutzen. */
export const NPC_BATTLE_WIN_REWARD: Record<NpcDifficulty, number> = { EASY: 100, MEDIUM: 200, HARD: 300 };

/** Max. Anzahl gestarteter NPC-Kämpfe pro Tag (UTC) und User, über alle
 *  Schwierigkeiten summiert — verhindert Farmen der Münz-Belohnung. */
export const NPC_BATTLE_DAILY_LIMIT = 5;

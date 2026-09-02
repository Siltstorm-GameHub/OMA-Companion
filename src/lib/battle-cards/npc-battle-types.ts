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

// ── Match-3-"OMA Gems" (Puzzle-PvE, siehe board-match3.ts) ──────────
// Zusätzlicher LiveBattle.mode-Präfix neben dem bestehenden Auto-Kampf-PVE —
// beide Modi laufen parallel, teilen sich aber Schwierigkeit/Belohnung/Limit.

const PVE_PREFIX = "PVE_";
export const PUZZLE_MODE_PREFIX = "PVE_PUZZLE_";

export function puzzleModeFor(difficulty: NpcDifficulty): string {
  return `${PUZZLE_MODE_PREFIX}${difficulty}`;
}

/** Extrahiert Schwierigkeit + ob es sich um den Puzzle-Modus handelt, aus einem
 *  LiveBattle.mode-String — zentral hier, damit live-battle.ts (Belohnungs-
 *  Vergabe in finalizeLiveBattle) und UI-Code dieselbe Zuordnung nutzen. Ersetzt
 *  das naive `mode.slice("PVE_".length)`, das für "PVE_PUZZLE_EASY" fälschlich
 *  "PUZZLE_EASY" ergeben würde (kein gültiger NpcDifficulty-Key). */
export function parseNpcMode(mode: string): { difficulty: NpcDifficulty; isPuzzle: boolean } | null {
  const prefix = mode.startsWith(PUZZLE_MODE_PREFIX) ? PUZZLE_MODE_PREFIX : mode.startsWith(PVE_PREFIX) ? PVE_PREFIX : null;
  if (!prefix) return null;

  const difficulty = mode.slice(prefix.length) as NpcDifficulty;
  if (!(difficulty in DIFFICULTY_LEVEL)) return null;

  return { difficulty, isPuzzle: prefix === PUZZLE_MODE_PREFIX };
}

// ── OMA-Gems-PvP (asynchroner Ghost-Angriff, siehe gems-pvp.ts) ────────────

/** LiveBattle.mode für einen Gems-PvP-Kampf — kein Suffix nötig, der Gegner
 *  steckt in LiveBattle.playerBId (Team B ist trotzdem KI-gesteuert, siehe
 *  startLiveGemsPvpBattle). */
export const PVP_GEMS_MODE = "PVP_GEMS";

/** Max. Anzahl gestarteter Gems-PvP-Angriffe pro Tag (UTC) und User —
 *  eigenständig vom NPC-Tageslimit, verhindert Farmen der Sieges-Kiste. */
export const GEMS_PVP_DAILY_LIMIT = 5;

// ── OMA-Gems-Turniere (Score-Attack, siehe gems-tournament.ts) ─────────────

const TOURNAMENT_MODE_PREFIX = "TOURNAMENT_";

export function tournamentModeFor(gemsTournamentId: string): string {
  return `${TOURNAMENT_MODE_PREFIX}${gemsTournamentId}`;
}

export function parseTournamentMode(mode: string): { gemsTournamentId: string } | null {
  if (!mode.startsWith(TOURNAMENT_MODE_PREFIX)) return null;
  return { gemsTournamentId: mode.slice(TOURNAMENT_MODE_PREFIX.length) };
}

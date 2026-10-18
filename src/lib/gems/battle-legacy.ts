// ============================================
// OMA Gems — alte offene Kämpfe zurücksetzen
// ============================================
// Ein offener Kampf (LiveBattle, status "active") trägt seinen kompletten Zustand als JSON. Kämpfe, die vor
// den Umbauten des Bretts, der Werte und der Karten-XP begonnen wurden, passen nicht mehr zur heutigen
// Engine: „Kampf fortsetzen“ im Hub führte in einen Fehler. Sie werden deshalb verworfen — beim Aufruf des
// Hubs, der Kampf-Seite und der Kampf-API, jeweils nur für den betroffenen Spieler, ohne Eingriff in die
// Datenbank beim Deployen. Turnier-Kämpfe bleiben unberührt: die Zahl der Versuche wird aus ihnen gezählt
// (siehe gems-tournament.ts), ein Löschen würde Versuche zurückgeben.

import { prisma } from "@/lib/prisma";
import { BOARD_COLS, BOARD_ROWS } from "@/lib/battle-engine/constants";

/** Offene Kämpfe, die vor diesem Zeitpunkt zuletzt bewegt wurden, stammen aus einer älteren Spielversion:
 *  18.10.2026, 00:00 Uhr deutscher Zeit (MESZ, UTC+2). */
export const LEGACY_BATTLE_CUTOFF = new Date("2026-10-17T22:00:00.000Z");

const TOURNAMENT_PREFIX = "TOURNAMENT_";

/** Hat der gespeicherte Zustand die Form, die die heutige Engine erwartet (Teams, Brett, Zufallszustand)? */
export function isUsableBattleState(stateJson: unknown): boolean {
  const state = stateJson as {
    unitsA?: unknown;
    unitsB?: unknown;
    boardGrid?: unknown;
    boardSpecials?: unknown;
    rngState?: unknown;
  } | null;
  if (!state || typeof state !== "object") return false;
  const cells = BOARD_COLS * BOARD_ROWS;
  return (
    Array.isArray(state.unitsA) &&
    state.unitsA.length > 0 &&
    Array.isArray(state.unitsB) &&
    state.unitsB.length > 0 &&
    Array.isArray(state.boardGrid) &&
    state.boardGrid.length === cells &&
    Array.isArray(state.boardSpecials) &&
    state.boardSpecials.length === cells &&
    typeof state.rngState === "number"
  );
}

/** Ein offener Kampf (kein Turnier) ist veraltet, wenn er vor dem Stichtag zuletzt bewegt wurde oder sein
 *  Zustand nicht mehr zur Engine passt. */
export function isStaleOpenBattle(live: { mode: string; status: string; updatedAt: Date; stateJson: unknown }): boolean {
  if (live.status !== "active" || live.mode.startsWith(TOURNAMENT_PREFIX)) return false;
  return live.updatedAt < LEGACY_BATTLE_CUTOFF || !isUsableBattleState(live.stateJson);
}

/** Verwirft die veralteten offenen Kämpfe eines Spielers, die sich allein am Datum erkennen lassen. */
export async function discardLegacyBattles(userId: string): Promise<number> {
  const { count } = await prisma.liveBattle.deleteMany({
    where: {
      playerAId: userId,
      status: "active",
      updatedAt: { lt: LEGACY_BATTLE_CUTOFF },
      NOT: { mode: { startsWith: TOURNAMENT_PREFIX } },
    },
  });
  return count;
}

/** Verwirft einen einzelnen veralteten Kampf (z. B. mit unbrauchbarem Zustand). */
export async function discardBattle(id: string): Promise<void> {
  await prisma.liveBattle.deleteMany({ where: { id, status: "active" } });
}

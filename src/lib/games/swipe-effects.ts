/**
 * Was nach einer Swipe-Entscheidung passiert — nur serverseitig: Die allererste Entscheidung zu einem
 * Spiel zählt für die Monats-Quest (GAME_SWIPE), "Am Start" prüft Matches im Squad (matches.ts).
 */

import { updateQuestProgress } from "@/lib/quests";
import { squadMatchesFor, type GameMatchInfo } from "./matches";
import type { SwipeStatus } from "./swipe";

export async function afterSwipe(
  userId: string, gameId: string, status: SwipeStatus | null, firstDecision: boolean,
): Promise<GameMatchInfo[]> {
  if (firstDecision) await updateQuestProgress(userId, "GAME_SWIPE", 1).catch(() => {});
  if (status !== "in") return [];
  return squadMatchesFor(userId, gameId, true).catch(err => {
    console.error("[games] Match-Prüfung", err);
    return [];
  });
}

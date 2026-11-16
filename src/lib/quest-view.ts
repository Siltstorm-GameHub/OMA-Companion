// Quests-Seite: Sortierung, Tempo und Summen — reine Funktionen (getestet in quest-view.test.ts).

export interface QuestRowInput {
  id: string;
  target: number;
  reward: number;
  current: number;
  completed: boolean;
}

/** Fortschritt 0..1 (gekappt) */
export function questRatio(q: Pick<QuestRowInput, "current" | "target">): number {
  return q.target > 0 ? Math.min(1, Math.max(0, q.current / q.target)) : 0;
}

/** Offene Quests: am nächsten am Ziel zuerst, bei Gleichstand höhere Belohnung zuerst. */
export function sortOpenQuests<T extends QuestRowInput>(quests: T[]): T[] {
  return quests.filter(q => !q.completed).sort((a, b) => questRatio(b) - questRatio(a) || b.reward - a.reward);
}

/**
 * Wie viel pro Tag noch nötig ist, um bis Monatsende fertig zu werden (aufgerundet).
 * daysLeft = verbleibende Tage INKLUSIVE heute. null, wenn nichts mehr fehlt.
 */
export function dailyRate(q: Pick<QuestRowInput, "current" | "target">, daysLeft: number): number | null {
  const missing = q.target - q.current;
  if (missing <= 0) return null;
  return Math.ceil(missing / Math.max(1, daysLeft));
}

export function questCoins(quests: QuestRowInput[]): { earned: number; total: number } {
  return {
    earned: quests.filter(q => q.completed).reduce((s, q) => s + q.reward, 0),
    total: quests.reduce((s, q) => s + q.reward, 0),
  };
}

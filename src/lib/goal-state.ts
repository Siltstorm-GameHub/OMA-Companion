// Zustand eines Community-Ziels (Event.goalStateJson) — reine Funktionen ohne DB-Zugriff, damit auch
// Client-Komponenten ihn lesen können. Geschrieben wird er in lib/community-goal-milestones.ts.

export type GoalState = {
  /** Bereits gemeldete Stufen (in %) */
  milestones: number[];
  /** Wer die Belohnung schon bekommen hat */
  rewardedUserIds: string[];
  /** Zeitpunkt der ersten Auszahlung */
  rewardedAt?: string;
  /** Wann welche Stufe erreicht wurde (ISO-Zeit je Stufe) — für "gerade geschafft" auf der Startseite */
  milestoneAt?: Record<string, string>;
  /** Nur Ø-Ziele: Zeitpunkt der Abrechnung am Ende des Zeitraums */
  settledAt?: string;
  /** Nur Ø-Ziele: Ergebnis der Abrechnung */
  settledReached?: boolean;
};

export function parseGoalState(json: string | null | undefined): GoalState {
  try {
    const raw = json ? JSON.parse(json) as Partial<GoalState> : {};
    return {
      milestones: Array.isArray(raw.milestones) ? raw.milestones.filter(n => typeof n === "number") : [],
      rewardedUserIds: Array.isArray(raw.rewardedUserIds) ? raw.rewardedUserIds.filter(s => typeof s === "string") : [],
      ...(typeof raw.rewardedAt === "string" && { rewardedAt: raw.rewardedAt }),
      ...(typeof raw.settledAt === "string" && { settledAt: raw.settledAt }),
      ...(typeof raw.settledReached === "boolean" && { settledReached: raw.settledReached }),
      ...(raw.milestoneAt && typeof raw.milestoneAt === "object" && !Array.isArray(raw.milestoneAt) && {
        milestoneAt: Object.fromEntries(Object.entries(raw.milestoneAt).filter(([, v]) => typeof v === "string")),
      }),
    };
  } catch {
    return { milestones: [], rewardedUserIds: [] };
  }
}

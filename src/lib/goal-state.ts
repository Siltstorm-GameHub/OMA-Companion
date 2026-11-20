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
  /** Zeitpunkt der Abrechnung am Ende des Zeitraums (Ende erreicht oder Spielphase abgeschlossen) */
  settledAt?: string;
  /** Ergebnis der Abrechnung am Ende des Zeitraums (alle Ziele) */
  settledReached?: boolean;
  /** Tabellenpunkte der Eventreihe je Belohntem (goal.rewardSeriesPoints, beim Erreichen eingefroren) */
  seriesPoints?: Record<string, number>;
  /** Geschaffte Zyklen in Folge inkl. diesem (nur Eventreihen mit Serien-Bonus) */
  streak?: number;
  /** Wer den Serien-Bonus für diesen Zyklus bekommen hat */
  streakBonusUserIds?: string[];
  /** Tatsächlich ausgezahlte Münzen je Person (Belohnung + Serien-Bonus) — für "Neu auswerten" und das
   *  Löschen eines Events, damit genau diese Beträge zurückgebucht werden. Fehlt bei Altdaten. */
  paid?: Record<string, number>;
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
      ...(raw.seriesPoints && typeof raw.seriesPoints === "object" && !Array.isArray(raw.seriesPoints) && {
        seriesPoints: Object.fromEntries(Object.entries(raw.seriesPoints).filter(([, v]) => typeof v === "number" && Number.isFinite(v))),
      }),
      ...(typeof raw.streak === "number" && { streak: raw.streak }),
      ...(Array.isArray(raw.streakBonusUserIds) && { streakBonusUserIds: raw.streakBonusUserIds.filter(x => typeof x === "string") }),
      ...(raw.paid && typeof raw.paid === "object" && !Array.isArray(raw.paid) && {
        paid: Object.fromEntries(Object.entries(raw.paid).filter(([, v]) => typeof v === "number" && Number.isFinite(v))),
      }),
      ...(raw.milestoneAt && typeof raw.milestoneAt === "object" && !Array.isArray(raw.milestoneAt) && {
        milestoneAt: Object.fromEntries(Object.entries(raw.milestoneAt).filter(([, v]) => typeof v === "string")),
      }),
    };
  } catch {
    return { milestones: [], rewardedUserIds: [] };
  }
}

/** Geschaffte Zyklen in Folge inkl. des aktuellen: frühere Ergebnisse, neuester zuerst (true = geschafft). */
export function goalStreakAfter(previousNewestFirst: boolean[]): number {
  let n = 1;
  for (const ok of previousNewestFirst) { if (!ok) break; n++; }
  return n;
}

/** Gibt es für diese Serie einen Bonus? Alle `length` Zyklen in Folge (bei 3: nach 3, 6, 9 …). */
export function streakBonusDue(streak: number, bonus: { length: number } | null | undefined): boolean {
  return !!bonus && bonus.length >= 2 && streak > 0 && streak % bonus.length === 0;
}

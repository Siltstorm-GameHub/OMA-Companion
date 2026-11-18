// Formular-Darstellung eines Community-Ziels (CommunityGoalEditor) — ohne "use client", damit auch
// Server-Komponenten (z.B. Wizard-Vorbelegung) goalToForm nutzen können.
import {
  RESULT_SCORE_FIELD,
  sanitizeCommunityGoal,
  type CommunityGoal, type CommunityGoalDirection, type CommunityGoalMode, type CommunityGoalScope,
} from "@/lib/community-goal";

export type CommunityGoalForm = {
  enabled: boolean;
  title: string;
  fields: string[];
  target: number;
  scope: CommunityGoalScope;
  /** Summe oder gemeinsamer Durchschnitt */
  mode: CommunityGoalMode;
  /** Nur Durchschnitt: mindestens / höchstens */
  direction: CommunityGoalDirection;
  /** Nur Durchschnitt: so viele Teilnehmer brauchen Werte, damit das Ziel zählt */
  minParticipants: number;
  unit: string;
  /** Münzen pro Mitwirkendem bei Erreichen (0 = keine Belohnung) */
  rewardCoins: number;
  /** Endstand am Ende des Zeitraums melden, auch wenn verfehlt */
  announceResult: boolean;
  /** Serien-Bonus: alle N Zyklen in Folge (0 = aus) … */
  streakLength: number;
  /** … so viele Bonus-Münzen */
  streakCoins: number;
  /** Tabellenpunkte der Reihe je Belohntem (0 = aus) */
  rewardSeriesPoints: number;
};

export const EMPTY_COMMUNITY_GOAL_FORM: CommunityGoalForm = {
  enabled: false, title: "", fields: [], target: 100, scope: "community", mode: "sum", direction: "atLeast",
  minParticipants: 1, unit: "", rewardCoins: 0, announceResult: true, streakLength: 0, streakCoins: 0, rewardSeriesPoints: 0,
};

export function goalToForm(goal: CommunityGoal | null): CommunityGoalForm {
  if (!goal) return EMPTY_COMMUNITY_GOAL_FORM;
  return {
    enabled: true, title: goal.title ?? "", fields: goal.fields, target: goal.target, scope: goal.scope,
    mode: goal.mode ?? "sum", direction: goal.direction ?? "atLeast", minParticipants: goal.minParticipants ?? 1,
    unit: goal.unit ?? "", rewardCoins: goal.rewardCoins ?? 0,
    announceResult: goal.announceResult === true,
    streakLength: goal.streakBonus?.length ?? 0, streakCoins: goal.streakBonus?.coins ?? 0,
    rewardSeriesPoints: goal.rewardSeriesPoints ?? 0,
  };
}

/** Formular → gespeichertes Ziel (null = kein Ziel / unvollständig). Nur Felder, die das Event hat. */
export function formToGoal(form: CommunityGoalForm, statFields: string[]): CommunityGoal | null {
  if (!form.enabled) return null;
  // Ergebnis-Formate (Liga, K.O., …) haben genau ein auswertbares Feld — das Ergebnis
  const resultOnly = statFields.length === 1 && statFields[0] === RESULT_SCORE_FIELD;
  return sanitizeCommunityGoal({
    ...form,
    ...(resultOnly && { fields: [RESULT_SCORE_FIELD], scope: form.scope === "team" ? "community" : form.scope }),
    streakBonus: form.streakLength >= 2 && form.streakCoins > 0 ? { length: form.streakLength, coins: form.streakCoins } : undefined,
  }, statFields);
}

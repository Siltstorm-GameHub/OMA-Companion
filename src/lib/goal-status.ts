// Stand eines Community-Ziels für die Verwaltung (Reiter "Ziel", Übersicht "Verwalten"):
// Fortschritt, Abrechnung und wer was bekommen hat. Nur lesend, keine Auszahlung.

import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress, formatGoalNumber, goalTargetLabel, goalUnit, isAvgGoal,
  type CommunityGoal, type GoalMatch,
} from "@/lib/community-goal";
import { resolveEventGoal } from "@/lib/event-goal";
import { parseGoalState } from "@/lib/goal-state";

export type GoalStatusData = {
  percent: number;
  current: string;
  target: string;
  reached: boolean;
  settled: boolean;
  awaitingApproval: boolean;
  rewarded: { id: string; name: string; coins: number | null; seriesPoints: number }[];
};

type GoalEvent = {
  format: string | null;
  statConfigJson: string | null;
  goalStateJson: string | null;
  approvalStatus: string | null;
  series?: { tournamentTemplateJson?: string | null; approvalStatus?: string | null } | null;
  matches: GoalMatch[];
};

/** Fortschritt in % und "aktueller Stand" als Text — ohne DB, auch für Listen nutzbar. */
export function goalProgressSummary(goal: CommunityGoal, matches: GoalMatch[]): { percent: number; current: string; reached: boolean } {
  const p = computeCommunityGoalProgress(matches, goal);
  const n = formatGoalNumber(p.main.total, goal);
  return { percent: p.main.percent, current: isAvgGoal(goal) ? `Ø ${n} ${goalUnit(goal)}` : `${n} ${goalUnit(goal)}`, reached: p.reached };
}

/** Stand des Ziels eines Events — null, wenn es (eigen oder geerbt) keins hat. */
export async function loadGoalStatus(ev: GoalEvent): Promise<GoalStatusData | null> {
  const goal = resolveEventGoal(ev).goal;
  if (!goal) return null;
  const summary = goalProgressSummary(goal, ev.matches);
  const state = parseGoalState(ev.goalStateJson);
  const ids = [...new Set([
    ...state.rewardedUserIds, ...(state.streakBonusUserIds ?? []),
    ...Object.keys(state.seriesPoints ?? {}), ...Object.keys(state.paid ?? {}),
  ])];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, username: true } })
    : [];
  const nameOf = (id: string) => { const u = users.find(x => x.id === id); return u?.username ?? u?.name ?? "Unbekannt"; };
  return {
    percent: summary.percent,
    current: summary.current,
    target: goalTargetLabel(goal),
    reached: summary.reached || state.settledReached === true,
    settled: !!state.settledAt,
    awaitingApproval: [ev.approvalStatus, ev.series?.approvalStatus].some(s => s === "pending" || s === "rejected"),
    rewarded: ids.map(id => ({
      id, name: nameOf(id),
      // Altdaten ohne "paid": Betrag unbekannt
      coins: state.paid ? (state.paid[id] ?? 0) : null,
      seriesPoints: state.seriesPoints?.[id] ?? 0,
    })).sort((a, b) => a.name.localeCompare(b.name, "de")),
  };
}

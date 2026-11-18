// ============================================
// Community-Ziele — Meilenstein-Meldungen und Belohnung
// ============================================
// Nach jedem gespeicherten Rundenwert (Admin-Eingabe oder übernommene Teilnehmer-Meldung) wird
// geprüft, ob das Ziel eine neue Stufe erreicht hat (25/50/75/100 %). Dann:
//   - eine Meldung an alle Teilnehmer (Push/In-App, optional Discord-Kanal) — Regel
//     "event_goal_milestone", bei mehreren neuen Stufen auf einmal nur die höchste
//   - sobald das Ziel erreicht ist: Münzen an alle Mitwirkenden (goal.rewardCoins), jede Person nur
//     einmal; Community-Events (von normalen Usern angelegt) auf die Community-Obergrenze gekappt.
//
// Ø-Ziele (goal.mode "avg") können wieder fallen — sie melden keine Zwischenstufen und werden erst
// abgerechnet, wenn der Zeitraum vorbei ist (Event.endAt) oder die Spielphase abgeschlossen wurde:
// dann einmalig "erreicht" (Meldung + Münzen) oder "verfehlt" (nur settledAt). Ausgelöst vom Cron
// event-reminders (settleEndedAverageGoals) und vom Event-Abschluss.
// Der Zustand liegt in Event.goalStateJson (nicht in statConfigJson — das wird beim Speichern der
// Turnier-Einstellungen neu geschrieben und würde Meldungen/Auszahlungen sonst wiederholen).

import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress,
  formatGoalNumber,
  goalUnit,
  isAvgGoal,
  type CommunityGoal,
  type CommunityGoalProgress,
} from "@/lib/community-goal";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { capValue } from "@/lib/captain-reward-limits";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { parseEntryStats } from "@/lib/avg-stats";
import { mayHaveGoalWhere, resolveEventGoal } from "@/lib/event-goal";
import { parseGoalState, type GoalState } from "@/lib/goal-state";

export const GOAL_MILESTONES = [25, 50, 75, 100] as const;

export { parseGoalState, type GoalState } from "@/lib/goal-state";

/** Team je Spieler (letzte Zuordnung "_team" über alle Runden) — für die Team-Belohnung. */
export function userTeams(matches: { entries: { userId: string | null; statsJson: string | null }[] }[]): Record<string, "A" | "B"> {
  const out: Record<string, "A" | "B"> = {};
  for (const m of matches) {
    for (const e of m.entries) {
      const s = parseEntryStats(e.statsJson) as Record<string, unknown> | null;
      const team = s?.["_team"];
      if (e.userId && (team === "A" || team === "B")) out[e.userId] = team;
    }
  }
  return out;
}

/** Wer laut Ziel-Art eine Belohnung verdient (ohne Rücksicht darauf, wer sie schon hat). */
export function eligibleForReward(progress: CommunityGoalProgress, teams: Record<string, "A" | "B">): string[] {
  const contributors = progress.contributorIds;
  if (progress.goal.scope === "solo") return progress.reachedUserIds;
  if (progress.goal.scope === "team") {
    const winners = new Set(progress.reachedTeams);
    return contributors.filter(id => teams[id] && winners.has(teams[id]));
  }
  return progress.reached ? contributors : [];
}

/** Reine Auswertung (testbar): neue Stufe + neu zu belohnende Personen. */
export function evaluateGoal(
  progress: CommunityGoalProgress,
  state: GoalState,
  teams: Record<string, "A" | "B">,
): { newMilestone: number | null; milestones: number[]; rewardUserIds: string[] } {
  // Ø-Ziele kennen keine Zwischenstufen (ein Ø schwankt) — nur "erreicht" bei der Abrechnung
  const stages = isAvgGoal(progress.goal) ? [100] : GOAL_MILESTONES;
  const reachedStages = stages.filter(p => (p === 100 ? progress.reached : progress.main.percent >= p));
  const fresh = reachedStages.filter(p => !state.milestones.includes(p));
  const already = new Set(state.rewardedUserIds);
  const rewardUserIds = eligibleForReward(progress, teams).filter(id => !already.has(id));
  return {
    newMilestone: fresh.length ? Math.max(...fresh) : null,
    milestones: [...new Set([...state.milestones, ...reachedStages])].sort((a, b) => a - b),
    rewardUserIds,
  };
}

/** Ist ein Ø-Ziel abrechenbar? Erst wenn der Zeitraum vorbei ist oder die Spielphase abgeschlossen wurde. */
export function avgGoalDue(ev: { endAt: Date | string | null; completionData: string | null }, now = Date.now()): boolean {
  if (ev.endAt && new Date(ev.endAt).getTime() <= now) return true;
  if (!ev.completionData) return false;
  try { return (JSON.parse(ev.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
  catch { return false; }
}

function milestoneText(p: number, goal: CommunityGoal): string {
  const who = goal.scope === "team" ? "Ein Team hat" : goal.scope === "solo" ? "Der Beste hat" : "Wir haben";
  if (p >= 100 && isAvgGoal(goal)) {
    return goal.scope === "community" ? "Geschafft! Unser gemeinsamer Durchschnitt hat das Ziel erreicht 🎉" : `${who} das Durchschnitts-Ziel erreicht 🎉`;
  }
  if (p >= 100) return goal.scope === "community" ? "Geschafft! Wir haben das Ziel gemeinsam erreicht 🎉" : `${who} das Ziel erreicht 🎉`;
  if (p === 50) return `Halbzeit! ${who} die Hälfte geschafft.`;
  return `${who} ${p} % geschafft.`;
}

/**
 * Prüft das Community-Ziel eines Events nach einer Ergebnis-Änderung. Wirft nie (Fehler werden nur
 * geloggt), damit das Speichern eines Rundenwerts nie daran scheitert.
 */
export async function checkCommunityGoal(eventId: string): Promise<void> {
  try {
    const peek = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        format: true, statConfigJson: true, status: true, endAt: true, completionData: true, goalStateJson: true,
        series: { select: { tournamentTemplateJson: true } },
      },
    });
    // Eigenes oder von der Reihe geerbtes Ziel (lib/event-goal.ts)
    const peekGoal = peek ? resolveEventGoal(peek).goal : null;
    if (!peek || !peekGoal) return;
    if (isAvgGoal(peekGoal)) {
      // Ø-Ziel: live nur anzeigen, abgerechnet wird am Ende des Zeitraums — auch wenn das Event da
      // schon beendet ist, aber nur einmal (danach nur noch Nachträge zu bereits erreichten Zielen)
      if (!avgGoalDue(peek)) return;
      if ((peek.status === "finished" || peek.status === "closed") && parseGoalState(peek.goalStateJson).settledAt) return;
    } else if (peek.status === "finished" || peek.status === "closed") {
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Parallele Speichervorgänge desselben Events serialisieren — sonst doppelte Meldung/Auszahlung
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"goal:" + eventId}))`;
      const ev = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          title: true, format: true, statConfigJson: true, goalStateJson: true, approvalStatus: true, seriesId: true,
          series: { select: { approvalStatus: true, tournamentTemplateJson: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      });
      const goal = ev ? resolveEventGoal(ev).goal : null;
      if (!ev || !goal) return null;
      const progress = computeCommunityGoalProgress(ev.matches, goal);
      const state = parseGoalState(ev.goalStateJson);
      const { newMilestone, milestones, rewardUserIds } = evaluateGoal(progress, state, userTeams(ev.matches));

      // Belohnung — Community-Events (von normalen Usern angelegt) auf die Community-Obergrenze kappen
      let coins = goal.rewardCoins ?? 0;
      const isCommunity = !!(ev.approvalStatus || ev.series?.approvalStatus);
      if (coins > 0 && isCommunity) {
        const limits = await getCommunityLimits();
        coins = capValue(coins, (ev.seriesId ? limits.seriesEvent : limits.standalone).goalRewardCoins);
      }
      const payees = coins > 0 ? rewardUserIds : [];
      if (payees.length > 0) {
        const reason = `Community-Ziel erreicht: ${goal.title || ev.title}`;
        await tx.user.updateMany({ where: { id: { in: payees } }, data: { points: { increment: coins } } });
        await tx.pointTransaction.createMany({ data: payees.map(userId => ({ userId, amount: coins, reason })) });
      }

      const settleNow = isAvgGoal(goal) && !state.settledAt;
      const changed = newMilestone !== null || payees.length > 0 || settleNow || (isAvgGoal(goal) && state.settledReached !== progress.reached);
      if (changed) {
        const nowIso = new Date().toISOString();
        const milestoneAt = { ...state.milestoneAt };
        for (const p of milestones) if (!state.milestones.includes(p)) milestoneAt[String(p)] = nowIso;
        const next: GoalState = {
          milestones,
          milestoneAt,
          rewardedUserIds: [...state.rewardedUserIds, ...payees],
          ...(state.rewardedAt || payees.length ? { rewardedAt: state.rewardedAt ?? new Date().toISOString() } : {}),
          ...(isAvgGoal(goal) && { settledAt: state.settledAt ?? nowIso, settledReached: progress.reached }),
        };
        await tx.event.update({ where: { id: eventId }, data: { goalStateJson: JSON.stringify(next) } });
      }
      const awaitingApproval = ev.approvalStatus === "pending" || ev.series?.approvalStatus === "pending";
      return { goal, progress, newMilestone, awaitingApproval, payees, coins };
    });

    // Meldung nach der Transaktion (Push/Discord dürfen den Lock nicht halten). Community-Events ohne
    // Mod-Freigabe melden nichts nach außen — wie alle anderen Ankündigungen.
    if (result?.newMilestone && !result.awaitingApproval) {
      const { goal, progress, newMilestone } = result;
      await dispatchEventNotification("event_goal_milestone", { id: eventId }, {
        placeholders: {
          "{goalTitle}": goal.title || "Community-Ziel",
          "{percent}": String(newMilestone),
          "{milestoneText}": milestoneText(newMilestone, goal)
            + (newMilestone >= 100 && result.coins > 0 && result.payees.length > 0 ? ` Alle Mitwirkenden bekommen ${result.coins} Münzen.` : ""),
          "{current}": formatGoalNumber(progress.main.total, goal),
          "{target}": formatGoalNumber(goal.target, goal),
          "{unit}": goalUnit(goal),
        },
      }).catch(err => console.error("[community-goal] Meldung fehlgeschlagen", err));
    }
  } catch (err) {
    console.error("[community-goal] Prüfung fehlgeschlagen", eventId, err);
  }
}

/**
 * Cron: Ø-Ziele von Terminen abrechnen, deren Zeitraum vorbei ist (siehe Kopfkommentar). Schaut nur
 * auf die letzten 30 Tage, damit alte Events ohne Abrechnung nicht ewig geprüft werden.
 */
export async function settleEndedAverageGoals(now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.event.findMany({
    where: {
      endAt: { lte: now, gte: since },
      ...mayHaveGoalWhere,
    },
    select: { id: true, format: true, statConfigJson: true, goalStateJson: true, series: { select: { tournamentTemplateJson: true } } },
  });
  let settled = 0;
  for (const ev of candidates) {
    const goal = resolveEventGoal(ev).goal;
    if (!goal || !isAvgGoal(goal) || parseGoalState(ev.goalStateJson).settledAt) continue;
    await checkCommunityGoal(ev.id);
    settled++;
  }
  return settled;
}

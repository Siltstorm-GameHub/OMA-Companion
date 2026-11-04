// ============================================
// Community-Ziele — Meilenstein-Meldungen und Belohnung
// ============================================
// Nach jedem gespeicherten Rundenwert (Admin-Eingabe oder übernommene Teilnehmer-Meldung) wird
// geprüft, ob das Ziel eine neue Stufe erreicht hat (25/50/75/100 %). Dann:
//   - eine Meldung an alle Teilnehmer (Push/In-App, optional Discord-Kanal) — Regel
//     "event_goal_milestone", bei mehreren neuen Stufen auf einmal nur die höchste
//   - sobald das Ziel erreicht ist: Münzen an alle Mitwirkenden (goal.rewardCoins), jede Person nur
//     einmal; Community-Events (von normalen Usern angelegt) auf die Community-Obergrenze gekappt.
// Der Zustand liegt in Event.goalStateJson (nicht in statConfigJson — das wird beim Speichern der
// Turnier-Einstellungen neu geschrieben und würde Meldungen/Auszahlungen sonst wiederholen).

import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress,
  goalUnit,
  type CommunityGoal,
  type CommunityGoalProgress,
} from "@/lib/community-goal";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { capValue } from "@/lib/captain-reward-limits";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { parseEntryStats } from "@/lib/avg-stats";
import { resolveEventGoal } from "@/lib/event-goal";

export const GOAL_MILESTONES = [25, 50, 75, 100] as const;

export type GoalState = {
  /** Bereits gemeldete Stufen (in %) */
  milestones: number[];
  /** Wer die Belohnung schon bekommen hat */
  rewardedUserIds: string[];
  /** Zeitpunkt der ersten Auszahlung */
  rewardedAt?: string;
};

export function parseGoalState(json: string | null | undefined): GoalState {
  try {
    const raw = json ? JSON.parse(json) as Partial<GoalState> : {};
    return {
      milestones: Array.isArray(raw.milestones) ? raw.milestones.filter(n => typeof n === "number") : [],
      rewardedUserIds: Array.isArray(raw.rewardedUserIds) ? raw.rewardedUserIds.filter(s => typeof s === "string") : [],
      ...(typeof raw.rewardedAt === "string" && { rewardedAt: raw.rewardedAt }),
    };
  } catch {
    return { milestones: [], rewardedUserIds: [] };
  }
}

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
  const contributors = Object.entries(progress.byUser).filter(([, v]) => v > 0).map(([id]) => id);
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
  const reachedStages = GOAL_MILESTONES.filter(p => (p === 100 ? progress.reached : progress.main.percent >= p));
  const fresh = reachedStages.filter(p => !state.milestones.includes(p));
  const already = new Set(state.rewardedUserIds);
  const rewardUserIds = eligibleForReward(progress, teams).filter(id => !already.has(id));
  return {
    newMilestone: fresh.length ? Math.max(...fresh) : null,
    milestones: [...new Set([...state.milestones, ...reachedStages])].sort((a, b) => a - b),
    rewardUserIds,
  };
}

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 0 });

function milestoneText(p: number, goal: CommunityGoal): string {
  const who = goal.scope === "team" ? "Ein Team hat" : goal.scope === "solo" ? "Der Beste hat" : "Wir haben";
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
      select: { format: true, statConfigJson: true, status: true, series: { select: { tournamentTemplateJson: true } } },
    });
    // Eigenes oder von der Reihe geerbtes Ziel (lib/event-goal.ts)
    if (!peek || !resolveEventGoal(peek).goal) return;
    if (peek.status === "finished" || peek.status === "closed") return;

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

      const changed = newMilestone !== null || payees.length > 0;
      if (changed) {
        const next: GoalState = {
          milestones,
          rewardedUserIds: [...state.rewardedUserIds, ...payees],
          ...(state.rewardedAt || payees.length ? { rewardedAt: state.rewardedAt ?? new Date().toISOString() } : {}),
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
          "{current}": fmt(progress.main.total),
          "{target}": fmt(goal.target),
          "{unit}": goalUnit(goal),
        },
      }).catch(err => console.error("[community-goal] Meldung fehlgeschlagen", err));
    }
  } catch (err) {
    console.error("[community-goal] Prüfung fehlgeschlagen", eventId, err);
  }
}

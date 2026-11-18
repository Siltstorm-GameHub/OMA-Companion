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
// Ende des Zeitraums (Event.endAt vorbei oder Spielphase abgeschlossen): einmalige Abrechnung
// (settledAt/settledReached). Ausgelöst vom Cron event-reminders (settleEndedGoals) und vom Abschluss.
//   - Ø-Ziele (goal.mode "avg") können wieder fallen — sie melden keine Zwischenstufen und werden erst
//     hier "erreicht" (Meldung + Münzen) oder "verfehlt"
//   - goal.announceResult: Endstand melden (Regel "event_goal_result"), auch wenn verfehlt
// Zusätzlich beim Erreichen (nur Termine einer Eventreihe):
//   - goal.rewardSeriesPoints: Tabellenpunkte je Belohntem, eingefroren in goalStateJson.seriesPoints
//     und von computeEventPoints (series-event-points.ts) in die Reihentabelle gezählt
//   - goal.streakBonus: alle N geschafften Zyklen in Folge Bonus-Münzen für die Belohnten
// Der Zustand liegt in Event.goalStateJson (nicht in statConfigJson — das wird beim Speichern der
// Turnier-Einstellungen neu geschrieben und würde Meldungen/Auszahlungen sonst wiederholen).

import { prisma } from "@/lib/prisma";
import {
  computeCommunityGoalProgress,
  GOAL_MATCH_SELECT,
  toGoalMatches,
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
import { goalStreakAfter, parseGoalState, streakBonusDue, type GoalState } from "@/lib/goal-state";

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

/** Ist der Zeitraum eines Ziels vorbei? Ende (endAt) erreicht oder Spielphase abgeschlossen. */
export function goalDue(ev: { endAt: Date | string | null; completionData: string | null }, now = Date.now()): boolean {
  if (ev.endAt && new Date(ev.endAt).getTime() <= now) return true;
  if (!ev.completionData) return false;
  try { return (JSON.parse(ev.completionData) as { gamePhaseComplete?: boolean }).gamePhaseComplete === true; }
  catch { return false; }
}
/** @deprecated Name aus der ersten Version — gilt inzwischen für alle Ziele */
export const avgGoalDue = goalDue;

function milestoneText(p: number, goal: CommunityGoal): string {
  const who = goal.scope === "team" ? "Ein Team hat" : goal.scope === "solo" ? "Der Beste hat" : "Wir haben";
  if (p >= 100 && isAvgGoal(goal)) {
    return goal.scope === "community" ? "Geschafft! Unser gemeinsamer Durchschnitt hat das Ziel erreicht 🎉" : `${who} das Durchschnitts-Ziel erreicht 🎉`;
  }
  if (p >= 100) return goal.scope === "community" ? "Geschafft! Wir haben das Ziel gemeinsam erreicht 🎉" : `${who} das Ziel erreicht 🎉`;
  if (p === 50) return `Halbzeit! ${who} die Hälfte geschafft.`;
  return `${who} ${p} % geschafft.`;
}

/** Text der Endstand-Meldung (goal.announceResult) */
export function resultText(progress: CommunityGoalProgress): { title: string; text: string } {
  const pct = Math.floor(progress.main.percent);
  if (progress.reached) return { title: "Geschafft 🎉", text: "Der Zeitraum ist vorbei — wir haben das Ziel erreicht!" };
  if (pct >= 90) return { title: "Knapp verfehlt", text: `Der Zeitraum ist vorbei — so knapp! Uns haben nur ${100 - pct} % gefehlt.` };
  return { title: "Verfehlt", text: "Der Zeitraum ist vorbei — diesmal hat es nicht gereicht. Nächstes Mal packen wir es!" };
}

const isClosed = (status: string) => status === "finished" || status === "closed";

/**
 * Prüft das Community-Ziel eines Events nach einer Ergebnis-Änderung bzw. am Ende des Zeitraums. Wirft
 * nie (Fehler werden nur geloggt), damit das Speichern eines Rundenwerts nie daran scheitert.
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
    const due = goalDue(peek);
    // Ø-Ziel: live nur anzeigen, abgerechnet wird am Ende des Zeitraums
    if (isAvgGoal(peekGoal) && !due) return;
    // Beendete Events: nur noch die einmalige Abrechnung
    if (isClosed(peek.status) && parseGoalState(peek.goalStateJson).settledAt) return;

    const result = await prisma.$transaction(async (tx) => {
      // Parallele Speichervorgänge desselben Events serialisieren — sonst doppelte Meldung/Auszahlung
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"goal:" + eventId}))`;
      const ev = await tx.event.findUnique({
        where: { id: eventId },
        select: {
          title: true, format: true, statConfigJson: true, goalStateJson: true, approvalStatus: true, seriesId: true, startAt: true,
          series: { select: { approvalStatus: true, tournamentTemplateJson: true } },
          matches: { select: GOAL_MATCH_SELECT },
        },
      });
      const goal = ev ? resolveEventGoal(ev).goal : null;
      if (!ev || !goal) return null;
      const progress = computeCommunityGoalProgress(ev.matches, goal);
      const state = parseGoalState(ev.goalStateJson);
      const { newMilestone, milestones, rewardUserIds } = evaluateGoal(progress, state, userTeams(toGoalMatches(ev.matches)));

      // Belohnung — Community-Events (von normalen Usern angelegt) auf die Community-Obergrenze kappen
      const isCommunity = !!(ev.approvalStatus || ev.series?.approvalStatus);
      const limits = isCommunity ? await getCommunityLimits() : null;
      const cap = (coins: number) => limits ? capValue(coins, (ev.seriesId ? limits.seriesEvent : limits.standalone).goalRewardCoins) : coins;
      const coins = cap(goal.rewardCoins ?? 0);
      const payCoins = async (ids: string[], amount: number, reason: string) => {
        if (amount <= 0 || ids.length === 0) return;
        await tx.user.updateMany({ where: { id: { in: ids } }, data: { points: { increment: amount } } });
        await tx.pointTransaction.createMany({ data: ids.map(userId => ({ userId, amount, reason })) });
      };
      await payCoins(rewardUserIds, coins, `Community-Ziel erreicht: ${goal.title || ev.title}`);

      // Tabellenpunkte der Reihe für jeden neu Belohnten (eingefroren — spätere Ziel-Änderungen wirken nicht zurück)
      const seriesPoints = { ...state.seriesPoints };
      if (ev.seriesId && (goal.rewardSeriesPoints ?? 0) > 0) {
        for (const uid of rewardUserIds) seriesPoints[uid] = goal.rewardSeriesPoints!;
      }

      // Serie: beim ersten Erreichen die geschafften Zyklen in Folge zählen, ggf. Bonus
      let streak = state.streak;
      let streakBonusUserIds = state.streakBonusUserIds ?? [];
      let streakPaid: { coins: number; ids: string[] } | null = null;
      const justReached = newMilestone === 100;
      if (justReached && ev.seriesId && goal.streakBonus) {
        const previous = await tx.event.findMany({
          where: { seriesId: ev.seriesId, id: { not: eventId }, startAt: { lt: ev.startAt } },
          orderBy: { startAt: "desc" },
          take: 100,
          select: { format: true, statConfigJson: true, goalStateJson: true, series: { select: { tournamentTemplateJson: true } } },
        });
        const history = previous
          .filter(p => resolveEventGoal(p).goal) // Zyklen ohne Ziel unterbrechen die Serie nicht
          .map(p => parseGoalState(p.goalStateJson).milestones.includes(100));
        streak = goalStreakAfter(history);
        if (streakBonusDue(streak, goal.streakBonus)) {
          const already = new Set(streakBonusUserIds);
          const ids = [...state.rewardedUserIds, ...rewardUserIds].filter(id => !already.has(id));
          const bonus = cap(goal.streakBonus.coins);
          await payCoins(ids, bonus, `Community-Ziel ${streak}× in Folge: ${goal.title || ev.title}`);
          streakBonusUserIds = [...streakBonusUserIds, ...ids];
          if (bonus > 0 && ids.length > 0) streakPaid = { coins: bonus, ids };
        }
      }

      const settleNow = due && !state.settledAt;
      const changed = newMilestone !== null || rewardUserIds.length > 0 || settleNow
        || (!!state.settledAt && state.settledReached !== progress.reached);
      if (changed) {
        const nowIso = new Date().toISOString();
        const milestoneAt = { ...state.milestoneAt };
        for (const p of milestones) if (!state.milestones.includes(p)) milestoneAt[String(p)] = nowIso;
        const next: GoalState = {
          milestones,
          milestoneAt,
          rewardedUserIds: [...state.rewardedUserIds, ...rewardUserIds],
          ...(state.rewardedAt || (coins > 0 && rewardUserIds.length) ? { rewardedAt: state.rewardedAt ?? nowIso } : {}),
          ...((settleNow || state.settledAt) && { settledAt: state.settledAt ?? nowIso, settledReached: progress.reached }),
          ...(Object.keys(seriesPoints).length > 0 && { seriesPoints }),
          ...(streak !== undefined && { streak }),
          ...(streakBonusUserIds.length > 0 && { streakBonusUserIds }),
        };
        await tx.event.update({ where: { id: eventId }, data: { goalStateJson: JSON.stringify(next) } });
      }
      const awaitingApproval = ev.approvalStatus === "pending" || ev.series?.approvalStatus === "pending";
      return { goal, progress, newMilestone, awaitingApproval, payees: rewardUserIds, coins, settleNow, streak, streakPaid };
    });

    // Meldungen nach der Transaktion (Push/Discord dürfen den Lock nicht halten). Community-Events ohne
    // Mod-Freigabe melden nichts nach außen — wie alle anderen Ankündigungen.
    if (!result || result.awaitingApproval) return;
    const { goal, progress, newMilestone } = result;
    const common = {
      "{goalTitle}": goal.title || "Community-Ziel",
      "{current}": formatGoalNumber(progress.main.total, goal),
      "{target}": formatGoalNumber(goal.target, goal),
      "{unit}": goalUnit(goal),
      "{percent}": String(Math.floor(progress.main.percent)),
    };
    if (newMilestone) {
      const extras = [
        newMilestone >= 100 && result.coins > 0 && result.payees.length > 0 ? `Alle Mitwirkenden bekommen ${result.coins} Münzen.` : "",
        newMilestone >= 100 && (goal.rewardSeriesPoints ?? 0) > 0 && result.payees.length > 0 ? `Dazu ${goal.rewardSeriesPoints} Tabellenpunkte für die Eventreihe.` : "",
        result.streakPaid ? `🔥 ${result.streak}× in Folge geschafft — ${result.streakPaid.coins} Bonus-Münzen obendrauf!` : "",
      ].filter(Boolean).join(" ");
      await dispatchEventNotification("event_goal_milestone", { id: eventId }, {
        placeholders: {
          ...common,
          "{percent}": String(newMilestone),
          "{milestoneText}": milestoneText(newMilestone, goal) + (extras ? ` ${extras}` : ""),
        },
      }).catch(err => console.error("[community-goal] Meldung fehlgeschlagen", err));
    }
    // Endstand — nicht doppelt, wenn gerade eben (Ø-Ziel bei der Abrechnung) schon "geschafft" gemeldet wurde
    if (result.settleNow && goal.announceResult && newMilestone !== 100) {
      const r = resultText(progress);
      await dispatchEventNotification("event_goal_result", { id: eventId }, {
        placeholders: { ...common, "{resultTitle}": r.title, "{resultText}": r.text },
      }).catch(err => console.error("[community-goal] Endstand-Meldung fehlgeschlagen", err));
    }
  } catch (err) {
    console.error("[community-goal] Prüfung fehlgeschlagen", eventId, err);
  }
}

/**
 * Cron: Ziele von Terminen abrechnen, deren Zeitraum vorbei ist (siehe Kopfkommentar). Schaut nur
 * auf die letzten 30 Tage, damit alte Events ohne Abrechnung nicht ewig geprüft werden.
 */
export async function settleEndedGoals(now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.event.findMany({
    where: { endAt: { lte: now, gte: since }, ...mayHaveGoalWhere },
    select: { id: true, format: true, statConfigJson: true, goalStateJson: true, series: { select: { tournamentTemplateJson: true } } },
  });
  let settled = 0;
  for (const ev of candidates) {
    if (!resolveEventGoal(ev).goal || parseGoalState(ev.goalStateJson).settledAt) continue;
    await checkCommunityGoal(ev.id);
    settled++;
  }
  return settled;
}

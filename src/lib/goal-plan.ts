// ============================================
// Geplante Community-Ziele einer Eventreihe
// ============================================
// Die Reihe hält eine Warteschlange von Zielen (TournamentTemplate.goalPlan). Wird ein neuer Termin
// (Zyklus) angelegt, übernimmt er das erste geplante Ziel, das zu ihm passt (Format und Stat-Felder),
// als eigenes Ziel (Abweichung vom Reihen-Ziel, siehe lib/event-goal.ts) und nur dieses fällt aus der
// Liste. Ziele, die nicht passen, bleiben für spätere Termine stehen. Ist keins passend, gilt wie
// gehabt das Ziel der Reihe.

import { prisma } from "@/lib/prisma";
import { goalFieldsFor, sanitizeCommunityGoal, supportsCommunityGoal, type CommunityGoal } from "@/lib/community-goal";
import { parseOwnGoalConfig, withGoalMode } from "@/lib/event-goal";
import { parseTournamentTemplate, serializeTournamentTemplate } from "@/lib/series-seasons";

/** Reine Funktion: erstes passendes Ziel aus dem Plan nehmen (nur Felder, die der Termin hat).
 *  Nicht passende Ziele bleiben im Plan — früher fielen sie still heraus, ohne gesetzt zu werden. */
export function takePlannedGoal(plan: CommunityGoal[], format: string | null | undefined, statFields: string[]):
  { goal: CommunityGoal | null; rest: CommunityGoal[] } {
  if (plan.length === 0 || !supportsCommunityGoal(format)) return { goal: null, rest: plan };
  const allowed = goalFieldsFor(format, statFields);
  for (let i = 0; i < plan.length; i++) {
    const goal = sanitizeCommunityGoal(plan[i], allowed);
    if (goal) return { goal, rest: [...plan.slice(0, i), ...plan.slice(i + 1)] };
  }
  return { goal: null, rest: plan };
}

/**
 * Wendet das nächste geplante Ziel auf einen frisch angelegten Termin an. Wirft nie. Termine, die
 * schon ein eigenes Ziel haben, bleiben unverändert (und verbrauchen nichts aus dem Plan).
 */
export async function applyPlannedGoal(eventId: string): Promise<CommunityGoal | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const ev = await tx.event.findUnique({
        where: { id: eventId },
        select: { seriesId: true, format: true, statFields: true, statConfigJson: true },
      });
      if (!ev?.seriesId || !supportsCommunityGoal(ev.format)) return null;
      const own = parseOwnGoalConfig(ev.statConfigJson);
      if (own.goal || own.off) return null;
      // Parallele Termin-Erstellung derselben Reihe darf nicht dasselbe Ziel zweimal vergeben
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"goal-plan:" + ev.seriesId}))`;
      const series = await tx.eventSeries.findUnique({ where: { id: ev.seriesId }, select: { tournamentTemplateJson: true } });
      const template = parseTournamentTemplate(series?.tournamentTemplateJson);
      if (!template.goalPlan?.length) return null;
      let statFields: string[] = [];
      try { statFields = ev.statFields ? JSON.parse(ev.statFields) as string[] : []; } catch { statFields = []; }
      const { goal, rest } = takePlannedGoal(template.goalPlan, ev.format, statFields);
      if (!goal) return null;
      await tx.eventSeries.update({
        where: { id: ev.seriesId },
        data: { tournamentTemplateJson: serializeTournamentTemplate({ ...template, goalPlan: rest }) },
      });
      if (goal) {
        await tx.event.update({ where: { id: eventId }, data: { statConfigJson: withGoalMode(ev.statConfigJson, "override", goal) } });
      }
      return goal;
    });
  } catch (err) {
    console.error("[goal-plan] geplantes Ziel konnte nicht übernommen werden", eventId, err);
    return null;
  }
}

import { scoreStreams, finalizeBreakdown, type ScoreBreakdown } from "./score-engine";
import { collabBonuses } from "./collab-bonus";
import { registerScoreResolver, registerScoreBreakdown } from "./community-job-service";
import { CONTENT_CREATOR_KEY } from "./community-jobs";
import { journalistScoreStreams } from "./journalist-service";

/**
 * Content Creator = früherer Journalist + Fotograf + Marketing Manager in EINEM Job mit EINEM
 * Wochengehalt. Seit der Zusammenlegung zu "Beiträgen" (Text + Bilder/Clips + Werbung in einem)
 * zählen Daumen auf Beiträge und auf Ergänzungen — beides läuft gemeinsam durch die Deckel der
 * Score-Engine (beste Beiträge der Woche, höchstens N Stimmen je Person). Alte Daumen auf einzelne
 * Bilder und Werbe-Posts wurden bei der Migration auf die Beiträge übertragen.
 */
async function scoreBreakdown(userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreBreakdown> {
  const scored = scoreStreams(await journalistScoreStreams(userId, weekStart, weekEnd));
  const bonuses = await collabBonuses(CONTENT_CREATOR_KEY, userId, weekStart, weekEnd, scored.base);
  return finalizeBreakdown(CONTENT_CREATOR_KEY, weekStart, weekEnd, scored, bonuses);
}

registerScoreResolver(CONTENT_CREATOR_KEY, async (userId, weekStart, weekEnd) => (await scoreBreakdown(userId, weekStart, weekEnd)).total);
registerScoreBreakdown(CONTENT_CREATOR_KEY, scoreBreakdown);

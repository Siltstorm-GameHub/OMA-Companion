import { scoreStreams, finalizeBreakdown, type ScoreBreakdown } from "./score-engine";
import { collabBonuses } from "./collab-bonus";
import { registerScoreResolver, registerScoreBreakdown } from "./community-job-service";
import { CONTENT_CREATOR_KEY } from "./community-jobs";
import { journalistScoreStreams } from "./journalist-service";
import { fotografScoreStreams } from "./fotograf-service";
import { marketingScoreStreams } from "./marketing-manager-service";

/**
 * Content Creator = früherer Journalist + Fotograf + Marketing Manager in EINEM Job mit EINEM
 * Wochengehalt. Die Score-Quellen der drei Bereiche (Daumen auf Berichte, Ergänzungen, Bilder/Clips
 * und Werbe-Posts) laufen gemeinsam durch die Deckel der Score-Engine (beste Beiträge der Woche,
 * höchstens N Stimmen je Person) — wer in mehreren Bereichen aktiv ist, verteilt seine besten
 * Beiträge also über alle Bereiche.
 */
async function scoreBreakdown(userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreBreakdown> {
  const [reports, media, marketing] = await Promise.all([
    journalistScoreStreams(userId, weekStart, weekEnd),
    fotografScoreStreams(userId, weekStart, weekEnd),
    marketingScoreStreams(userId, weekStart, weekEnd),
  ]);
  const scored = scoreStreams([...reports, ...media, ...marketing]);
  const bonuses = await collabBonuses(CONTENT_CREATOR_KEY, userId, weekStart, weekEnd, scored.base);
  return finalizeBreakdown(CONTENT_CREATOR_KEY, weekStart, weekEnd, scored, bonuses);
}

registerScoreResolver(CONTENT_CREATOR_KEY, async (userId, weekStart, weekEnd) => (await scoreBreakdown(userId, weekStart, weekEnd)).total);
registerScoreBreakdown(CONTENT_CREATOR_KEY, scoreBreakdown);

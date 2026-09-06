import { awardPoints } from "./points";
import { updateQuestProgress } from "./quests";
import { checkAndAwardBadges } from "./award-badges";

/**
 * Gemeinsamer Anreiz-Hook, den jede Community-Job-Vote-Funktion (Report,
 * Contribution, Asset, Marketing-Post, Coach-Rating, Idee) nach erfolgreicher
 * Bewertung aufruft. Siehe Plan-Abschnitt "Bewertungs-Anreize":
 * Quest-Fortschritt + gedeckelte Sofort-Münzen + Badge-Check.
 *
 * Bewusst fehlertolerant (.catch) — ein Anreiz-Fehler darf die eigentliche
 * Bewertung nie verhindern, die bereits erfolgreich gespeichert wurde.
 */
export async function onCommunityJobVoteCast(voterId: string): Promise<void> {
  await Promise.allSettled([
    awardPoints(voterId, "COMMUNITY_JOB_VOTE"),
    updateQuestProgress(voterId, "COMMUNITY_JOB_VOTE", 1),
    checkAndAwardBadges(voterId),
  ]);
}

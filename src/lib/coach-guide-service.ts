import { prisma } from "./prisma";
import { registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";

/**
 * Coach-Anleitungen: kurze Einsteiger-Guides (z.B. "Erste Schritte in R6 Siege"), die im
 * Community-Board erscheinen und wie Berichte per Daumen-hoch bewertet werden. Die erhaltenen
 * Bewertungen zählen in den Coach-Score (siehe coach-service.ts, `countGuideVoteScore`).
 */

const JOB_KEY = "coach";
export const GUIDE_TITLE_MAX = 120;
export const GUIDE_BODY_MAX = 6000;
const GUIDE_GAME_MAX = 40;

async function requireActiveCoach(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type CreateGuideResult = { ok: true; guideId: string } | { error: string };
export type MutationResult = { ok: true } | { error: string };
export type VoteResult = { ok: true } | { error: string };

function validate(data: { title: string; bodyMarkdown: string; game?: string | null }): string | null {
  if (!data.title.trim() || !data.bodyMarkdown.trim()) return "Titel und Text erforderlich";
  if (data.title.trim().length > GUIDE_TITLE_MAX) return `Titel ist zu lang (max. ${GUIDE_TITLE_MAX} Zeichen)`;
  if (data.bodyMarkdown.length > GUIDE_BODY_MAX) return `Text ist zu lang (max. ${GUIDE_BODY_MAX} Zeichen)`;
  if (data.game && data.game.trim().length > GUIDE_GAME_MAX) return `Spielname ist zu lang (max. ${GUIDE_GAME_MAX} Zeichen)`;
  return null;
}

export async function createGuide(
  authorId: string, data: { title: string; bodyMarkdown: string; game?: string },
): Promise<CreateGuideResult> {
  if (!(await requireActiveCoach(authorId))) return { error: "Du bist gerade kein aktiver Coach" };
  const invalid = validate(data);
  if (invalid) return { error: invalid };

  const guide = await prisma.coachGuide.create({
    data: { authorId, title: data.title.trim(), bodyMarkdown: data.bodyMarkdown, game: data.game?.trim() || null },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  return { ok: true, guideId: guide.id };
}

/** Autor ODER Admin darf bearbeiten. */
export async function updateGuide(
  authorId: string, guideId: string, data: { title: string; bodyMarkdown: string; game?: string | null },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const guide = await prisma.coachGuide.findUnique({ where: { id: guideId } });
  if (!guide) return { error: "Anleitung nicht gefunden" };
  if (guide.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diese Anleitung zu bearbeiten" };
  const invalid = validate(data);
  if (invalid) return { error: invalid };

  await prisma.coachGuide.update({
    where: { id: guideId },
    data: { title: data.title.trim(), bodyMarkdown: data.bodyMarkdown, game: data.game?.trim() || null },
  });
  return { ok: true };
}

export async function deleteGuide(authorId: string, guideId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const guide = await prisma.coachGuide.findUnique({ where: { id: guideId } });
  if (!guide) return { error: "Anleitung nicht gefunden" };
  if (guide.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diese Anleitung zu löschen" };

  await prisma.coachGuide.delete({ where: { id: guideId } });
  return { ok: true };
}

export async function voteGuide(voterId: string, guideId: string): Promise<VoteResult> {
  const guide = await prisma.coachGuide.findUnique({ where: { id: guideId } });
  if (!guide || guide.hiddenByAdminAt) return { error: "Anleitung nicht gefunden" };
  if (guide.authorId === voterId) return { error: "Du kannst deine eigene Anleitung nicht bewerten" };

  const existing = await prisma.coachGuideVote.findUnique({ where: { guideId_voterId: { guideId, voterId } } }).catch(() => null);
  if (existing) return { error: "Du hast diese Anleitung bereits bewertet" };

  await prisma.coachGuideVote.create({ data: { guideId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteGuide(voterId: string, guideId: string): Promise<VoteResult> {
  await prisma.coachGuideVote.deleteMany({ where: { guideId, voterId } });
  return { ok: true };
}

/** Gültige (nicht angefochten-überstimmte) Bewertungen auf die Anleitungen dieses Coaches in der Woche — fließt in den Coach-Score. */
export async function countGuideVoteScore(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  return prisma.coachGuideVote.count({
    where: {
      guide: { authorId: userId }, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
}

// Bewertungen, die dieser User selbst auf Anleitungen abgibt, zählen für den Aktivitäts-Bonus.
registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.coachGuideVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

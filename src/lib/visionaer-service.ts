import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";

/**
 * Visionär: reicht Ideen ein, die Community stimmt mit 1-5 Sternen + Begründung
 * ab. Bleibt laut Plan dauerhaft im Community-Board sicht- und bewertbar, auch
 * nach `votingEndsAt` — `status` ist rein kosmetisch, keine harte Sperre.
 */

const JOB_KEY = "visionaer";

async function requireActiveVisionaer(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type SubmitIdeaResult = { ok: true; ideaId: string } | { error: string };

export async function submitIdea(
  authorId: string, data: { title: string; description: string; votingEndsAt?: Date },
): Promise<SubmitIdeaResult> {
  if (!(await requireActiveVisionaer(authorId))) return { error: "Du bist gerade kein aktiver Visionär" };
  if (!data.title.trim() || !data.description.trim()) return { error: "Titel und Beschreibung erforderlich" };

  const idea = await prisma.communityIdea.create({
    data: { authorId, title: data.title.trim(), description: data.description, votingEndsAt: data.votingEndsAt ?? null },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });
  return { ok: true, ideaId: idea.id };
}

/** Rein kosmetisch — markiert die Idee als "Abstimmung beendet", sperrt aber keine weiteren Stimmen. */
export async function closeIdea(authorId: string, ideaId: string): Promise<SubmitIdeaResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann die Idee schließen" };
  await prisma.communityIdea.update({ where: { id: ideaId }, data: { status: "CLOSED" } });
  return { ok: true, ideaId };
}

export type MutationResult = { ok: true } | { error: string };

export async function updateIdea(authorId: string, ideaId: string, data: { title: string; description: string }): Promise<MutationResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann diese Idee bearbeiten" };
  if (!data.title.trim() || !data.description.trim()) return { error: "Titel und Beschreibung erforderlich" };

  await prisma.communityIdea.update({ where: { id: ideaId }, data: { title: data.title.trim(), description: data.description } });
  return { ok: true };
}

export async function deleteIdea(authorId: string, ideaId: string): Promise<MutationResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId !== authorId) return { error: "Nur der Autor kann diese Idee löschen" };

  await prisma.communityIdea.delete({ where: { id: ideaId } });
  return { ok: true };
}

export type VoteResult = { ok: true } | { error: string };

export async function voteIdea(voterId: string, ideaId: string, stars: number, reason: string): Promise<VoteResult> {
  const idea = await prisma.communityIdea.findUnique({ where: { id: ideaId } });
  if (!idea) return { error: "Idee nicht gefunden" };
  if (idea.authorId === voterId) return { error: "Du kannst deine eigene Idee nicht bewerten" };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Bewertung muss 1-5 Sterne sein" };
  if (!reason.trim()) return { error: "Begründung erforderlich" };

  const existing = await prisma.communityIdeaVote.findUnique({
    where: { ideaId_voterId: { ideaId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diese Idee bereits bewertet" };

  await prisma.communityIdeaVote.create({ data: { ideaId, voterId, stars, reason } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

/** Score = Σ Sterne aller gültigen Stimmen, die die Ideen dieses Users diese Woche erhalten haben. */
registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const agg = await prisma.communityIdeaVote.aggregate({
    where: {
      idea: { authorId: userId },
      createdAt: { gte: weekStart, lt: weekEnd },
      disputeResolution: { not: "OVERTURNED" },
    },
    _sum: { stars: true },
  });
  return agg._sum.stars ?? 0;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.communityIdeaVote.count({
    where: { voterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
  });
});

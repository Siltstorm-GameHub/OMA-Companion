import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";

/**
 * Fotograf: lädt Clips/Collagen/Screenshots/Banner/Grafiken in die gemeinsame
 * Mediathek hoch. Andere Jobs (Journalist, später Marketing Manager) können
 * Assets referenzieren (usageCount) — die Bewertung bleibt trotzdem unabhängig
 * beim Fotograf als Autor.
 */

const JOB_KEY = "fotograf";
export const ASSET_TYPES = ["CLIP", "COLLAGE", "SCREENSHOT", "BANNER", "GRAPHIC"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

async function requireActiveFotograf(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type UploadAssetResult = { ok: true; assetId: string } | { error: string };

export async function uploadAsset(
  authorId: string,
  data: { type: AssetType; url: string; caption?: string; eventId?: string },
): Promise<UploadAssetResult> {
  if (!(await requireActiveFotograf(authorId))) return { error: "Du bist gerade kein aktiver Fotograf" };
  if (!ASSET_TYPES.includes(data.type)) return { error: "Ungültiger Asset-Typ" };
  if (!data.url.trim()) return { error: "Datei fehlt" };

  const asset = await prisma.jobMediaAsset.create({
    data: { authorId, type: data.type, url: data.url, caption: data.caption ?? null, eventId: data.eventId ?? null },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  announceAndStore(asset.id, authorId, data.caption ?? data.type, data.url).catch(() => {});
  return { ok: true, assetId: asset.id };
}

async function announceAndStore(assetId: string, authorId: string, title: string, imageUrl: string): Promise<void> {
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } });
  const messageId = await announceCommunityJobContent({
    title, description: "Neues Asset in der Community-Mediathek",
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "📸", imageUrl,
  });
  if (messageId) await prisma.jobMediaAsset.update({ where: { id: assetId }, data: { discordMessageId: messageId } });
}

/** Wird aufgerufen, wenn ein anderer Job (Journalist-Report als Cover, später Marketing-Post) das Asset einbindet. */
export async function markAssetUsed(assetId: string): Promise<void> {
  await prisma.jobMediaAsset.update({ where: { id: assetId }, data: { usageCount: { increment: 1 } } });
}

export type VoteResult = { ok: true } | { error: string };

export async function voteAsset(voterId: string, assetId: string): Promise<VoteResult> {
  const asset = await prisma.jobMediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Asset nicht gefunden" };
  if (asset.authorId === voterId) return { error: "Du kannst dein eigenes Asset nicht bewerten" };

  const existing = await prisma.jobMediaAssetVote.findUnique({
    where: { assetId_voterId: { assetId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast dieses Asset bereits bewertet" };

  await prisma.jobMediaAssetVote.create({ data: { assetId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteAsset(voterId: string, assetId: string): Promise<VoteResult> {
  await prisma.jobMediaAssetVote.deleteMany({ where: { assetId, voterId } });
  return { ok: true };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  return prisma.jobMediaAssetVote.count({
    where: {
      asset: { authorId: userId },
      createdAt: { gte: weekStart, lt: weekEnd },
      disputeResolution: { not: "OVERTURNED" },
    },
  });
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.jobMediaAssetVote.count({
    where: { voterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
  });
});

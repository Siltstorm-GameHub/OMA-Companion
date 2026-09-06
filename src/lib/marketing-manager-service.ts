import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";

/**
 * Marketing Manager: Werbe-Posts für kommende Events (Text + optionales Bild
 * aus der Fotograf-Mediathek). Bewertung = reine Daumen-hoch-Zahl (kein Klick-
 * Tracking in v1). `adminConfirmedPosted` ist eine reine Admin-Info (z.B. "wurde
 * tatsächlich auf Instagram gepostet") ohne Auswirkung auf die Gehaltsberechnung.
 */

const JOB_KEY = "marketing_manager";

async function requireActiveMarketingManager(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type CreatePostResult = { ok: true; postId: string } | { error: string };

export async function createMarketingPost(
  authorId: string,
  data: { eventId: string; caption: string; assetId?: string },
): Promise<CreatePostResult> {
  if (!(await requireActiveMarketingManager(authorId))) return { error: "Du bist gerade kein aktiver Marketing Manager" };
  if (!data.eventId) return { error: "Event erforderlich" };
  if (!data.caption.trim()) return { error: "Text erforderlich" };

  const post = await prisma.marketingPost.create({
    data: { authorId, eventId: data.eventId, caption: data.caption, assetId: data.assetId ?? null },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  announceAndStore(post.id, authorId, data.caption).catch(() => {});
  return { ok: true, postId: post.id };
}

async function announceAndStore(postId: string, authorId: string, caption: string): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const messageId = await announceCommunityJobContent({
    title: "Neue Werbeaktion", description: caption,
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "📣", channelId,
  });
  if (messageId) await prisma.marketingPost.update({ where: { id: postId }, data: { discordMessageId: messageId } });
}

export type VoteResult = { ok: true } | { error: string };

export async function voteMarketingPost(voterId: string, postId: string): Promise<VoteResult> {
  const post = await prisma.marketingPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post nicht gefunden" };
  if (post.authorId === voterId) return { error: "Du kannst deinen eigenen Post nicht bewerten" };

  const existing = await prisma.marketingPostVote.findUnique({
    where: { postId_voterId: { postId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diesen Post bereits bewertet" };

  await prisma.marketingPostVote.create({ data: { postId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteMarketingPost(voterId: string, postId: string): Promise<VoteResult> {
  await prisma.marketingPostVote.deleteMany({ where: { postId, voterId } });
  return { ok: true };
}

export async function setAdminConfirmedPosted(postId: string, confirmed: boolean): Promise<VoteResult> {
  const post = await prisma.marketingPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post nicht gefunden" };
  await prisma.marketingPost.update({ where: { id: postId }, data: { adminConfirmedPosted: confirmed } });
  return { ok: true };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  return prisma.marketingPostVote.count({
    where: {
      post: { authorId: userId },
      createdAt: { gte: weekStart, lt: weekEnd },
      disputeResolution: { not: "OVERTURNED" },
    },
  });
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.marketingPostVote.count({
    where: { voterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
  });
});

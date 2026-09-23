import { prisma } from "./prisma";
import { scoreStreams, finalizeBreakdown, starsToPoints, type ScoreBreakdown } from "./score-engine";
import { collabBonuses } from "./collab-bonus";
import { commentVoteEvents } from "./community-board-comment-service";
import { registerScoreBreakdown } from "./community-job-service";
import { notifyAssetUsed } from "./fotograf-service";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";
import { dispatchNotification } from "./notify-dispatch";
import { getWeekBounds } from "./community-job-service";
import { isMarketingTemplate } from "./marketing-templates";
import { fulfillPromotionRequests } from "./promotion-request-service";

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
  data: { eventId?: string; trainingSessionId?: string; caption: string; assetId?: string; imageUrl?: string; campaignId?: string; kind?: string },
): Promise<CreatePostResult> {
  if (!(await requireActiveMarketingManager(authorId))) return { error: "Du bist gerade kein aktiver Marketing Manager" };
  // Event bzw. Trainings-Termin sind optional: allgemeine Posts (z.B. zu Steam-/Xbox-Angeboten) haben keinen Bezug.
  if (data.eventId && !(await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } }))) return { error: "Event nicht gefunden" };
  if (data.trainingSessionId) {
    const session = await prisma.coachTrainingSession.findUnique({ where: { id: data.trainingSessionId }, select: { startAt: true } });
    if (!session) return { error: "Trainings-Termin nicht gefunden" };
    if (session.startAt.getTime() < Date.now()) return { error: "Der Trainings-Termin liegt in der Vergangenheit" };
  }
  if (!data.caption.trim()) return { error: "Text erforderlich" };

  if (data.campaignId && !(await prisma.marketingCampaign.findFirst({ where: { id: data.campaignId, authorId, eventId: data.eventId ?? "" }, select: { id: true } }))) {
    return { error: "Kampagne nicht gefunden (oder gehört zu einem anderen Event)" };
  }

  const post = await prisma.marketingPost.create({
    data: {
      authorId, eventId: data.eventId ?? null, trainingSessionId: data.trainingSessionId ?? null, caption: data.caption,
      assetId: data.assetId ?? null, imageUrl: data.imageUrl ?? null,
      campaignId: data.campaignId ?? null, kind: isMarketingTemplate(data.kind) ? data.kind : null,
    },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  announceAndStore(post.id, authorId, data.caption).catch(() => {});
  if (data.trainingSessionId) fulfillPromotionRequests(data.trainingSessionId, post.id).catch(() => {});
  if (data.assetId) notifyAssetUsed(data.assetId, authorId, "marketing", data.caption, "/community-board").catch(() => {});
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

export type MutationResult = { ok: true } | { error: string };

/**
 * Autor ODER Admin dürfen bearbeiten — inkl. Bild ersetzen/entfernen:
 * `imageUrl`/`assetId` gesetzt → übernehmen, `null` → explizit entfernen
 * (z.B. "Bild entfernen"-Button), `undefined` → unverändert lassen.
 * Neues `imageUrl` löscht automatisch ein evtl. gesetztes `assetId` und
 * umgekehrt, ein Post hat immer nur eine Bildquelle gleichzeitig.
 */
export async function updateMarketingPost(
  authorId: string, postId: string,
  data: { caption?: string; imageUrl?: string | null; assetId?: string | null },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const post = await prisma.marketingPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post nicht gefunden" };
  if (post.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Post zu bearbeiten" };
  if (data.caption !== undefined && !data.caption.trim()) return { error: "Text erforderlich" };

  if (data.assetId && data.assetId !== post.assetId) notifyAssetUsed(data.assetId, post.authorId, "marketing", data.caption ?? post.caption, "/community-board").catch(() => {});
  const clearOther = data.imageUrl !== undefined ? { assetId: null } : data.assetId !== undefined ? { imageUrl: null } : {};

  await prisma.marketingPost.update({
    where: { id: postId },
    data: {
      ...(data.caption !== undefined ? { caption: data.caption } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.assetId !== undefined ? { assetId: data.assetId } : {}),
      ...clearOther,
    },
  });
  return { ok: true };
}

export async function deleteMarketingPost(authorId: string, postId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const post = await prisma.marketingPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post nicht gefunden" };
  if (post.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Post zu löschen" };

  await prisma.marketingPost.delete({ where: { id: postId } });
  return { ok: true };
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
  notifyVoteMilestone(postId, post.authorId, post.caption).catch(() => {});
  return { ok: true };
}

const VOTE_MILESTONES = [5, 10, 25, 50, 100];

async function notifyVoteMilestone(postId: string, authorId: string, caption: string): Promise<void> {
  const count = await prisma.marketingPostVote.count({ where: { postId } });
  if (!VOTE_MILESTONES.includes(count)) return;
  await dispatchNotification("marketing_votes_milestone", {
    users: [authorId], placeholders: { "{count}": String(count), "{title}": caption.replace(/\s+/g, " ").slice(0, 80), "{url}": "/community-board" },
  });
}

export async function unvoteMarketingPost(voterId: string, postId: string): Promise<VoteResult> {
  await prisma.marketingPostVote.deleteMany({ where: { postId, voterId } });
  return { ok: true };
}

export async function setAdminConfirmedPosted(postId: string, confirmed: boolean): Promise<VoteResult> {
  const post = await prisma.marketingPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post nicht gefunden" };
  await prisma.marketingPost.update({ where: { id: postId }, data: { adminConfirmedPosted: confirmed } });
  // Einmalig: Autor erfährt, dass sein Post extern veröffentlicht wurde.
  if (confirmed && !post.confirmedNotified) {
    await prisma.marketingPost.update({ where: { id: postId }, data: { confirmedNotified: true } });
    dispatchNotification("marketing_post_confirmed", {
      users: [post.authorId], placeholders: { "{title}": post.caption.replace(/\s+/g, " ").slice(0, 80), "{url}": "/profile" },
    }).catch(() => {});
  }
  return { ok: true };
}

// ── Event-Fakten, Kampagnen, Auswertung ──────────────────────────────────────

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://oma-app.de";

export async function getMarketingEventFacts(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, game: true, startAt: true, hidden: true, _count: { select: { registrations: true } } },
  });
  if (!event || event.hidden) return null;
  return {
    id: event.id, title: event.title, game: event.game, startAt: event.startAt.toISOString(),
    registered: event._count.registrations, url: `${BASE_URL}/tournament/${event.id}`,
  };
}

/** Fakten zu einem Coach-Trainings-Termin für den Werbetext-Baukasten. */
export async function getMarketingTrainingFacts(sessionId: string) {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, select: { id: true, title: true, startAt: true, _count: { select: { signups: true } } },
  });
  if (!session) return null;
  return {
    id: session.id, title: session.title, game: null as string | null, startAt: session.startAt.toISOString(),
    registered: session._count.signups, url: `${BASE_URL}/profile`, training: true,
  };
}

export async function createCampaign(authorId: string, data: { eventId: string; title?: string }): Promise<{ ok: true; campaignId: string } | { error: string }> {
  if (!(await requireActiveMarketingManager(authorId))) return { error: "Du bist gerade kein aktiver Marketing Manager" };
  const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { title: true, startAt: true, hidden: true } });
  if (!event || event.hidden) return { error: "Event nicht gefunden" };
  if (event.startAt.getTime() < Date.now()) return { error: "Das Event hat schon begonnen" };
  const existing = await prisma.marketingCampaign.findFirst({ where: { authorId, eventId: data.eventId }, select: { id: true } });
  if (existing) return { error: "Für dieses Event hast du schon eine Kampagne" };
  const campaign = await prisma.marketingCampaign.create({
    data: { authorId, eventId: data.eventId, title: data.title?.trim().slice(0, 80) || `Kampagne: ${event.title}` },
  });
  return { ok: true, campaignId: campaign.id };
}

export async function listMyCampaigns(userId: string) {
  return prisma.marketingCampaign.findMany({
    where: { authorId: userId, event: { startAt: { gte: new Date(Date.now() - 86_400_000) } } },
    orderBy: { event: { startAt: "asc" } },
    select: {
      id: true, title: true, eventId: true,
      event: { select: { id: true, title: true, startAt: true } },
      posts: { orderBy: { createdAt: "asc" }, select: { id: true, kind: true, createdAt: true } },
    },
  });
}

export async function deleteCampaign(authorId: string, campaignId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "Kampagne nicht gefunden" };
  if (campaign.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diese Kampagne zu löschen" };
  await prisma.marketingCampaign.delete({ where: { id: campaignId } }); // Posts bleiben erhalten (campaignId → null)
  return { ok: true };
}

export async function getMarketingStats(userId: string) {
  const { weekStart, weekEnd } = getWeekBounds(new Date());
  const eightWeeksAgo = new Date(weekStart.getTime() - 7 * 7 * 86_400_000);
  const since = new Date(Date.now() - 90 * 86_400_000);

  const [posts, recentVotes, promoted, unpromoted] = await Promise.all([
    prisma.marketingPost.findMany({
      where: { authorId: userId, hiddenByAdminAt: null },
      select: { id: true, caption: true, eventId: true, trainingSessionId: true, imageUrl: true, assetId: true, adminConfirmedPosted: true, _count: { select: { votes: true } } },
    }),
    prisma.marketingPostVote.findMany({
      where: { post: { authorId: userId }, createdAt: { gte: eightWeeksAgo }, OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] },
      select: { createdAt: true },
    }),
    // Grobe Orientierung: Anmeldungen beendeter Events mit vs. ohne Werbe-Post (alle Marketing Manager, 90 Tage).
    prisma.event.findMany({
      where: { hidden: false, status: "finished", startAt: { gte: since }, marketingPosts: { some: { hiddenByAdminAt: null } } },
      select: { _count: { select: { registrations: true } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, status: "finished", startAt: { gte: since }, marketingPosts: { none: { hiddenByAdminAt: null } } },
      select: { _count: { select: { registrations: true } } },
    }),
  ]);

  const totalVotes = posts.reduce((sum, p) => sum + p._count.votes, 0);
  const top = [...posts].sort((a, b) => b._count.votes - a._count.votes)[0];
  const byWeek = new Map<number, number>();
  for (const v of recentVotes) {
    const key = getWeekBounds(v.createdAt).weekStart.getTime();
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const avg = (rows: { _count: { registrations: number } }[]) => (rows.length > 0 ? rows.reduce((s, r) => s + r._count.registrations, 0) / rows.length : null);

  return {
    total: posts.length, totalVotes,
    averageVotes: posts.length > 0 ? totalVotes / posts.length : 0,
    votesThisWeek: recentVotes.filter(v => v.createdAt >= weekStart && v.createdAt < weekEnd).length,
    eventsPromoted: new Set(posts.map(p => p.eventId ?? p.trainingSessionId ?? p.id)).size,
    withImage: posts.filter(p => p.imageUrl || p.assetId).length,
    confirmed: posts.filter(p => p.adminConfirmedPosted).length,
    top: top && top._count.votes > 0 ? { id: top.id, caption: top.caption.replace(/\s+/g, " ").slice(0, 90), votes: top._count.votes } : null,
    weekly: [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([ts, votes]) => ({ weekStart: new Date(ts).toISOString(), votes })),
    reach: { promotedAvg: avg(promoted), promotedCount: promoted.length, unpromotedAvg: avg(unpromoted), unpromotedCount: unpromoted.length },
  };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

async function scoreBreakdown(userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreBreakdown> {
  const week = { gte: weekStart, lt: weekEnd };
  const valid = { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" as const } }] };
  const [postVotes, comments] = await Promise.all([
    prisma.marketingPostVote.findMany({
      where: { post: { authorId: userId, hiddenByAdminAt: null }, createdAt: week, ...valid },
      select: { voterId: true, postId: true, createdAt: true },
    }),
    commentVoteEvents(userId, weekStart, weekEnd),
  ]);
  const scored = scoreStreams([
    { key: "posts", label: "Daumen auf Werbe-Posts", unit: "thumb", events: postVotes.map(v => ({ voterId: v.voterId, itemKey: `post:${v.postId}`, points: 1, createdAt: v.createdAt })) },
    { key: "comments", label: "Daumen auf Kommentare", unit: "thumb", events: comments },
  ]);
  const bonuses = await collabBonuses(JOB_KEY, userId, weekStart, weekEnd, scored.base);
  return finalizeBreakdown(JOB_KEY, weekStart, weekEnd, scored, bonuses);
}

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => (await scoreBreakdown(userId, weekStart, weekEnd)).total);
registerScoreBreakdown(JOB_KEY, scoreBreakdown);

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.marketingPostVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

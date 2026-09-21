import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";
import { fulfillPhotoRequest } from "./photo-request-service";
import { countCommentVoteScore } from "./community-board-comment-service";
import { dispatchNotification } from "./notify-dispatch";
import { getWeekBounds } from "./community-job-service";
import { isVideoUrl } from "./upload-limits";

/**
 * Fotograf: lädt Clips/Collagen/Screenshots/Banner/Grafiken in die gemeinsame
 * Mediathek hoch. Andere Jobs (Journalist, später Marketing Manager) können
 * Assets referenzieren (usageCount) — die Bewertung bleibt trotzdem unabhängig
 * beim Fotograf als Autor.
 */

const JOB_KEY = "fotograf";
export const ASSET_TYPES = ["CLIP", "COLLAGE", "SCREENSHOT", "BANNER", "GRAPHIC"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export async function requireActiveFotograf(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type UploadAssetResult = { ok: true; assetId: string } | { error: string };

export async function uploadAsset(
  authorId: string,
  data: { type: AssetType; url: string; caption?: string; eventId?: string; requestId?: string; albumId?: string },
): Promise<UploadAssetResult> {
  if (!(await requireActiveFotograf(authorId))) return { error: "Du bist gerade kein aktiver Fotograf" };
  if (!ASSET_TYPES.includes(data.type)) return { error: "Ungültiger Asset-Typ" };
  if (!data.url.trim()) return { error: "Datei fehlt" };
  if (data.albumId && !(await prisma.jobMediaAlbum.findFirst({ where: { id: data.albumId, authorId }, select: { id: true } }))) {
    return { error: "Album nicht gefunden" };
  }

  const asset = await prisma.jobMediaAsset.create({
    data: {
      authorId, type: data.type, url: data.url, caption: data.caption ?? null,
      eventId: data.eventId ?? null, albumId: data.albumId ?? null,
    },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  announceAndStore(asset.id, authorId, data.caption ?? data.type, data.url).catch(() => {});
  // Auf einen Bildwunsch eines Journalisten hochgeladen → Wunsch als erfüllt markieren.
  if (data.requestId) fulfillPhotoRequest(authorId, data.requestId, asset.id).catch(() => {});
  return { ok: true, assetId: asset.id };
}

async function announceAndStore(assetId: string, authorId: string, title: string, imageUrl: string): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const messageId = await announceCommunityJobContent({
    title, description: "Neues Asset in der Community-Mediathek",
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(JOB_KEY)?.emoji ?? "📸", imageUrl, channelId,
  });
  if (messageId) await prisma.jobMediaAsset.update({ where: { id: assetId }, data: { discordMessageId: messageId } });
}

export const BULK_MAX = 20;

export type BulkUploadResult = { ok: true; assetIds: string[] } | { error: string };

/** Mehrere Bilder/Clips eines Events auf einmal — eine einzige Discord-Ankündigung statt eines Posts pro Bild. */
export async function uploadAssetsBulk(
  authorId: string,
  data: { eventId?: string; albumId?: string; items: { url: string; caption?: string; type?: AssetType }[] },
): Promise<BulkUploadResult> {
  if (!(await requireActiveFotograf(authorId))) return { error: "Du bist gerade kein aktiver Fotograf" };
  const items = data.items.filter(i => typeof i.url === "string" && i.url.trim());
  if (items.length === 0) return { error: "Keine Dateien übergeben" };
  if (items.length > BULK_MAX) return { error: `Maximal ${BULK_MAX} Dateien auf einmal` };
  if (data.albumId && !(await prisma.jobMediaAlbum.findFirst({ where: { id: data.albumId, authorId }, select: { id: true } }))) {
    return { error: "Album nicht gefunden" };
  }

  const created = await prisma.$transaction(items.map(i => prisma.jobMediaAsset.create({
    data: {
      authorId, url: i.url, caption: i.caption?.trim() || null, eventId: data.eventId ?? null, albumId: data.albumId ?? null,
      type: i.type && ASSET_TYPES.includes(i.type) ? i.type : isVideoUrl(i.url) ? "CLIP" : "SCREENSHOT",
    },
  })));
  await prisma.communityJobMember.updateMany({
    where: { userId: authorId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  const first = created.find(a => !isVideoUrl(a.url)) ?? created[0];
  announceAndStore(first.id, authorId, created.length === 1 ? (first.caption ?? first.type) : `${created.length} neue Bilder`, first.url).catch(() => {});
  return { ok: true, assetIds: created.map(a => a.id) };
}

// ── Alben ────────────────────────────────────────────────────────────────────

export const ALBUM_TITLE_MAX = 80;

export async function listMyAlbums(userId: string) {
  return prisma.jobMediaAlbum.findMany({
    where: { authorId: userId }, orderBy: { createdAt: "desc" },
    select: { id: true, title: true, eventId: true, createdAt: true, _count: { select: { assets: true } } },
  });
}

export async function createAlbum(authorId: string, data: { title: string; eventId?: string }): Promise<{ ok: true; albumId: string } | { error: string }> {
  if (!(await requireActiveFotograf(authorId))) return { error: "Du bist gerade kein aktiver Fotograf" };
  const title = data.title.trim();
  if (!title) return { error: "Titel erforderlich" };
  if (title.length > ALBUM_TITLE_MAX) return { error: `Titel ist zu lang (max. ${ALBUM_TITLE_MAX} Zeichen)` };
  if (data.eventId && !(await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } }))) return { error: "Event nicht gefunden" };
  const album = await prisma.jobMediaAlbum.create({ data: { authorId, title, eventId: data.eventId || null } });
  return { ok: true, albumId: album.id };
}

export async function deleteAlbum(authorId: string, albumId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const album = await prisma.jobMediaAlbum.findUnique({ where: { id: albumId } });
  if (!album) return { error: "Album nicht gefunden" };
  if (album.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, dieses Album zu löschen" };
  await prisma.jobMediaAlbum.delete({ where: { id: albumId } }); // Assets bleiben erhalten (albumId → null)
  return { ok: true };
}

// ── Mediathek-Suche ──────────────────────────────────────────────────────────

export interface MediaQuery {
  eventId?: string; type?: string; mineOf?: string; authorId?: string; albumId?: string;
  q?: string; sort?: "new" | "votes"; since?: Date; take?: number;
  /** Bilder dieses Events sowie anderer Events mit demselben Spiel (Bildvorschlag für Werbe-Posts). */
  relatedEventId?: string;
}

export async function searchMedia(query: MediaQuery) {
  const q = query.q?.trim();
  let related: object | null = null;
  if (query.relatedEventId) {
    const ev = await prisma.event.findUnique({ where: { id: query.relatedEventId }, select: { game: true } });
    related = { OR: [{ eventId: query.relatedEventId }, ...(ev?.game ? [{ event: { game: ev.game } }] : [])] };
  }
  const assets = await prisma.jobMediaAsset.findMany({
    where: {
      hiddenByAdminAt: null,
      ...(related ? { AND: [related] } : {}),
      ...(query.eventId ? { eventId: query.eventId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.mineOf ? { authorId: query.mineOf } : query.authorId ? { authorId: query.authorId } : {}),
      ...(query.albumId ? { albumId: query.albumId } : {}),
      ...(query.since ? { createdAt: { gte: query.since } } : {}),
      ...(q ? { OR: [
        { caption: { contains: q, mode: "insensitive" as const } },
        { event: { title: { contains: q, mode: "insensitive" as const } } },
        { author: { OR: [{ username: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } },
      ] } : {}),
    },
    orderBy: query.sort === "votes" ? [{ votes: { _count: "desc" as const } }, { createdAt: "desc" as const }] : { createdAt: "desc" as const },
    include: {
      _count: { select: { votes: true } },
      author: { select: { id: true, username: true, name: true } },
      event: { select: { id: true, title: true } },
      album: { select: { id: true, title: true } },
    },
    take: Math.min(query.take ?? 100, 200),
  });
  return assets;
}

// ── Nutzung durch andere Jobs ────────────────────────────────────────────────

/** Fotograf informieren, wenn sein Bild als Titelbild/Post-Bild verwendet wird (nicht bei Eigennutzung). */
export async function notifyAssetUsed(assetId: string, userId: string, kind: "report" | "marketing", title: string, url: string): Promise<void> {
  const asset = await prisma.jobMediaAsset.findUnique({ where: { id: assetId }, select: { authorId: true } });
  if (!asset) return;
  await markAssetUsed(assetId).catch(() => {});
  if (asset.authorId === userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
  await dispatchNotification("asset_used", {
    users: [asset.authorId],
    placeholders: { "{user}": user?.username ?? user?.name ?? "Jemand", "{title}": `${kind === "report" ? "Bericht" : "Werbe-Post"} „${title.slice(0, 60)}“`, "{url}": url },
  });
}

// ── Auswertung fürs Fotografen-Büro ──────────────────────────────────────────

export async function getFotografStats(userId: string) {
  const now = new Date();
  const { weekStart, weekEnd } = getWeekBounds(now);
  const eightWeeksAgo = new Date(weekStart.getTime() - 7 * 7 * 86_400_000);

  const [assets, recentVotes, reportUses, postUses] = await Promise.all([
    prisma.jobMediaAsset.findMany({
      where: { authorId: userId, hiddenByAdminAt: null },
      select: { id: true, type: true, caption: true, url: true, _count: { select: { votes: true } } },
    }),
    prisma.jobMediaAssetVote.findMany({
      where: { asset: { authorId: userId }, createdAt: { gte: eightWeeksAgo }, OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] },
      select: { createdAt: true },
    }),
    prisma.jobReport.findMany({ where: { coverAsset: { authorId: userId }, isDraft: false }, select: { coverAssetId: true } }),
    prisma.marketingPost.findMany({ where: { asset: { authorId: userId } }, select: { assetId: true } }),
  ]);

  const uses = new Map<string, number>();
  for (const r of reportUses) if (r.coverAssetId) uses.set(r.coverAssetId, (uses.get(r.coverAssetId) ?? 0) + 1);
  for (const m of postUses) if (m.assetId) uses.set(m.assetId, (uses.get(m.assetId) ?? 0) + 1);

  const totalVotes = assets.reduce((sum, a) => sum + a._count.votes, 0);
  const top = [...assets].sort((a, b) => b._count.votes - a._count.votes)[0];
  const mostUsed = [...assets].sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0))[0];
  const usesTotal = [...uses.values()].reduce((a, b) => a + b, 0);

  const byWeek = new Map<number, number>();
  for (const v of recentVotes) {
    const key = getWeekBounds(v.createdAt).weekStart.getTime();
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const byType = new Map<string, number>();
  for (const a of assets) byType.set(a.type, (byType.get(a.type) ?? 0) + 1);

  return {
    total: assets.length, totalVotes,
    averageVotes: assets.length > 0 ? totalVotes / assets.length : 0,
    votesThisWeek: recentVotes.filter(v => v.createdAt >= weekStart && v.createdAt < weekEnd).length,
    usesTotal, usedAssets: uses.size,
    top: top && top._count.votes > 0 ? { id: top.id, caption: top.caption ?? top.type, url: top.url, votes: top._count.votes } : null,
    mostUsed: mostUsed && (uses.get(mostUsed.id) ?? 0) > 0 ? { id: mostUsed.id, caption: mostUsed.caption ?? mostUsed.type, url: mostUsed.url, uses: uses.get(mostUsed.id) ?? 0 } : null,
    weekly: [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([ts, votes]) => ({ weekStart: new Date(ts).toISOString(), votes })),
    types: [...byType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
  };
}

/** Wird aufgerufen, wenn ein anderer Job (Journalist-Report als Cover, später Marketing-Post) das Asset einbindet. */
export async function markAssetUsed(assetId: string): Promise<void> {
  await prisma.jobMediaAsset.update({ where: { id: assetId }, data: { usageCount: { increment: 1 } } });
}

export type MutationResult = { ok: true } | { error: string };

/** Autor ODER Admin (isAdmin) darf bearbeiten — `url` wird nur beim Admin-Zuschnitt mitgegeben. */
export async function updateAsset(
  authorId: string, assetId: string, data: { caption?: string; url?: string; albumId?: string | null },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const asset = await prisma.jobMediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Asset nicht gefunden" };
  if (asset.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, dieses Asset zu bearbeiten" };

  if (data.albumId) {
    const album = await prisma.jobMediaAlbum.findFirst({ where: { id: data.albumId, authorId: asset.authorId }, select: { id: true } });
    if (!album) return { error: "Album nicht gefunden" };
  }
  await prisma.jobMediaAsset.update({
    where: { id: assetId },
    data: {
      ...(data.albumId !== undefined ? { albumId: data.albumId || null } : {}),
      ...(data.caption !== undefined ? { caption: data.caption || null } : {}),
      ...(data.url ? { url: data.url } : {}),
    },
  });
  return { ok: true };
}

export async function deleteAsset(authorId: string, assetId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const asset = await prisma.jobMediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) return { error: "Asset nicht gefunden" };
  if (asset.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, dieses Asset zu löschen" };

  await prisma.jobMediaAsset.delete({ where: { id: assetId } });
  return { ok: true };
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
  notifyVoteMilestone(assetId, asset.authorId, asset.caption ?? asset.type).catch(() => {});
  return { ok: true };
}

const VOTE_MILESTONES = [5, 10, 25, 50, 100];

async function notifyVoteMilestone(assetId: string, authorId: string, title: string): Promise<void> {
  const count = await prisma.jobMediaAssetVote.count({ where: { assetId } });
  if (!VOTE_MILESTONES.includes(count)) return;
  await dispatchNotification("asset_votes_milestone", {
    users: [authorId], placeholders: { "{count}": String(count), "{title}": title.slice(0, 60), "{url}": "/community-board" },
  });
}

export async function unvoteAsset(voterId: string, assetId: string): Promise<VoteResult> {
  await prisma.jobMediaAssetVote.deleteMany({ where: { assetId, voterId } });
  return { ok: true };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const [assetVotes, commentVotes] = await Promise.all([
    prisma.jobMediaAssetVote.count({
      where: {
        asset: { authorId: userId, hiddenByAdminAt: null },
        createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    // Bewertungen auf eigene Community-Board-Kommentare — job-übergreifend,
    // siehe community-board-comment-service.ts.
    countCommentVoteScore(userId, weekStart, weekEnd),
  ]);
  return assetVotes + commentVotes;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.jobMediaAssetVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

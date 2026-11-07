import { prisma } from "./prisma";
import { canWorkCommunityJobs } from "./community-job-access";
import { registerOwnVoteCounter } from "./community-job-service";
import { dispatchNotification } from "./notify-dispatch";

/**
 * Mediathek des Content Creators: Bilder/Clips aus Beiträgen (JobMediaAsset), Alben, Suche, Bearbeiten/Löschen
 * und Benachrichtigung, wenn jemand ein Bild als Titelbild nutzt. Hochgeladen wird nur noch über einen Beitrag.
 */

export const ASSET_TYPES = ["CLIP", "COLLAGE", "SCREENSHOT", "BANNER", "GRAPHIC"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

// ── Alben ────────────────────────────────────────────────────────────────────

export const ALBUM_TITLE_MAX = 80;

export async function listMyAlbums(userId: string) {
  return prisma.jobMediaAlbum.findMany({
    where: { authorId: userId }, orderBy: { createdAt: "desc" },
    select: { id: true, title: true, eventId: true, createdAt: true, _count: { select: { assets: true } } },
  });
}

export async function createAlbum(authorId: string, data: { title: string; eventId?: string }): Promise<{ ok: true; albumId: string } | { error: string }> {
  if (!(await canWorkCommunityJobs(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
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
    // "Beliebteste": nach Daumen auf den Beitrag, in dem das Bild/der Clip veröffentlicht wurde.
    orderBy: query.sort === "votes" ? [{ report: { votes: { _count: "desc" as const } } }, { createdAt: "desc" as const }] : { createdAt: "desc" as const },
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

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.jobMediaAssetVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

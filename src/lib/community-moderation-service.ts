import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";
import { deleteComment } from "./community-board-comment-service";
import { deleteAlbum } from "./fotograf-service";
import { deleteCampaign } from "./marketing-manager-service";
import { logAdminAction, type AuditActor } from "./community-admin-audit";

/**
 * Moderation der Community-Job-Inhalte: ausblenden/einblenden (Berichte, Bilder, Werbe-Posts, Ideen, Anleitungen)
 * und Löschen (Kommentare, Alben, Kampagnen) bzw. Schließen (Bildwünsche). Alles wird im Admin-Protokoll festgehalten;
 * beim Aus-/Einblenden wird der Autor benachrichtigt. Ausgeblendete Beiträge zählen nicht mehr fürs Gehalt.
 */

export const MODERATION_TYPES = [
  { id: "report", label: "Berichte", canHide: true },
  { id: "asset", label: "Bilder & Clips", canHide: true },
  { id: "marketing_post", label: "Werbe-Posts", canHide: true },
  { id: "idea", label: "Ideen", canHide: true },
  { id: "guide", label: "Anleitungen", canHide: true },
  { id: "comment", label: "Kommentare", canHide: false },
  { id: "album", label: "Alben", canHide: false },
  { id: "campaign", label: "Kampagnen", canHide: false },
  { id: "photo_request", label: "Bildwünsche", canHide: false },
] as const;

export type ModerationType = (typeof MODERATION_TYPES)[number]["id"];
export type HiddenFilter = "visible" | "hidden" | "all";

export function isModerationType(v: unknown): v is ModerationType {
  return typeof v === "string" && MODERATION_TYPES.some(t => t.id === v);
}

export interface ModerationItem {
  type: ModerationType; id: string; title: string;
  authorId: string; authorName: string; createdAt: string;
  hidden: boolean; hiddenReason: string | null; url: string | null; canHide: boolean;
}

const AUTHOR = { select: { id: true, username: true, name: true } } as const;
type AuthorRow = { id: string; username: string | null; name: string | null };
const nameOf = (a: AuthorRow) => a.username ?? a.name ?? a.id;

function hiddenWhere(filter: HiddenFilter) {
  return filter === "visible" ? { hiddenByAdminAt: null } : filter === "hidden" ? { hiddenByAdminAt: { not: null } } : {};
}
function authorSearch(q: string) {
  return { author: { OR: [{ username: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } };
}

export async function listModerationItems(
  type: ModerationType, opts: { hidden?: HiddenFilter; q?: string; take?: number; skip?: number } = {},
): Promise<ModerationItem[]> {
  const hidden = opts.hidden ?? "all";
  const q = opts.q?.trim() || "";
  const take = Math.min(opts.take ?? 40, 100);
  const skip = opts.skip ?? 0;
  const page = { take, skip, orderBy: { createdAt: "desc" as const } };
  const h = hiddenWhere(hidden);

  switch (type) {
    case "report": {
      const rows = await prisma.jobReport.findMany({
        where: { isDraft: false, ...h, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}) },
        include: { author: AUTHOR }, take, skip, orderBy: { publishedAt: "desc" },
      });
      return rows.map(r => ({
        type, id: r.id, title: r.title, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.publishedAt.toISOString(),
        hidden: !!r.hiddenByAdminAt, hiddenReason: r.hiddenReason, url: `/community-board/report/${r.id}`, canHide: true,
      }));
    }
    case "asset": {
      const rows = await prisma.jobMediaAsset.findMany({
        where: { ...h, ...(q ? { OR: [{ caption: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}) },
        include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.caption ?? r.type, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: !!r.hiddenByAdminAt, hiddenReason: r.hiddenReason, url: r.url, canHide: true,
      }));
    }
    case "marketing_post": {
      const rows = await prisma.marketingPost.findMany({
        where: { ...h, ...(q ? { OR: [{ caption: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}) },
        include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.caption.replace(/\s+/g, " ").slice(0, 120), authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: !!r.hiddenByAdminAt, hiddenReason: r.hiddenReason, url: `/tournament/${r.eventId}`, canHide: true,
      }));
    }
    case "idea": {
      const rows = await prisma.communityIdea.findMany({
        where: { ...h, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}) },
        include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.title, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: !!r.hiddenByAdminAt, hiddenReason: r.hiddenReason, url: `/community-board/idea/${r.id}`, canHide: true,
      }));
    }
    case "guide": {
      const rows = await prisma.coachGuide.findMany({
        where: { ...h, ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}) },
        include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.title, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: !!r.hiddenByAdminAt, hiddenReason: r.hiddenReason, url: null, canHide: true,
      }));
    }
    case "comment": {
      if (hidden === "hidden") return [];
      const rows = await prisma.communityBoardComment.findMany({
        where: q ? { OR: [{ bodyMarkdown: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {},
        include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.bodyMarkdown.replace(/\s+/g, " ").slice(0, 160), authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: false, hiddenReason: null,
        url: r.entityType === "report" ? `/community-board/report/${r.entityId}` : r.entityType === "idea" ? `/community-board/idea/${r.entityId}` : null, canHide: false,
      }));
    }
    case "album": {
      if (hidden === "hidden") return [];
      const rows = await prisma.jobMediaAlbum.findMany({
        where: q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}, include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.title, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: false, hiddenReason: null, url: `/community-board/album/${r.id}`, canHide: false,
      }));
    }
    case "campaign": {
      if (hidden === "hidden") return [];
      const rows = await prisma.marketingCampaign.findMany({
        where: q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, authorSearch(q)] } : {}, include: { author: AUTHOR }, ...page,
      });
      return rows.map(r => ({
        type, id: r.id, title: r.title, authorId: r.author.id, authorName: nameOf(r.author), createdAt: r.createdAt.toISOString(),
        hidden: false, hiddenReason: null, url: `/tournament/${r.eventId}`, canHide: false,
      }));
    }
    case "photo_request": {
      if (hidden === "hidden") return [];
      const rows = await prisma.photoRequest.findMany({
        where: q ? { description: { contains: q, mode: "insensitive" } } : {}, ...page,
      });
      const users = await prisma.user.findMany({ where: { id: { in: rows.map(r => r.requesterId) } }, select: { id: true, username: true, name: true } });
      const byId = new Map(users.map(u => [u.id, u]));
      return rows.map(r => ({
        type, id: r.id, title: `${r.description.slice(0, 120)}${r.status !== "OPEN" ? ` (${r.status === "FULFILLED" ? "erfüllt" : "geschlossen"})` : ""}`,
        authorId: r.requesterId, authorName: nameOf(byId.get(r.requesterId) ?? { id: r.requesterId, username: null, name: null }),
        createdAt: r.createdAt.toISOString(), hidden: false, hiddenReason: null, url: null, canHide: false,
      }));
    }
  }
}

/** Autor + Anzeigetitel eines Inhalts (für Benachrichtigung und Protokoll). */
async function contentInfo(type: ModerationType, id: string): Promise<{ authorId: string; title: string } | null> {
  switch (type) {
    case "report": { const r = await prisma.jobReport.findUnique({ where: { id }, select: { authorId: true, title: true } }); return r; }
    case "asset": { const r = await prisma.jobMediaAsset.findUnique({ where: { id }, select: { authorId: true, caption: true, type: true } }); return r && { authorId: r.authorId, title: r.caption ?? r.type }; }
    case "marketing_post": { const r = await prisma.marketingPost.findUnique({ where: { id }, select: { authorId: true, caption: true } }); return r && { authorId: r.authorId, title: r.caption.slice(0, 80) }; }
    case "idea": { const r = await prisma.communityIdea.findUnique({ where: { id }, select: { authorId: true, title: true } }); return r; }
    case "guide": { const r = await prisma.coachGuide.findUnique({ where: { id }, select: { authorId: true, title: true } }); return r; }
    case "comment": { const r = await prisma.communityBoardComment.findUnique({ where: { id }, select: { authorId: true, bodyMarkdown: true } }); return r && { authorId: r.authorId, title: r.bodyMarkdown.slice(0, 80) }; }
    case "album": { const r = await prisma.jobMediaAlbum.findUnique({ where: { id }, select: { authorId: true, title: true } }); return r; }
    case "campaign": { const r = await prisma.marketingCampaign.findUnique({ where: { id }, select: { authorId: true, title: true } }); return r; }
    case "photo_request": { const r = await prisma.photoRequest.findUnique({ where: { id }, select: { requesterId: true, description: true } }); return r && { authorId: r.requesterId, title: r.description.slice(0, 80) }; }
  }
}

async function setHidden(type: ModerationType, id: string, at: Date | null, reason: string | null): Promise<void> {
  const data = { hiddenByAdminAt: at, hiddenReason: reason };
  switch (type) {
    case "report": await prisma.jobReport.update({ where: { id }, data }); break;
    case "asset": await prisma.jobMediaAsset.update({ where: { id }, data }); break;
    case "marketing_post": await prisma.marketingPost.update({ where: { id }, data }); break;
    case "idea": await prisma.communityIdea.update({ where: { id }, data }); break;
    case "guide": await prisma.coachGuide.update({ where: { id }, data }); break;
    default: throw new Error("Dieser Typ lässt sich nicht ausblenden");
  }
}

export type ModerationResult = { ok: true } | { error: string };

export async function moderateContent(
  actor: AuditActor & { role?: string }, type: ModerationType, id: string, action: "hide" | "unhide" | "delete", reason?: string,
): Promise<ModerationResult> {
  const def = MODERATION_TYPES.find(t => t.id === type);
  if (!def) return { error: "Unbekannter Typ" };
  const info = await contentInfo(type, id);
  if (!info) return { error: "Inhalt nicht gefunden" };
  const cleanReason = reason?.trim().slice(0, 300) || "";
  const target = { targetType: type, targetId: id, targetUserId: info.authorId, targetLabel: info.title };

  if (action === "hide" || action === "unhide") {
    if (!def.canHide) return { error: "Dieser Typ lässt sich nicht ausblenden, nur löschen" };
    if (action === "hide" && !cleanReason) return { error: "Bitte einen Grund angeben" };
    await setHidden(type, id, action === "hide" ? new Date() : null, action === "hide" ? cleanReason : null);
    await logAdminAction(actor, { action: action === "hide" ? "content_hide" : "content_unhide", ...target, reason: cleanReason || undefined });
    if (info.authorId !== actor.id) {
      dispatchNotification(action === "hide" ? "community_content_hidden" : "community_content_restored", {
        users: [info.authorId], placeholders: { "{title}": info.title.slice(0, 80), "{reason}": cleanReason || "–" },
      }).catch(() => {});
    }
    return { ok: true };
  }

  // Löschen bzw. Schließen
  if (def.canHide) return { error: "Dieser Typ wird ausgeblendet, nicht gelöscht" };
  let result: { ok: true } | { error: string };
  if (type === "comment") result = await deleteComment(actor.id, id, { isAdmin: true });
  else if (type === "album") result = await deleteAlbum(actor.id, id, { isAdmin: true });
  else if (type === "campaign") result = await deleteCampaign(actor.id, id, { isAdmin: true });
  else {
    await prisma.photoRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "CLOSED" } });
    result = { ok: true };
  }
  if ("error" in result) return result;
  await logAdminAction(actor, { action: "content_delete", ...target, reason: cleanReason || undefined });
  return { ok: true };
}

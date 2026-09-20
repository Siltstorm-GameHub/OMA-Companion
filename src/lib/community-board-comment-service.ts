import { prisma } from "./prisma";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { registerOwnVoteCounter } from "./community-job-service";
import { dispatchNotification } from "./notify-dispatch";
import { plainExcerpt } from "./report-text";

/**
 * Community-Board-Kommentare: generisches, job-übergreifendes Kommentar-Modell
 * für alle vier Feed-Typen (Report, Asset, Marketing-Post, Idee) — jeder darf
 * überall kommentieren, unabhängig vom eigenen Community-Job. Bewertungen auf
 * eigene Kommentare zählen zusätzlich in den Gehalts-Score des jeweils
 * aktuellen Community-Jobs des Kommentators, siehe `countCommentVoteScore`
 * (registriert in journalist/fotograf/marketing-manager/visionaer-service.ts).
 */

export const COMMENT_ENTITY_TYPES = ["report", "asset", "marketing_post", "idea", "guide"] as const;
export type CommentEntityType = (typeof COMMENT_ENTITY_TYPES)[number];

function isValidEntityType(v: unknown): v is CommentEntityType {
  return typeof v === "string" && (COMMENT_ENTITY_TYPES as readonly string[]).includes(v);
}

async function entityExists(entityType: CommentEntityType, entityId: string): Promise<boolean> {
  switch (entityType) {
    case "report": return !!(await prisma.jobReport.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "asset": return !!(await prisma.jobMediaAsset.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "marketing_post": return !!(await prisma.marketingPost.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "idea": return !!(await prisma.communityIdea.findUnique({ where: { id: entityId }, select: { id: true } }));
    case "guide": return !!(await prisma.coachGuide.findUnique({ where: { id: entityId }, select: { id: true } }));
  }
}

export type ListCommentsResult = { ok: true; comments: unknown[] } | { error: string };

export async function listComments(entityType: string, entityId: string, currentUserId: string): Promise<ListCommentsResult> {
  if (!isValidEntityType(entityType)) return { error: "Ungültiger Eintragstyp" };

  const comments = await prisma.communityBoardComment.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
      votes: { where: { voterId: currentUserId }, select: { id: true } },
      _count: { select: { votes: true } },
    },
  });

  return {
    ok: true,
    comments: comments.map(c => ({
      id: c.id, bodyMarkdown: c.bodyMarkdown, createdAt: c.createdAt, author: c.author,
      upvotes: c._count.votes, votedByMe: c.votes.length > 0,
    })),
  };
}

export type AddCommentResult = { ok: true; commentId: string } | { error: string };

export async function addComment(
  authorId: string, entityType: string, entityId: string, bodyMarkdown: string,
): Promise<AddCommentResult> {
  if (!isValidEntityType(entityType)) return { error: "Ungültiger Eintragstyp" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };
  if (bodyMarkdown.length > 2000) return { error: "Kommentar zu lang" };
  if (!(await entityExists(entityType, entityId))) return { error: "Eintrag nicht gefunden" };

  const comment = await prisma.communityBoardComment.create({
    data: { entityType, entityId, authorId, bodyMarkdown: bodyMarkdown.trim() },
  });

  // Kommentar unter einem Bericht → den Autor benachrichtigen (nicht bei Kommentaren am eigenen Bericht).
  if (entityType === "report") {
    notifyReportComment(entityId, authorId, bodyMarkdown).catch(() => {});
  }
  return { ok: true, commentId: comment.id };
}

export type MutationResult = { ok: true } | { error: string };

export async function deleteComment(userId: string, commentId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const comment = await prisma.communityBoardComment.findUnique({ where: { id: commentId } });
  if (!comment) return { error: "Kommentar nicht gefunden" };
  if (comment.authorId !== userId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Kommentar zu löschen" };

  await prisma.communityBoardComment.delete({ where: { id: commentId } });
  return { ok: true };
}

export type VoteResult = { ok: true } | { error: string };

export async function voteComment(voterId: string, commentId: string): Promise<VoteResult> {
  const comment = await prisma.communityBoardComment.findUnique({ where: { id: commentId } });
  if (!comment) return { error: "Kommentar nicht gefunden" };
  if (comment.authorId === voterId) return { error: "Du kannst deinen eigenen Kommentar nicht bewerten" };

  const existing = await prisma.communityBoardCommentVote.findUnique({
    where: { commentId_voterId: { commentId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diesen Kommentar bereits bewertet" };

  await prisma.communityBoardCommentVote.create({ data: { commentId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteComment(voterId: string, commentId: string): Promise<VoteResult> {
  await prisma.communityBoardCommentVote.deleteMany({ where: { commentId, voterId } });
  return { ok: true };
}

/**
 * Anzahl gültiger (nicht selbst, nicht angefochten-überstimmt) Bewertungen,
 * die die Kommentare dieses Users diese Woche erhalten haben — wird von jedem
 * Community-Job-Score-Resolver mit eingerechnet, da Kommentieren nicht an
 * einen bestimmten Job gebunden ist (siehe Modul-Kommentar oben).
 */
export async function countCommentVoteScore(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  return prisma.communityBoardCommentVote.count({
    where: {
      comment: { authorId: userId },
      createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
}

/** Für den Aktivitäts-Bonus: Bewertungen, die dieser User diese Woche auf fremde Kommentare abgegeben hat. */
async function countOwnCommentVotes(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  return prisma.communityBoardCommentVote.count({
    where: {
      voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────
// Nur der Aktivitäts-Bonus (Stimmen, die man selbst abgegeben hat) wird hier
// zentral registriert — der Score-Anteil aus erhaltenen Kommentar-Bewertungen
// wird von jedem Job-Score-Resolver einzeln über `countCommentVoteScore`
// eingerechnet, da `registerScoreResolver` pro Job-Key nur einen Resolver kennt.
registerOwnVoteCounter(countOwnCommentVotes);

async function notifyReportComment(reportId: string, commenterId: string, body: string): Promise<void> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId }, select: { authorId: true, title: true, isDraft: true } });
  if (!report || report.isDraft || report.authorId === commenterId) return;
  const commenter = await prisma.user.findUnique({ where: { id: commenterId }, select: { username: true, name: true } });
  await dispatchNotification("report_comment", {
    users: [report.authorId],
    placeholders: {
      "{authorName}": commenter?.username ?? commenter?.name ?? "Jemand", "{title}": report.title,
      "{excerpt}": plainExcerpt(body, 100), "{url}": `/community-board/report/${reportId}`,
    },
  });
}

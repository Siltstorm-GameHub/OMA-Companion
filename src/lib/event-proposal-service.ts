/**
 * Event-Vorschläge im Community-Board: Jemand wünscht sich ein Event (Spiel, Idee, Wunschtermin), andere sagen
 * "Ich wäre dabei". Wer es organisieren will, übernimmt ("Ich organisiere das") und legt im Event-Assistenten
 * (/events/verwalten/neu?vorschlag=<id>) daraus ein Event an — dann bekommen alle Interessierten den Link zur Anmeldung.
 * Getrennt von Ideen (lib/visionaer-service.ts): Vorschläge zählen nicht für die Community-Jobs.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { hasMinRole } from "./roles";
import { dispatchNotification } from "./notify-dispatch";
import { formatBerlinDateTime } from "./time";

export const PROPOSAL_TITLE_MAX = 100;
export const PROPOSAL_BODY_MAX = 2000;
const AUTHOR = { select: { id: true, username: true, name: true, image: true, rankPoints: true } } as const;

export function proposalPath(id: string): string { return `/community-board#proposal-${id}`; }

type Result<T = object> = ({ ok: true } & T) | { error: string };
type Actor = { id: string; role: string };

const displayName = (u: { username: string | null; name: string | null } | null) => u?.username ?? u?.name ?? "Jemand";

export async function createProposal(authorId: string, data: { title?: unknown; description?: unknown; game?: unknown; preferredTime?: unknown }): Promise<Result<{ id: string }>> {
  const title = String(data.title ?? "").trim().slice(0, PROPOSAL_TITLE_MAX);
  const description = String(data.description ?? "").trim().slice(0, PROPOSAL_BODY_MAX);
  if (!title) return { error: "Titel fehlt" };
  if (!description) return { error: "Beschreib kurz, wie das Event aussehen soll" };
  const game = String(data.game ?? "").trim().slice(0, 80) || null;
  const preferredTime = String(data.preferredTime ?? "").trim().slice(0, 80) || null;
  const p = await prisma.eventProposal.create({ data: { authorId, title, description, game, preferredTime } });
  // Wer vorschlägt, wäre auch dabei
  await prisma.eventProposalInterest.create({ data: { proposalId: p.id, userId: authorId } }).catch(() => {});
  return { ok: true, id: p.id };
}

export async function setProposalInterest(userId: string, proposalId: string, on: boolean): Promise<Result> {
  const p = await prisma.eventProposal.findUnique({ where: { id: proposalId }, select: { id: true, authorId: true, title: true, hiddenByAdminAt: true } });
  if (!p || p.hiddenByAdminAt) return { error: "Vorschlag nicht gefunden" };
  if (!on) {
    await prisma.eventProposalInterest.deleteMany({ where: { proposalId, userId } });
    return { ok: true };
  }
  const existing = await prisma.eventProposalInterest.findUnique({ where: { proposalId_userId: { proposalId, userId } } });
  if (existing) return { ok: true };
  await prisma.eventProposalInterest.create({ data: { proposalId, userId } });
  if (p.authorId !== userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } });
    dispatchNotification("event_proposal_interest", {
      users: [p.authorId], placeholders: { "{name}": displayName(u), "{title}": p.title, "{url}": proposalPath(proposalId) },
    }).catch(() => {});
  }
  return { ok: true };
}

/** "Ich organisiere das": jedes Mitglied darf übernehmen, solange es noch niemand tut (Team darf jederzeit übernehmen). */
export async function organizeProposal(actor: Actor, proposalId: string): Promise<Result> {
  const p = await prisma.eventProposal.findUnique({
    where: { id: proposalId },
    select: { id: true, title: true, authorId: true, organizerId: true, status: true, hiddenByAdminAt: true, interests: { select: { userId: true } } },
  });
  if (!p || p.hiddenByAdminAt) return { error: "Vorschlag nicht gefunden" };
  if (p.status === "SCHEDULED") return { error: "Aus diesem Vorschlag ist schon ein Event geworden" };
  if (p.organizerId && p.organizerId !== actor.id && !hasMinRole(actor.role, "moderator")) return { error: "Das organisiert schon jemand" };
  if (p.organizerId === actor.id) return { ok: true };

  await prisma.eventProposal.update({ where: { id: proposalId }, data: { organizerId: actor.id, organizerAt: new Date(), status: "ORGANIZING" } });
  const u = await prisma.user.findUnique({ where: { id: actor.id }, select: { username: true, name: true } });
  const to = [...new Set([p.authorId, ...p.interests.map(i => i.userId)])].filter(id => id !== actor.id);
  if (to.length > 0) {
    dispatchNotification("event_proposal_organizer", {
      users: to, placeholders: { "{name}": displayName(u), "{title}": p.title, "{url}": proposalPath(proposalId) },
    }).catch(() => {});
  }
  return { ok: true };
}

/** Organisation wieder abgeben (Organisator selbst oder Team) */
export async function releaseProposal(actor: Actor, proposalId: string): Promise<Result> {
  const p = await prisma.eventProposal.findUnique({ where: { id: proposalId }, select: { organizerId: true, status: true } });
  if (!p) return { error: "Vorschlag nicht gefunden" };
  if (p.status === "SCHEDULED") return { error: "Das Event steht schon" };
  if (p.organizerId !== actor.id && !hasMinRole(actor.role, "moderator")) return { error: "Keine Berechtigung" };
  await prisma.eventProposal.update({ where: { id: proposalId }, data: { organizerId: null, organizerAt: null, status: "OPEN" } });
  return { ok: true };
}

export async function deleteProposal(actor: Actor, proposalId: string): Promise<Result> {
  const p = await prisma.eventProposal.findUnique({ where: { id: proposalId }, select: { authorId: true } });
  if (!p) return { error: "Vorschlag nicht gefunden" };
  if (p.authorId !== actor.id && !hasMinRole(actor.role, "moderator")) return { error: "Keine Berechtigung" };
  await prisma.communityBoardComment.deleteMany({ where: { entityType: "proposal", entityId: proposalId } });
  await prisma.eventProposal.delete({ where: { id: proposalId } });
  return { ok: true };
}

/** Vorbelegung für den Event-Assistenten — nur für den Organisator (bzw. das Team). Übernimmt automatisch, wenn frei. */
export async function proposalForWizard(actor: Actor, proposalId: string) {
  const p = await prisma.eventProposal.findUnique({ where: { id: proposalId } });
  if (!p || p.hiddenByAdminAt || p.status === "SCHEDULED") return null;
  if (p.organizerId && p.organizerId !== actor.id && !hasMinRole(actor.role, "moderator")) return null;
  if (!p.organizerId) await organizeProposal(actor, proposalId);
  return { id: p.id, title: p.title, description: p.description, game: p.game, preferredTime: p.preferredTime };
}

/**
 * Event aus einem Vorschlag angelegt (POST /api/events mit proposalId): Vorschlag verknüpfen und alle
 * Interessierten mit Link zur Anmeldung benachrichtigen.
 */
export async function linkProposalEvent(actor: Actor, proposalId: string, event: { id: string; title: string; startAt: Date }): Promise<void> {
  const p = await prisma.eventProposal.findUnique({ where: { id: proposalId }, select: { id: true, organizerId: true, status: true, interests: { select: { userId: true } } } });
  if (!p || p.status === "SCHEDULED") return;
  if (p.organizerId && p.organizerId !== actor.id && !hasMinRole(actor.role, "moderator")) return;
  await prisma.eventProposal.update({ where: { id: proposalId }, data: { status: "SCHEDULED", eventId: event.id, organizerId: p.organizerId ?? actor.id } });
  const to = p.interests.map(i => i.userId).filter(id => id !== actor.id);
  if (to.length > 0) {
    await dispatchNotification("event_proposal_scheduled", {
      users: to,
      placeholders: {
        "{title}": event.title,
        "{date}": formatBerlinDateTime(event.startAt, { dateStyle: "medium", timeStyle: "short" }),
        "{url}": `/tournament/${event.id}`,
      },
    });
  }
}

// ── Feed ──────────────────────────────────────────────────────────────────────

export function proposalFeedInclude() {
  return {
    author: AUTHOR,
    organizer: { select: { id: true, username: true, name: true } },
    interests: {
      orderBy: { createdAt: "asc" as const }, take: 12,
      select: { userId: true, user: { select: { id: true, username: true, name: true, image: true } } },
    },
    _count: { select: { interests: true } },
  } satisfies Prisma.EventProposalInclude;
}

export type ProposalWithFeedData = Prisma.EventProposalGetPayload<{ include: ReturnType<typeof proposalFeedInclude> }>;

export async function toProposalFeedEntries(rows: ProposalWithFeedData[], viewerId: string) {
  if (rows.length === 0) return [];
  const mine = new Set((await prisma.eventProposalInterest.findMany({
    where: { userId: viewerId, proposalId: { in: rows.map(r => r.id) } }, select: { proposalId: true },
  })).map(i => i.proposalId));
  const eventIds = rows.map(r => r.eventId).filter((id): id is string => !!id);
  const events = eventIds.length > 0
    ? await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true, startAt: true, status: true, game: true, coverImageUrl: true, maxPlayers: true, _count: { select: { registrations: true } } },
      })
    : [];
  return rows.map(r => {
    const ev = events.find(e => e.id === r.eventId);
    return {
      kind: "proposal" as const,
      id: r.id,
      publishedAt: r.createdAt,
      title: r.title,
      description: r.description,
      game: r.game,
      preferredTime: r.preferredTime,
      proposalStatus: r.status,
      organizer: r.organizer ? { id: r.organizer.id, name: displayName(r.organizer) } : null,
      author: r.author,
      interested: r._count.interests,
      interestedPeople: r.interests.map(i => ({ id: i.user.id, name: displayName(i.user), image: i.user.image })),
      interestedByMe: mine.has(r.id),
      votedByMe: false,
      event: ev ? {
        id: ev.id, title: ev.title, startAt: ev.startAt, status: ev.status, game: ev.game,
        coverImageUrl: ev.coverImageUrl, maxPlayers: ev.maxPlayers, registrations: ev._count.registrations,
      } : null,
    };
  });
}

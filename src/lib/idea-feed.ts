import type { Prisma } from "@prisma/client";
import { summarizeStars } from "./idea-lifecycle";

/**
 * Ideen als Board-Karten: gemeinsame Abfrage + Abbildung für den Feed (/api/community-board) und die
 * einzelne Ideen-Seite (/community-board/idea/[id]). Die Begründungen der Stimmen bleiben privat
 * (nur Autor + Admin) — hier werden nur Sterne ausgewertet.
 */

const AUTHOR = { select: { id: true, username: true, name: true, image: true, rankPoints: true } } as const;

export function ideaFeedInclude() {
  return {
    author: AUTHOR,
    votes: { select: { stars: true, voterId: true, createdAt: true, revotedAt: true } },
    interests: { select: { userId: true, kind: true } },
  } satisfies Prisma.CommunityIdeaInclude;
}

export type IdeaWithFeedData = Prisma.CommunityIdeaGetPayload<{ include: ReturnType<typeof ideaFeedInclude> }>;

export function toIdeaFeedEntry(i: IdeaWithFeedData, viewerId: string) {
  const summary = summarizeStars(i.votes.map(v => v.stars));
  return {
    kind: "idea" as const,
    id: i.id,
    publishedAt: i.createdAt,
    title: i.title,
    description: i.description,
    status: i.status, // rein kosmetisch — bleibt auch nach "CLOSED" bewertbar
    category: i.category,
    lifecycle: i.lifecycle,
    lifecycleNote: i.lifecycleNote,
    votingEndsAt: i.votingEndsAt,
    sourceEventId: i.sourceEventId,
    sourceReportId: i.sourceReportId,
    author: i.author,
    voteCount: summary.count,
    avgStars: summary.average,
    distribution: summary.distribution,
    votedByMe: i.votes.some(v => v.voterId === viewerId),
    // Nach einer Überarbeitung darf man seine Bewertung einmal anpassen.
    canRevote: !!i.editedAt && i.votes.some(v => v.voterId === viewerId && (v.revotedAt ?? v.createdAt) < i.editedAt!),
    imageUrls: i.imageUrls,
    version: i.version,
    editedAt: i.editedAt,
    lastEditNote: i.lastEditNote,
    gameAppId: i.gameAppId,
    gameName: i.gameName,
    draftEventId: i.draftEventId,
    interestParticipate: i.interests.filter(x => x.kind === "PARTICIPATE").length,
    interestHelp: i.interests.filter(x => x.kind === "HELP").length,
    myInterests: i.interests.filter(x => x.userId === viewerId).map(x => x.kind),
  };
}

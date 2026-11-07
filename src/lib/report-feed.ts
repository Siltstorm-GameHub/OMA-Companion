import type { Prisma } from "@prisma/client";
import { plainExcerpt, readingMinutes } from "./report-text";
import { postDisplayTitle } from "./post-display";
import type { PollKind, PollView } from "./post-poll";

/**
 * Beiträge (Text + Bilder/Clips + optional Werbung) als Board-Karten: gemeinsame Abfrage + Abbildung für den
 * Feed (/api/community-board), die Turnierseite und die einzelne Beitragsseite (/community-board/report/[id]).
 */

const AUTHOR = { select: { id: true, username: true, name: true, image: true, rankPoints: true } } as const;

export function reportFeedInclude(viewerId: string) {
  return {
    event: { select: { id: true, title: true } },
    series: { select: { id: true, title: true } },
    author: AUTHOR,
    coverAsset: { include: { author: AUTHOR } },
    contributions: { include: { author: AUTHOR, _count: { select: { votes: true } } } },
    media: {
      where: { hiddenByAdminAt: null }, orderBy: { position: "asc" },
      select: { id: true, url: true, caption: true, type: true, clipStart: true, clipEnd: true, posterUrl: true },
    },
    poll: {
      include: {
        options: { orderBy: { position: "asc" }, select: { id: true, label: true, _count: { select: { votes: true } } } },
        votes: { where: { userId: viewerId }, select: { optionId: true } },
      },
    },
    votes: { where: { voterId: viewerId }, select: { id: true } },
    _count: { select: { votes: true } },
  } satisfies Prisma.JobReportInclude;
}

export type ReportWithFeedData = Prisma.JobReportGetPayload<{ include: ReturnType<typeof reportFeedInclude> }>;

/** Umfrage fürs Board — die richtige Antwort erst nach der Auflösung (Quiz bleibt bis dahin geheim). */
export function toPollView(p: NonNullable<ReportWithFeedData["poll"]>): PollView {
  const options = p.options.map(o => ({ id: o.id, label: o.label, votes: o._count.votes }));
  return {
    id: p.id, question: p.question, kind: p.kind as PollKind, options,
    totalVotes: options.reduce((s, o) => s + o.votes, 0),
    myOptionId: p.votes[0]?.optionId ?? null,
    closesAt: p.closesAt ? p.closesAt.toISOString() : null,
    resolved: !!p.resolvedAt,
    correctOptionId: p.resolvedAt ? p.correctOptionId : null,
    participationReward: p.participationReward, correctReward: p.correctReward,
  };
}

export function toReportFeedEntry(r: ReportWithFeedData) {
  return {
    kind: "report" as const,
    id: r.id,
    publishedAt: r.publishedAt,
    title: postDisplayTitle({ title: r.title, bodyMarkdown: r.bodyMarkdown, mediaCount: r.media.length }),
    /** true = eigener Titel gesetzt (sonst ist `title` aus Text bzw. "Fotos & Clips" abgeleitet). */
    hasOwnTitle: !!r.title.trim(),
    category: r.category,
    media: r.media,
    poll: r.poll ? toPollView(r.poll) : null,
    template: r.template,
    adminConfirmedPosted: r.adminConfirmedPosted,
    trainingSessionId: r.trainingSessionId,
    event: r.event,
    series: r.series,
    editedAt: r.editedAt,
    lastEditNote: r.lastEditNote,
    // Nur Auszug im Feed — den vollen Text lädt das Board beim Aufklappen (GET /reports/[id]).
    excerpt: plainExcerpt(r.bodyMarkdown, 320),
    readingMinutes: readingMinutes(r.bodyMarkdown),
    author: r.author,
    upvotes: r._count.votes,
    votedByMe: r.votes.length > 0,
    // Zusammengesetzte Ansicht: Cover-Bild (Fotograf) und referenzierter Marketing-Post
    // sind eigenständige, unabhängig bewertbare Komponenten mit eigenem Autor.
    gameCover: r.gameCoverUrl ? { url: r.gameCoverUrl, name: r.gameCoverName } : null,
    coverAsset: r.coverAsset && { id: r.coverAsset.id, url: r.coverAsset.url, author: r.coverAsset.author, upvotes: 0 },
    contributions: r.contributions.map(c => ({
      id: c.id, bodyMarkdown: c.bodyMarkdown, author: c.author, upvotes: c._count.votes,
    })),
  };
}

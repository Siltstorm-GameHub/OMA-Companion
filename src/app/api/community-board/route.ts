import { enrichIdeaEntries, ideaFeedInclude, toIdeaFeedEntry } from "@/lib/idea-feed";
import { IDEA_SUPPORT_THRESHOLD } from "@/lib/idea-lifecycle";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { reportFeedInclude, toReportFeedEntry } from "@/lib/report-feed";
import { publishDueScheduledPosts } from "@/lib/journalist-service";
import { resolveDuePolls } from "@/lib/post-poll-service";
import { proposalFeedInclude, toProposalFeedEntries } from "@/lib/event-proposal-service";

export const dynamic = "force-dynamic";

const TOP_DAYS = 7;

interface CommentPreview {
  id: string; bodyMarkdown: string; createdAt: Date;
  author: { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };
}
const TOP_POOL = 150;

/**
 * Community-Board: gemeinsamer Feed aus Beiträgen (Text, Bilder/Clips, Werbung, Berichte), Ideen und Anleitungen.
 * Einträge bleiben dauerhaft sicht- und bewertbar.
 *
 * Parameter:
 *  - limit (max. 50, Standard 20)
 *  - sort: "new" (Standard, chronologisch, Cursor `before` = ISO-Zeitpunkt des letzten Eintrags) |
 *          "top" (beliebteste der letzten 7 Tage, Cursor `offset`) |
 *          "goal" (nur offene Ideen, denen noch Unterstützer fehlen — knappste zuerst, Cursor `offset`)
 *  - mine=1: nur eigene Einträge
 *  - kind: "post" (Beiträge) | "media" (Beiträge mit Bildern/Clips) | "idea" | "guide" | "proposal" (Event-Vorschläge)
 * Antwort: { feed, nextCursor } — nextCursor ist null, wenn nichts mehr kommt.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  await publishDueScheduledPosts().catch(() => {}); // fällige geplante Beiträge zuerst veröffentlichen
  await resolveDuePolls().catch(() => {}); // fällige Umfragen auflösen (Gewinn-Münzen)
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit")) || 20);
  const sortParam = searchParams.get("sort");
  // "goal" (Kurz vor dem Ziel) gibt es nur für Ideen
  const sort = sortParam === "top" ? "top" : sortParam === "goal" ? "goal" : "new";
  const mine = searchParams.get("mine") === "1";
  const kind = sort === "goal" ? "idea" : searchParams.get("kind");
  const beforeRaw = searchParams.get("before");
  const before = beforeRaw && !isNaN(Date.parse(beforeRaw)) ? new Date(beforeRaw) : null;
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  const since = sort === "top" ? new Date(Date.now() - TOP_DAYS * 24 * 60 * 60_000) : null;
  const take = sort === "new" ? limit : TOP_POOL;
  const author = mine ? { authorId: user.id } : {};
  const timeFilter = (field: "publishedAt" | "createdAt") => ({
    ...(before && sort === "new" ? { [field]: { lt: before } } : {}),
    ...(since ? { [field]: { gte: since } } : {}),
  });
  const wantReports = !kind || kind === "post" || kind === "media";
  const wantIdeas = !kind || kind === "idea";
  const wantGuides = !kind || kind === "guide";
  const wantProposals = !kind || kind === "proposal";

  const reportWhere: Prisma.JobReportWhereInput = {
    hiddenByAdminAt: null, isDraft: false, ...author, ...timeFilter("publishedAt"),
    ...(kind === "media" ? { media: { some: {} } } : {}),
  };

  const [reports, ideas, guides, proposalRows] = await Promise.all([
    wantReports
      ? prisma.jobReport.findMany({ where: reportWhere, orderBy: { publishedAt: "desc" }, take, include: reportFeedInclude(user.id) })
      : Promise.resolve([]),
    wantIdeas
      ? prisma.communityIdea.findMany({
          where: { hiddenByAdminAt: null, ...author, ...timeFilter("createdAt"), ...(sort === "goal" ? { lifecycle: "OPEN" } : {}) },
          orderBy: { createdAt: "desc" }, take, include: ideaFeedInclude(),
        })
      : Promise.resolve([]),
    wantGuides
      ? prisma.coachGuide.findMany({
          where: { hiddenByAdminAt: null, ...author, ...timeFilter("createdAt") },
          orderBy: { createdAt: "desc" },
          take,
          include: {
            author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
            votes: { where: { voterId: user.id }, select: { id: true } },
            _count: { select: { votes: true } },
          },
        })
      : Promise.resolve([]),
    wantProposals
      ? prisma.eventProposal.findMany({
          where: { hiddenByAdminAt: null, ...author, ...timeFilter("createdAt") },
          orderBy: { createdAt: "desc" }, take, include: proposalFeedInclude(),
        })
      : Promise.resolve([]),
  ]);
  const proposals = await toProposalFeedEntries(proposalRows, user.id);
  const ideaEntries = await enrichIdeaEntries(ideas.map(i => toIdeaFeedEntry(i, user.id)));

  const all = [
    ...reports.map(toReportFeedEntry),
    ...ideaEntries,
    ...guides.map(g => ({
      kind: "guide" as const,
      id: g.id,
      publishedAt: g.createdAt,
      title: g.title,
      description: g.bodyMarkdown,
      game: g.game,
      author: g.author,
      upvotes: g._count.votes,
      votedByMe: g.votes.length > 0,
    })),
    ...proposals,
  ];

  // Kommentarzahl und die zwei neuesten Kommentare je Eintrag (Vorschau unter der Karte)
  async function withComments<T extends { kind: string; id: string }>(entries: T[]) {
    if (entries.length === 0) return entries.map(e => ({ ...e, commentCount: 0, latestComments: [] as CommentPreview[] }));
    const ids = entries.map(e => e.id);
    const [counts, recent] = await Promise.all([
      prisma.communityBoardComment.groupBy({ by: ["entityType", "entityId"], where: { entityId: { in: ids } }, _count: { _all: true } }),
      prisma.communityBoardComment.findMany({
        where: { entityId: { in: ids } }, orderBy: { createdAt: "desc" }, take: ids.length * 6,
        select: { id: true, entityType: true, entityId: true, bodyMarkdown: true, createdAt: true, author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } } },
      }),
    ]);
    const key = (t: string, id: string) => `${t}:${id}`;
    const countBy = new Map(counts.map(c => [key(c.entityType, c.entityId), c._count._all]));
    const latestBy = new Map<string, CommentPreview[]>();
    for (const c of recent) {
      const k = key(c.entityType, c.entityId);
      const list = latestBy.get(k) ?? [];
      if (list.length < 2) list.push({ id: c.id, bodyMarkdown: c.bodyMarkdown, createdAt: c.createdAt, author: c.author });
      latestBy.set(k, list);
    }
    return entries.map(e => ({
      ...e,
      commentCount: countBy.get(key(e.kind, e.id)) ?? 0,
      latestComments: (latestBy.get(key(e.kind, e.id)) ?? []).reverse(), // älteste der beiden zuerst, wie im Gespräch
    }));
  }

  if (sort === "goal") {
    // Offene Ideen, denen noch Unterstützer fehlen — die knappsten zuerst (dort bewirkt eine Stimme am meisten)
    const open = all.filter((e): e is (typeof ideaEntries)[number] => e.kind === "idea" && (e.supporters ?? 0) < IDEA_SUPPORT_THRESHOLD)
      .sort((a, b) => (b.supporters ?? 0) - (a.supporters ?? 0) || b.publishedAt.getTime() - a.publishedAt.getTime());
    const page = await withComments(open.slice(offset, offset + limit));
    return NextResponse.json({ feed: page, nextCursor: offset + limit < open.length ? String(offset + limit) : null });
  }

  if (sort === "top") {
    // Beliebt: Daumen (Beiträge/Anleitungen) bzw. Stimmen (Ideen), bei Gleichstand der neuere zuerst
    const score = (e: (typeof all)[number]) => ("upvotes" in e && typeof e.upvotes === "number" ? e.upvotes : 0)
      + ("voteCount" in e && typeof e.voteCount === "number" ? e.voteCount : 0)
      + ("interested" in e && typeof e.interested === "number" ? e.interested : 0);
    const sorted = all.sort((a, b) => score(b) - score(a) || b.publishedAt.getTime() - a.publishedAt.getTime());
    const page = await withComments(sorted.slice(offset, offset + limit));
    return NextResponse.json({ feed: page, nextCursor: offset + limit < sorted.length ? String(offset + limit) : null });
  }

  const sorted = all.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  const page = await withComments(sorted.slice(0, limit));
  // Weitere Seite, wenn eine der Quellen ihr Limit ausgeschöpft hat oder zusammen mehr als eine Seite kam
  const more = sorted.length > limit || reports.length === take || ideas.length === take || guides.length === take || proposalRows.length === take;
  const last = page[page.length - 1];
  return NextResponse.json({ feed: page, nextCursor: more && last ? last.publishedAt.toISOString() : null });
}

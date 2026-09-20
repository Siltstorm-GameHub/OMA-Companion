import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { reportFeedInclude, toReportFeedEntry } from "@/lib/report-feed";

export const dynamic = "force-dynamic";

/**
 * Community-Board: gemeinsamer chronologischer Feed aus Journalist-Berichten,
 * Fotograf-Assets und Marketing-Posts (CommunityIdea folgt in Phase 5).
 * Einträge bleiben dauerhaft sicht- und bewertbar, keine Trennung nach Job als
 * Grundstruktur — siehe Plan-Abschnitt "Sichtbarkeit & Bewertung".
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit")) || 20);

  const [reports, assets, marketingPosts, ideas, guides] = await Promise.all([
    prisma.jobReport.findMany({
      where: { hiddenByAdminAt: null, isDraft: false },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: reportFeedInclude(user.id),
    }),
    prisma.jobMediaAsset.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
        votes: { where: { voterId: user.id }, select: { id: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.marketingPost.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
        asset: true,
        event: { select: { id: true, title: true } },
        votes: { where: { voterId: user.id }, select: { id: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.communityIdea.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
        votes: { where: { voterId: user.id }, select: { id: true, stars: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.coachGuide.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { id: true, username: true, name: true, image: true, rankPoints: true } },
        votes: { where: { voterId: user.id }, select: { id: true } },
        _count: { select: { votes: true } },
      },
    }),
  ]);

  const feed = [
    ...reports.map(toReportFeedEntry),
    ...assets.map(a => ({
      kind: "asset" as const,
      id: a.id,
      publishedAt: a.createdAt,
      type: a.type,
      url: a.url,
      eventId: a.eventId,
      caption: a.caption,
      author: a.author,
      upvotes: a._count.votes,
      votedByMe: a.votes.length > 0,
    })),
    ...marketingPosts.map(p => ({
      kind: "marketing_post" as const,
      id: p.id,
      publishedAt: p.createdAt,
      caption: p.caption,
      event: p.event,
      asset: p.asset,
      imageUrl: p.imageUrl,
      author: p.author,
      upvotes: p._count.votes,
      votedByMe: p.votes.length > 0,
      adminConfirmedPosted: p.adminConfirmedPosted,
    })),
    ...ideas.map(i => ({
      kind: "idea" as const,
      id: i.id,
      publishedAt: i.createdAt,
      title: i.title,
      description: i.description,
      status: i.status, // rein kosmetisch — bleibt auch nach "CLOSED" bewertbar
      author: i.author,
      voteCount: i._count.votes,
      votedByMe: i.votes.length > 0,
    })),
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
  ].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, limit);

  return NextResponse.json({ feed });
}

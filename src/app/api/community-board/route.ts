import { ideaFeedInclude, toIdeaFeedEntry } from "@/lib/idea-feed";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { reportFeedInclude, toReportFeedEntry } from "@/lib/report-feed";

export const dynamic = "force-dynamic";

/**
 * Community-Board: gemeinsamer chronologischer Feed aus Beiträgen (Text, Bilder/Clips, Werbung — seit der
 * Zusammenlegung ein Typ), Ideen und Anleitungen. Einträge bleiben dauerhaft sicht- und bewertbar.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit")) || 20);

  const [reports, ideas, guides] = await Promise.all([
    prisma.jobReport.findMany({
      where: { hiddenByAdminAt: null, isDraft: false },
      orderBy: { publishedAt: "desc" },
      take: limit,
      include: reportFeedInclude(user.id),
    }),
    prisma.communityIdea.findMany({
      where: { hiddenByAdminAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: ideaFeedInclude(),
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
    ...ideas.map(i => toIdeaFeedEntry(i, user.id)),
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

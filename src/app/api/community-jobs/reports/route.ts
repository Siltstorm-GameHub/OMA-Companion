import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createReport } from "@/lib/journalist-service";
import { parsePostExtras } from "@/lib/post-input";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Eigene Beiträge (fürs Büro) — inkl. Medien-Vorschau. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const reports = await prisma.jobReport.findMany({
    where: { authorId: user.id },
    orderBy: { publishedAt: "desc" },
    include: {
      _count: { select: { votes: true, contributions: true, media: true } },
      media: { orderBy: { position: "asc" }, take: 4, select: { id: true, url: true } },
      event: { select: { id: true, title: true } },
    },
  });
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { eventId, coverAssetId, referencedMarketingPostId, category, draft, seriesId, gameCoverUrl, gameCoverName } = body;
  // Titel und Text sind optional — ein Beitrag braucht Text ODER Bild (prüft createReport).
  const title = typeof body.title === "string" ? body.title : "";
  const bodyMarkdown = typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : "";

  const result = await createReport(user.id, {
    title, bodyMarkdown,
    eventId: typeof eventId === "string" ? eventId : undefined,
    coverAssetId: typeof coverAssetId === "string" ? coverAssetId : undefined,
    gameCoverUrl: typeof gameCoverUrl === "string" ? gameCoverUrl : undefined,
    gameCoverName: typeof gameCoverName === "string" ? gameCoverName : undefined,
    referencedMarketingPostId: typeof referencedMarketingPostId === "string" ? referencedMarketingPostId : undefined,
    category: typeof category === "string" && category ? category : undefined,
    draft: draft === true,
    seriesId: typeof seriesId === "string" && seriesId ? seriesId : undefined,
    ...parsePostExtras(body),
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

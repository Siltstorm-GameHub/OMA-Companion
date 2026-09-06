import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createReport } from "@/lib/journalist-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Eigene Berichte des Journalisten (fürs Büro). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const reports = await prisma.jobReport.findMany({
    where: { authorId: user.id },
    orderBy: { publishedAt: "desc" },
    include: { _count: { select: { votes: true, contributions: true } } },
  });
  return NextResponse.json({ reports });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title, bodyMarkdown, eventId, coverAssetId, referencedMarketingPostId } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Titel und Text erforderlich" }, { status: 400 });
  }

  const result = await createReport(user.id, {
    title, bodyMarkdown,
    eventId: typeof eventId === "string" ? eventId : undefined,
    coverAssetId: typeof coverAssetId === "string" ? coverAssetId : undefined,
    referencedMarketingPostId: typeof referencedMarketingPostId === "string" ? referencedMarketingPostId : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

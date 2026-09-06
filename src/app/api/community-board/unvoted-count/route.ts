import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Für das Dashboard-Erinnerungs-Banner (analog DailyPollBanner) — Anzahl fremder, noch nicht bewerteter Beiträge. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const [reports, assets, posts, ideas] = await Promise.all([
    prisma.jobReport.count({
      where: { hiddenByAdminAt: null, authorId: { not: user.id }, votes: { none: { voterId: user.id } } },
    }),
    prisma.jobMediaAsset.count({
      where: { hiddenByAdminAt: null, authorId: { not: user.id }, votes: { none: { voterId: user.id } } },
    }),
    prisma.marketingPost.count({
      where: { hiddenByAdminAt: null, authorId: { not: user.id }, votes: { none: { voterId: user.id } } },
    }),
    prisma.communityIdea.count({
      where: { hiddenByAdminAt: null, authorId: { not: user.id }, votes: { none: { voterId: user.id } } },
    }),
  ]);

  return NextResponse.json({ count: reports + assets + posts + ideas });
}

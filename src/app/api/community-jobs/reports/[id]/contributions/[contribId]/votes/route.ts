import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ contribId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { contribId } = await params;
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contribId }, select: { authorId: true } });
  if (!contribution || contribution.authorId !== user.id) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const votes = await prisma.jobReportContributionVote.findMany({
    where: { contributionId: contribId },
    include: { voter: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ votes });
}

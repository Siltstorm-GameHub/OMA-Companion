import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** Owner-only: einzelne Bewertungen des eigenen Berichts, für die Anfechtungs-Funktion. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const report = await prisma.jobReport.findUnique({ where: { id }, select: { authorId: true } });
  if (!report || report.authorId !== user.id) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const votes = await prisma.jobReportVote.findMany({
    where: { reportId: id },
    include: { voter: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ votes });
}

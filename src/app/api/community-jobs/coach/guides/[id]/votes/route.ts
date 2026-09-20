import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Bewertungen auf die eigene Anleitung (für die Anfechten-Funktion) — nur für den Autor. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const guide = await prisma.coachGuide.findUnique({ where: { id }, select: { authorId: true } });
  if (!guide || guide.authorId !== user.id) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const votes = await prisma.coachGuideVote.findMany({
    where: { guideId: id },
    include: { voter: { select: { id: true, username: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ votes });
}

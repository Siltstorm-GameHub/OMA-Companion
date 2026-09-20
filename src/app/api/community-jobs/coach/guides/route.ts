import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createGuide } from "@/lib/coach-guide-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Eigene Anleitungen fürs Coach-Büro (inkl. Text zum Bearbeiten und Bewertungsanzahl). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const guides = await prisma.coachGuide.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json({ guides });
}

/** POST { title, bodyMarkdown, game? } */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title, bodyMarkdown, game } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof bodyMarkdown !== "string") {
    return NextResponse.json({ error: "Titel und Text erforderlich" }, { status: 400 });
  }

  const result = await createGuide(user.id, { title, bodyMarkdown, game: typeof game === "string" ? game : undefined });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

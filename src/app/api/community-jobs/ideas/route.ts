import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { submitIdea } from "@/lib/visionaer-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Alle Ideen (dauerhaft gelistet, auch nach Ablauf der Abstimmungsfrist). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const ideas = await prisma.communityIdea.findMany({
    where: { hiddenByAdminAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, name: true } },
      _count: { select: { votes: true } },
      votes: { where: { voterId: user.id }, select: { id: true } },
    },
  });
  return NextResponse.json({ ideas });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title, description, votingEndsAt } = await req.json().catch(() => ({}));
  if (typeof title !== "string" || typeof description !== "string") {
    return NextResponse.json({ error: "Titel und Beschreibung erforderlich" }, { status: 400 });
  }

  const result = await submitIdea(user.id, {
    title, description,
    votingEndsAt: typeof votingEndsAt === "string" ? new Date(votingEndsAt) : undefined,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

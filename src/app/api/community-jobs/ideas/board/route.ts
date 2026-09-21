import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { summarizeStars } from "@/lib/idea-lifecycle";

export const dynamic = "force-dynamic";

/** Team-Ansicht: alle Ideen mit Status, Bewertung und Interesse (für die Spalten-Ansicht im Admin). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });

  const ideas = await prisma.communityIdea.findMany({
    where: { hiddenByAdminAt: null }, orderBy: { createdAt: "desc" }, take: 300,
    select: {
      id: true, title: true, category: true, lifecycle: true, lifecycleNote: true, createdAt: true, draftEventId: true, gameName: true,
      author: { select: { username: true, name: true } },
      votes: { select: { stars: true } },
      interests: { select: { kind: true } },
    },
  });
  return NextResponse.json({
    ideas: ideas.map(i => {
      const { count, average } = summarizeStars(i.votes.map(v => v.stars));
      return {
        id: i.id, title: i.title, category: i.category, lifecycle: i.lifecycle, note: i.lifecycleNote, createdAt: i.createdAt,
        draftEventId: i.draftEventId, game: i.gameName, author: i.author.username ?? i.author.name ?? "?",
        votes: count, average, participants: i.interests.filter(x => x.kind === "PARTICIPATE").length, helpers: i.interests.filter(x => x.kind === "HELP").length,
      };
    }),
  });
}

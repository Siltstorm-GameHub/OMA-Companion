import { NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { countSupporters, IDEA_SUPPORT_THRESHOLD, summarizeStars } from "@/lib/idea-lifecycle";

export const dynamic = "force-dynamic";

/**
 * Seit wann wartet die Idee auf eine Antwort? "In Prüfung": seit dem Statuswechsel. Offen: seit dem Unterstützer,
 * mit dem das Ziel erreicht wurde, bzw. seit Fristende — je nachdem, was früher war.
 */
function waitingSince(
  i: { lifecycle: string; lifecycleAt: Date | null; createdAt: Date; votingEndsAt: Date | null; interests: { userId: string; kind: string; createdAt: Date }[] },
  supporters: number, deadlinePassed: boolean,
): string | null {
  if (i.lifecycle === "REVIEW") return (i.lifecycleAt ?? i.createdAt).toISOString();
  if (i.lifecycle !== "OPEN") return null;
  const candidates: number[] = [];
  if (deadlinePassed && i.votingEndsAt) candidates.push(i.votingEndsAt.getTime());
  if (supporters >= IDEA_SUPPORT_THRESHOLD) {
    const seen = new Set<string>();
    for (const x of i.interests) {
      if (x.kind !== "SUPPORT" && x.kind !== "PARTICIPATE") continue;
      seen.add(x.userId);
      if (seen.size === IDEA_SUPPORT_THRESHOLD) { candidates.push(x.createdAt.getTime()); break; }
    }
  }
  return candidates.length > 0 ? new Date(Math.min(...candidates)).toISOString() : null;
}

/**
 * Team-Ansicht: alle Ideen mit Status, Unterstützern, Bewertung und "braucht Antwort".
 * Braucht Antwort = "In Prüfung" oder noch "Offen" mit genug Unterstützern bzw. abgelaufener Frist.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(user.role, "moderator")) return NextResponse.json({ error: "Nur für das Team" }, { status: 403 });

  const now = Date.now();
  const ideas = await prisma.communityIdea.findMany({
    where: { hiddenByAdminAt: null }, orderBy: { createdAt: "desc" }, take: 300,
    select: {
      id: true, title: true, category: true, lifecycle: true, lifecycleNote: true, lifecycleAt: true, createdAt: true, votingEndsAt: true, gameName: true,
      author: { select: { username: true, name: true } },
      votes: { select: { stars: true } },
      interests: { select: { userId: true, kind: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({
    threshold: IDEA_SUPPORT_THRESHOLD,
    ideas: ideas.map(i => {
      const { count, average } = summarizeStars(i.votes.map(v => v.stars));
      const supporters = countSupporters(i.interests);
      const deadlinePassed = !!i.votingEndsAt && i.votingEndsAt.getTime() < now;
      return {
        id: i.id, title: i.title, category: i.category, lifecycle: i.lifecycle, note: i.lifecycleNote, createdAt: i.createdAt,
        votingEndsAt: i.votingEndsAt, game: i.gameName, author: i.author.username ?? i.author.name ?? "?",
        votes: count, average, supporters, helpers: i.interests.filter(x => x.kind === "HELP").length,
        needsAnswer: i.lifecycle === "REVIEW" || (i.lifecycle === "OPEN" && (supporters >= IDEA_SUPPORT_THRESHOLD || deadlinePassed)),
        waitingSince: waitingSince(i, supporters, deadlinePassed),
      };
    }),
  });
}

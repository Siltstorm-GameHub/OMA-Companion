import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { parseScreenshotUrls, isDuelMatch } from "@/lib/tournaments/matchSubmissions";
import ResultReviewClient, { type ReviewMatch } from "./ResultReviewClient";

export default async function AdminEventResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireModeratorOrEventSquadCaptain(id);

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true, title: true, statFields: true,
      matches: {
        where: { submissions: { some: {} } },
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: {
          entries: true,
          submissions: { include: { user: { select: { id: true, name: true, username: true, image: true } } }, orderBy: { createdAt: "asc" } },
        },
      },
      participants: { select: { user: { select: { id: true, name: true, username: true } } } },
    },
  });
  if (!event) notFound();

  const nameOf = new Map(event.participants.map(p => [p.user.id, p.user.username ?? p.user.name ?? "?"]));

  const matches: ReviewMatch[] = event.matches.map(m => ({
    id: m.id,
    label: m.title ?? `Runde ${m.round} · Match ${m.position}`,
    isDuel: isDuelMatch(m),
    player1: m.player1Id ? { id: m.player1Id, name: nameOf.get(m.player1Id) ?? "?" } : null,
    player2: m.player2Id ? { id: m.player2Id, name: nameOf.get(m.player2Id) ?? "?" } : null,
    current: m.playedAt ? { score1: m.score1, score2: m.score2 } : null,
    submissions: m.submissions.map(s => ({
      id: s.id,
      user: { id: s.user.id, name: s.user.username ?? s.user.name ?? "?" },
      status: s.status,
      score1: s.score1, score2: s.score2, placement: s.placement, score: s.score,
      stats: s.statsJson ? (JSON.parse(s.statsJson) as Record<string, number>) : {},
      note: s.note,
      reviewNote: s.reviewNote,
      screenshotUrls: parseScreenshotUrls(s.screenshotUrls),
      original: s.originalJson ? JSON.parse(s.originalJson) : null,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  // Offene zuerst
  matches.sort((a, b) => Number(b.submissions.some(s => s.status === "pending")) - Number(a.submissions.some(s => s.status === "pending")));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/admin/events/${event.id}/bracket`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-300">Ergebnis-Prüfung</span>
      </div>
      <ResultReviewClient
        eventId={event.id}
        matches={matches}
        statFields={event.statFields ? JSON.parse(event.statFields) : []}
      />
    </div>
  );
}

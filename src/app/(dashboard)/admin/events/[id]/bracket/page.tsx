import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SeriesIcon from "@/components/SeriesIcon";
import TournamentManager from "../../TournamentManager";

export default async function AdminEventBracketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true, icon: true, seriesStatConfig: true } },
        registrations: { select: { userId: true, role: true } },
        participants: {
          include: { user: { select: { id: true, name: true, username: true, image: true } } },
        },
        matches: {
          orderBy: [{ round: "asc" }, { position: "asc" }],
          include: { entries: true },
        },
        teams: { include: { members: { include: { user: { select: { id: true, name: true, username: true } } } } } },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!event) notFound();

  const registeredIds = new Set(event.registrations.filter(r => r.role !== "spectator").map(r => r.userId));
  const registeredUsers = allUsers.filter(u => registeredIds.has(u.id));

  const winnerStatKeys: string[] = (() => {
    if (!event.series?.seriesStatConfig) return [];
    try {
      const cfg = JSON.parse(event.series.seriesStatConfig) as { winnerStatKeys?: string[] };
      return cfg.winnerStatKeys ?? [];
    } catch { return []; }
  })();

  const tournament = event.format ? {
    id: event.id,
    status: event.tournamentStatus ?? "active",
    format: event.format,
    pointsConfig: event.pointsConfig,
    statFields: event.statFields,
    finalRankingJson: event.finalRankingJson,
    finalRankingNote: event.finalRankingNote,
    participants: event.participants,
    matches: event.matches,
  } : null;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {event.series ? (
          <Link href={`/admin/series/${event.series.id}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" />
            {event.series.name}
          </Link>
        ) : (
          <Link href="/admin/events" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Events
          </Link>
        )}
        <span>/</span>
        <Link href={`/admin/events/${event.id}`} className="hover:text-gray-300 transition-colors truncate max-w-[160px]">
          {event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-300">Turnierbaum</span>
      </div>

      <TournamentManager
        event={{ id: event.id }}
        tournament={tournament}
        allUsers={registeredUsers}
        winnerStatKeys={winnerStatKeys}
      />
    </div>
  );
}

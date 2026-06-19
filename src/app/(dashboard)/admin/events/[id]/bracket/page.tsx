import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Repeat } from "lucide-react";
import TournamentManager from "../../TournamentManager";

export default async function AdminEventBracketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const [event, allUsers] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        series: { select: { id: true, name: true } },
        registrations: { select: { userId: true } },
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

  const registeredIds = new Set(event.registrations.map(r => r.userId));
  const registeredUsers = allUsers.filter(u => registeredIds.has(u.id));

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
            <Repeat className="w-3.5 h-3.5 text-teal-500" />
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
      />
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Swords, Users, Trophy, Clock, ChevronRight } from "lucide-react";

const STATUS_STYLES: Record<string, { label: string; style: string; dot: string }> = {
  open:     { label: "Anmeldung offen", style: "bg-blue-900/50 text-blue-300",   dot: "bg-blue-400" },
  active:   { label: "Läuft",          style: "bg-green-900/50 text-green-300", dot: "bg-green-400" },
  closed:   { label: "Geschlossen",    style: "bg-amber-900/50 text-amber-300", dot: "bg-amber-400" },
  finished: { label: "Beendet",        style: "bg-gray-800 text-gray-500",      dot: "bg-gray-600" },
};

export default async function TournamentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // Alle Events bei denen der User angemeldet ist
  const registrations = await prisma.eventRegistration.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          _count: { select: { registrations: true } },
          tournament: {
            include: {
              _count: { select: { participants: true, matches: true } },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const upcomingEvents = registrations.filter(
    (r) => r.event.status !== "finished"
  );
  const pastEvents = registrations.filter(
    (r) => r.event.status === "finished"
  );

  if (registrations.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Swords className="w-5 h-5 text-rose-400" />
          <h1 className="text-xl font-semibold text-white">Meine Turniere & Events</h1>
        </div>
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <Swords className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 font-medium">Du bist noch bei keinem Event angemeldet.</p>
          <p className="text-gray-600 text-sm mt-1">Gehe zu Events und melde dich an.</p>
          <Link href="/events" className="inline-block mt-4 text-sm bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg transition-colors">
            Zu den Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Swords className="w-5 h-5 text-rose-400" />
        <h1 className="text-xl font-semibold text-white">Meine Turniere & Events</h1>
      </div>

      {upcomingEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Aktiv & Kommend</h2>
          <div className="space-y-2">
            {upcomingEvents.map(({ event }) => {
              const s = STATUS_STYLES[event.status] ?? STATUS_STYLES.finished;
              const hasTournament = !!event.tournament;
              return (
                <Link key={event.id} href={`/tournament/${event.id}`}
                  className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-colors group">
                  <div className="text-center w-12 shrink-0">
                    <p className="text-xl font-semibold text-white leading-none">{new Date(event.startAt).getDate()}</p>
                    <p className="text-xs text-gray-500 uppercase">{new Date(event.startAt).toLocaleString("de-DE", { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{event.title}</p>
                      {hasTournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {event.game && <span className="text-xs text-gray-500">{event.game}</span>}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3" />{event._count.registrations} Teilnehmer
                      </span>
                      {hasTournament && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Swords className="w-3 h-3" />{event.tournament!._count.matches} Matches
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.style}`}>{s.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Vergangene Events</h2>
          <div className="space-y-2 opacity-60">
            {pastEvents.map(({ event }) => (
              <Link key={event.id} href={`/tournament/${event.id}`}
                className="flex items-center gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-colors group">
                <div className="text-center w-12 shrink-0">
                  <p className="text-xl font-semibold text-white leading-none">{new Date(event.startAt).getDate()}</p>
                  <p className="text-xs text-gray-500 uppercase">{new Date(event.startAt).toLocaleString("de-DE", { month: "short" })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{event.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {event.game && <span className="text-xs text-gray-500">{event.game}</span>}
                    <span className="text-xs text-gray-500">{event._count.registrations} Teilnehmer</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-600">Beendet</span>
                  <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

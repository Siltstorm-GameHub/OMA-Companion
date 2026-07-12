import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Clock, CalendarClock, ArrowRight } from "lucide-react";
import ResetAllBalancesButton from "./ResetAllBalancesButton";
import WanderpocalRecomputeButton from "./WanderpocalRecomputeButton";

export default async function AdminPage() {
  const now = new Date();

  const [activeTournaments, overdueEvents] = await Promise.all([
    prisma.event.findMany({
      where: { tournamentStatus: { in: ["pending", "active"] } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, game: true, startAt: true, tournamentStatus: true },
    }),
    prisma.event.findMany({
      where: {
        tournamentStatus: null,
        status: { notIn: ["finished", "closed", "archived"] },
        startAt: { lt: now },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, game: true, startAt: true },
    }),
  ]);

  const hasActionItems = activeTournaments.length > 0 || overdueEvents.length > 0;

  return (
    <div className="space-y-6">
      {/* Action-Kacheln */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" /> Braucht Aufmerksamkeit
        </h2>

        {!hasActionItems && (
          <div className="card-shine glass rounded-2xl p-4 text-sm text-gray-400">
            Aktuell nichts zu tun — alle Events und Turniere sind auf dem neuesten Stand.
          </div>
        )}

        {activeTournaments.length > 0 && (
          <div className="space-y-2 mb-3">
            {activeTournaments.map(event => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}/bracket`}
                className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-amber-400 bg-amber-500/10 border-amber-500/15 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                    <p className="text-xs text-gray-400">
                      {event.tournamentStatus === "active" ? "Turnier läuft — Ergebnisse eintragen" : "Turnier bereit zum Start"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {overdueEvents.length > 0 && (
          <div className="space-y-2">
            {overdueEvents.map(event => (
              <Link
                key={event.id}
                href={`/admin/events/${event.id}`}
                className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/8 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-blue-400 bg-blue-500/10 border-blue-500/15 shrink-0">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                    <p className="text-xs text-gray-400">Vorbei, noch nicht abgeschlossen</p>
                  </div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Wartung */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔧 Datenbank-Wartung</h2>
        <div className="space-y-3">
          <WanderpocalRecomputeButton />
          <ResetAllBalancesButton />
        </div>
      </div>
    </div>
  );
}

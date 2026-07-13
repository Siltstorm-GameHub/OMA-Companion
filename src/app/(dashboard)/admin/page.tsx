import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Clock, CalendarClock, Vote, Clapperboard, ArrowRight, Zap } from "lucide-react";
import ResetAllBalancesButton from "./ResetAllBalancesButton";
import WanderpocalRecomputeButton from "./WanderpocalRecomputeButton";
import ActivityFeed from "./ActivityFeed";

const NOT_ACTIVE_STATUSES = ["finished", "closed", "archived"];

function formatCountdown(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "endet in Kürze";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `endet in ${days} Tg ${hours % 24} Std`;
  if (hours > 0) return `endet in ${hours} Std ${minutes % 60} Min`;
  return `endet in ${minutes} Min`;
}

export default async function AdminPage() {
  const now = new Date();

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [activeTournaments, pollPhaseEvents, overdueEvents, votingClipContests, votingYearlyContests, activeDailyPolls, recentActivity] = await Promise.all([
    prisma.event.findMany({
      where: {
        tournamentStatus: { in: ["pending", "active"] },
        status: { notIn: NOT_ACTIVE_STATUSES },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, game: true, startAt: true, tournamentStatus: true },
    }),
    prisma.event.findMany({
      where: { status: "umfrage" },
      orderBy: { startAt: "asc" },
      select: {
        id: true, title: true, game: true, startAt: true,
        polls: { where: { endAt: { gt: now } }, orderBy: { endAt: "desc" }, select: { endAt: true }, take: 1 },
      },
    }),
    prisma.event.findMany({
      where: {
        tournamentStatus: null,
        status: { notIn: [...NOT_ACTIVE_STATUSES, "umfrage"] },
        startAt: { lt: now },
      },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, game: true, startAt: true },
    }),
    prisma.monthlyClipContest.findMany({
      where: { status: "voting" },
      orderBy: { votingEndsAt: "asc" },
      select: { id: true, month: true, year: true, votingEndsAt: true },
    }),
    prisma.yearlyClipContest.findMany({
      where: { status: "voting" },
      orderBy: { votingEndsAt: "asc" },
      select: { id: true, year: true, votingEndsAt: true },
    }),
    prisma.dailyPoll.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gt: now } },
      orderBy: { endDate: "asc" },
      select: { id: true, title: true, endDate: true },
    }),
    prisma.pointTransaction.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, username: true } } },
    }),
  ]);

  const hasActionItems =
    activeTournaments.length > 0 ||
    pollPhaseEvents.length > 0 ||
    overdueEvents.length > 0 ||
    votingClipContests.length > 0 ||
    votingYearlyContests.length > 0 ||
    activeDailyPolls.length > 0;

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

        {pollPhaseEvents.length > 0 && (
          <div className="space-y-2 mb-3">
            {pollPhaseEvents.map(event => {
              const pollEndAt = event.polls[0]?.endAt;
              return (
                <Link
                  key={event.id}
                  href={`/admin/events/${event.id}/complete`}
                  className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/8 to-transparent pointer-events-none" />
                  <div className="relative flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-teal-400 bg-teal-500/10 border-teal-500/15 shrink-0">
                      <Vote className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                      <p className="text-xs text-gray-400">
                        Umfragephase läuft{pollEndAt ? ` — ${formatCountdown(pollEndAt, now)}` : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}

        {overdueEvents.length > 0 && (
          <div className="space-y-2 mb-3">
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

        {(votingClipContests.length > 0 || votingYearlyContests.length > 0) && (
          <div className="space-y-2">
            {votingClipContests.map(contest => (
              <Link
                key={contest.id}
                href="/admin/highlight-clips"
                className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-purple-400 bg-purple-500/10 border-purple-500/15 shrink-0">
                    <Clapperboard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Clip des Monats — {contest.month}/{contest.year}</p>
                    <p className="text-xs text-gray-400">Umfrage läuft — {formatCountdown(contest.votingEndsAt, now)}</p>
                  </div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
              </Link>
            ))}
            {votingYearlyContests.map(contest => (
              <Link
                key={contest.id}
                href="/admin/highlight-clips"
                className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-purple-400 bg-purple-500/10 border-purple-500/15 shrink-0">
                    <Clapperboard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Clip des Jahres — {contest.year}</p>
                    <p className="text-xs text-gray-400">Umfrage läuft — {formatCountdown(contest.votingEndsAt, now)}</p>
                  </div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {activeDailyPolls.length > 0 && (
          <div className="space-y-2 mt-3">
            {activeDailyPolls.map(poll => (
              <Link
                key={poll.id}
                href="/admin/daily-message"
                className="card-shine glass relative overflow-hidden rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/8 to-transparent pointer-events-none" />
                <div className="relative flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/15 shrink-0">
                    <Vote className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{poll.title}</p>
                    <p className="text-xs text-gray-400">
                      Umfrage läuft — {formatCountdown(poll.endDate, now)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="relative w-4 h-4 text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Münzen & Punkte Historie */}
      <div>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Münzen & Punkte — letzte 7 Tage
        </h2>
        <ActivityFeed transactions={recentActivity} />
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

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CalendarDays, ExternalLink, Users, Zap, Swords, Trophy, ChevronRight, Check, Repeat } from "lucide-react";
import SyncButton from "./SyncButton";
import RegisterButton from "./RegisterButton";
import EventCreateForm from "./EventCreateForm";
import EventAdminRow from "../admin/events/EventAdminRow";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import GameCover from "@/components/GameCover";

const STATUS_CONFIG: Record<string, { label: string; badge: string; bar: string; glow: string; dot: string }> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",             bar: "bg-blue-400",                             glow: "from-blue-500/5",    dot: "bg-blue-400"              },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",    bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", glow: "from-emerald-500/5", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",          bar: "bg-amber-400",                            glow: "from-amber-500/5",   dot: "bg-amber-400"             },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",          bar: "bg-gray-700",                             glow: "from-transparent",   dot: "bg-gray-600"              },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export default async function EventsPage() {
  const session = await auth();
  const userId  = session?.user?.id;
  const role    = (session?.user as { role?: string } | undefined)?.role ?? "user";
  const isMod   = role === "moderator" || role === "admin";

  const [eventsRaw, allUsers] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startAt: "asc" },
      include: {
        _count:        { select: { registrations: true } },
        series:        { select: { id: true, name: true } },
        tournament:    isMod ? {
          include: {
            participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
            matches:      { orderBy: [{ round: "asc" }, { position: "asc" }], include: { entries: true } },
            teams:        { include: { members: { include: { user: { select: { id: true, name: true, username: true } } } } } },
          },
        } : true,
        registrations: { select: { userId: true } },
      },
    }),
    isMod
      ? prisma.user.findMany({ select: { id: true, name: true, username: true, image: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  // Tournament counts (separate query to avoid nested _count issues)
  const tournamentIds = eventsRaw.map(e => e.tournament?.id).filter((id): id is string => !!id);
  const tournamentCounts = tournamentIds.length
    ? await Promise.all(
        tournamentIds.map(id =>
          Promise.all([
            prisma.tournamentParticipant.count({ where: { tournamentId: id } }),
            prisma.match.count({ where: { tournamentId: id } }),
          ]).then(([participants, matches]) => ({ id, participants, matches }))
        )
      )
    : [];
  const countMap = new Map(tournamentCounts.map(c => [c.id, c]));

  const events = eventsRaw.map(ev => ({
    ...ev,
    tournament: ev.tournament
      ? { ...ev.tournament, _count: countMap.get(ev.tournament.id) ?? { participants: 0, matches: 0 } }
      : null,
  }));

  // Aufteilen: aktiv vs. vergangen
  const activeEvents   = events.filter(e => e.status !== "finished");
  const finishedEvents = events.filter(e => e.status === "finished");

  // Pro Eventreihe nur das nächste (früheste) Event anzeigen
  const seenSeriesIds = new Set<string>();
  const visibleActiveEvents = activeEvents.filter(ev => {
    const sid = ev.seriesId;
    if (!sid) return true;            // Einzelevent → immer zeigen
    if (seenSeriesIds.has(sid)) return false;  // Serie bereits vertreten → überspringen
    seenSeriesIds.add(sid);
    return true;
  });

  const openCount = activeEvents.filter(e => e.status === "open" || e.status === "active").length;

  return (
    <div className="px-5 pb-5 pt-3 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Events</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            {openCount > 0
              ? <><span className="text-emerald-400 font-medium">{openCount}</span> aktive Events</>
              : "Alle Events"}
          </p>
        </div>
        {isMod && <SyncButton />}
      </div>

      {/* ── Admin-Tools ───────────────────────────────────────────────── */}
      {isMod && (
        <div className="space-y-3">
          <EventCreateForm />
          {activeEvents.length > 0 && (
            <div className="space-y-2">
              {activeEvents.map(ev => (
                <EventAdminRow key={ev.id} event={ev as Parameters<typeof EventAdminRow>[0]["event"]} allUsers={allUsers} />
              ))}
            </div>
          )}
          {finishedEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-1 pt-1">
                Vergangene Events (bearbeitbar)
              </p>
              {finishedEvents.map(ev => (
                <EventAdminRow key={ev.id} event={ev as Parameters<typeof EventAdminRow>[0]["event"]} allUsers={allUsers} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Kommende Events ───────────────────────────────────────────── */}
      <div className="space-y-3">
        {visibleActiveEvents.length === 0 && finishedEvents.length === 0 && (
          <EmptyState
            type="events"
            title="Noch keine Events"
            description="Events werden hier manuell eingetragen und automatisch zu Discord gepusht."
          />
        )}

        {visibleActiveEvents.map((ev, idx) => {
          const s            = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
          const isRegistered = userId
            ? (ev.registrations as { userId: string }[]).some(r => r.userId === userId)
            : false;
          const isFull       = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
          const canRegister  = ev.status === "open" || ev.status === "active";
          const isTournament = !!ev.tournament;
          const hasSeries    = !!ev.series;
          const discordUrl   = ev.discordEventId && GUILD_ID
            ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;
          const date = new Date(ev.startAt);

          return (
            <div key={ev.id}
              className="surface animate-slide-up relative overflow-hidden flex items-start gap-4 p-5"
              style={{
                borderRadius: 6,
                border: isRegistered ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                animationDelay: `${idx * 40}ms`,
              }}>

              {/* Farbbalken links */}
              <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${isRegistered ? "bg-emerald-400" : s.bar}`} />
              <div className={`absolute inset-0 bg-gradient-to-r ${isRegistered ? "from-emerald-500/4" : s.glow} to-transparent opacity-60 pointer-events-none`} />

              {/* Cover + Datum */}
              <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                <GameCover game={ev.game} className="w-20 h-[52px]" rounded="rounded-lg" />
                <div className="text-center">
                  <p className="text-sm font-bold text-white leading-none tabular-nums">{date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}</p>
                  <RelativeTime date={date} className="text-[9px] text-gray-600 mt-0.5 block tabular-nums" />
                </div>
              </div>

              {/* Inhalt */}
              <div className="relative flex-1 min-w-0">

                {/* Reihen-Badge */}
                {hasSeries && (
                  <Link href={`/events/series/${ev.seriesId}`}
                    className="flex items-center gap-1 mb-1 hover:text-teal-300 transition-colors group/series">
                    <Repeat className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-[10px] text-teal-400 font-medium group-hover/series:text-teal-300">{ev.series?.name}</span>
                    <span className="text-[10px] text-gray-600">· Eventreihe</span>
                  </Link>
                )}

                {/* Titel */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Link href={`/events/${ev.id}`}
                    className="font-semibold text-white text-base truncate hover:text-teal-300 transition-colors">
                    {ev.title}
                  </Link>
                  {isTournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {isRegistered && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                      <Check className="w-3 h-3" /> Angemeldet
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 flex-wrap">
                  {ev.game && <span className="text-xs text-gray-400 font-medium">{ev.game}</span>}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                    <Zap className="w-3 h-3" />+{ev.pointReward}
                  </span>
                  {discordUrl && (
                    <a href={discordUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-teal-400 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Discord
                    </a>
                  )}
                  {/* Link zum Turnierbaum */}
                  {isTournament && (
                    <Link href={`/tournament/${ev.id}`}
                      className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                      <Swords className="w-3 h-3" /> Turnierbaum
                    </Link>
                  )}
                  {/* Alle Termine dieser Reihe */}
                  {hasSeries && (
                    <Link href={`/events/series/${ev.seriesId}`}
                      className="flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-400 transition-colors">
                      <ChevronRight className="w-3 h-3" /> Reihe ansehen
                    </Link>
                  )}
                </div>
              </div>

              {/* Rechte Seite: Status + Anmelden */}
              <div className="relative flex flex-col items-end gap-2 shrink-0">
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {isFull && !isRegistered ? "Voll" : s.label}
                </span>
                {userId && canRegister && (
                  <RegisterButton
                    eventId={ev.id}
                    isRegistered={isRegistered}
                    isFull={isFull && !isRegistered}
                    discordEventUrl={discordUrl}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Vergangene Events ─────────────────────────────────────────── */}
      {finishedEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Vergangene Events</h2>
          </div>
          <div className="surface overflow-hidden divide-y divide-white/[0.04]" style={{ borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)" }}>
            {finishedEvents.map(ev => {
              const isTournament = !!ev.tournament;
              const hasSeries    = !!ev.series;
              const date         = new Date(ev.startAt);
              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 opacity-50 hover:opacity-100 transition-opacity group">
                  <GameCover game={ev.game} className="w-12 h-8" rounded="rounded-md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {hasSeries && <Repeat className="w-3 h-3 text-teal-700 shrink-0" />}
                      <p className="text-sm font-medium text-gray-400 truncate group-hover:text-white transition-colors">{ev.title}</p>
                      {isTournament && <Trophy className="w-3 h-3 text-gray-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {hasSeries && <span className="text-teal-800 mr-1.5">{ev.series?.name} ·</span>}
                      {date.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      {ev.game && <span className="ml-1.5">· {ev.game}</span>}
                      <span className="ml-1.5">· {ev._count.registrations} Teilnehmer</span>
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-gray-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

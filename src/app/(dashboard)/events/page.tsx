import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CalendarDays, ExternalLink, Users, Zap, Swords, Trophy, ChevronRight, Check } from "lucide-react";
import SyncButton from "./SyncButton";
import RegisterButton from "./RegisterButton";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

const STATUS_CONFIG: Record<string, {
  label: string; badge: string; bar: string; glow: string; dot: string;
}> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",             bar: "bg-blue-400",                          glow: "from-blue-500/5",    dot: "bg-blue-400"             },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",    bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", glow: "from-emerald-500/5", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",          bar: "bg-amber-400",                         glow: "from-amber-500/5",   dot: "bg-amber-400"            },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",          bar: "bg-gray-700",                          glow: "from-transparent",   dot: "bg-gray-600"             },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export default async function EventsPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  const [eventsRaw, myTournamentRegs] = await Promise.all([
    prisma.event.findMany({
      orderBy:  [{ status: "asc" }, { startAt: "asc" }],
      include:  {
        _count:     { select: { registrations: true } },
        tournament: true,
        ...(userId ? { registrations: { where: { userId } } } : {}),
      },
    }),
    userId
      ? prisma.eventRegistration.findMany({
          where:  { userId, event: { tournament: { isNot: null } } },
          select: { eventId: true },
        })
      : Promise.resolve([]),
  ]);

  // Tournament participant/match counts — separate query to avoid nested _count issues
  const tournamentIds = eventsRaw
    .map(e => e.tournament?.id)
    .filter((id): id is string => !!id);

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

  const registeredEventIds = new Set(myTournamentRegs.map(r => r.eventId));
  const openCount          = events.filter(e => e.status === "open" || e.status === "active").length;

  // Turniere aufteilen
  const tournamentEvents        = events.filter(ev => ev.tournament);
  const registeredTournaments   = tournamentEvents.filter(ev => registeredEventIds.has(ev.id));
  const openTournaments         = tournamentEvents.filter(
    ev => !registeredEventIds.has(ev.id) && (ev.status === "open" || ev.status === "active")
  );
  const finishedTournaments     = registeredTournaments.filter(ev => ev.status === "finished");
  const activeTournaments       = registeredTournaments.filter(ev => ev.status !== "finished");

  const hasTournamentSection = registeredTournaments.length > 0 || openTournaments.length > 0;

  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

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
              ? <><span className="text-emerald-400 font-medium">{openCount}</span> aktive Events · synchronisiert mit Discord</>
              : "Synchronisiert mit Discord"}
          </p>
        </div>
        <SyncButton />
      </div>

      {/* ── Turnier-Section ───────────────────────────────────────────── */}
      {hasTournamentSection && (
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Turniere</h2>
            {registeredTournaments.length > 0 && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                {registeredTournaments.length} angemeldet
              </span>
            )}
            {openTournaments.length > 0 && (
              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                {openTournaments.length} offen
              </span>
            )}
          </div>

          {/* ── Offene Turniere (noch nicht angemeldet) ─────────────────── */}
          {openTournaments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                Noch beitreten
              </p>
              <div className="space-y-2">
                {openTournaments.map(ev => {
                  const t    = ev.tournament!;
                  const date = new Date(ev.startAt);
                  const isFull = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
                  const discordEventUrl = ev.discordEventId && GUILD_ID
                    ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;

                  return (
                    <div key={ev.id}
                      className="card-shine glass flex items-center gap-4 rounded-2xl p-4 relative overflow-hidden border border-blue-500/15">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
                      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-blue-400" />

                      {/* Date */}
                      <div className="relative glass-heavy rounded-xl px-3 py-2.5 text-center min-w-[48px] shrink-0">
                        <p className="text-lg font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                          {date.toLocaleString("de-DE", { month: "short" })}
                        </p>
                        <RelativeTime date={date} className="text-[8px] text-gray-600 mt-1 block" />
                      </div>

                      {/* Info */}
                      <div className="relative flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <p className="font-semibold text-white truncate">{ev.title}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {ev.game && <span>{ev.game}</span>}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {t._count.participants}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
                          </span>
                          <span className="flex items-center gap-1 text-rose-400 font-semibold">
                            <Zap className="w-3 h-3" />+{ev.pointReward} Pts
                          </span>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="relative shrink-0">
                        {userId && (
                          <RegisterButton
                            eventId={ev.id}
                            isRegistered={false}
                            isFull={isFull}
                            discordEventUrl={discordEventUrl}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Angemeldete Turniere ─────────────────────────────────────── */}
          {registeredTournaments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Check className="w-3 h-3 text-emerald-400" />
                Angemeldet
              </p>
              <div className="space-y-2">

                {/* Aktive angemeldete Turniere */}
                {activeTournaments.map(ev => {
                  const t    = ev.tournament!;
                  const date = new Date(ev.startAt);
                  const statusCls =
                    ev.status === "active" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                    ev.status === "open"   ? "text-blue-400    bg-blue-500/10    border-blue-500/20"    :
                                             "text-amber-400   bg-amber-500/10   border-amber-500/20";
                  const statusLabel =
                    ev.status === "active" ? "Läuft" :
                    ev.status === "open"   ? "Offen" : "Geschlossen";
                  const dotCls =
                    ev.status === "active" ? "bg-emerald-400 animate-pulse" :
                    ev.status === "open"   ? "bg-blue-400" : "bg-amber-400";

                  return (
                    <Link key={ev.id} href={`/tournament/${ev.id}`}
                      className="card-hover card-shine glass flex items-center gap-4 rounded-2xl p-4 relative overflow-hidden group border border-emerald-500/15">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-emerald-400" />

                      {/* Angemeldet-Badge oben rechts */}
                      <div className="absolute top-3 right-10 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <Check className="w-3 h-3" /> Angemeldet
                      </div>

                      {/* Date */}
                      <div className="relative glass-heavy rounded-xl px-3 py-2.5 text-center min-w-[48px] shrink-0">
                        <p className="text-lg font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">
                          {date.toLocaleString("de-DE", { month: "short" })}
                        </p>
                        <RelativeTime date={date} className="text-[8px] text-gray-600 mt-1 block" />
                      </div>

                      {/* Info */}
                      <div className="relative flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <p className="font-semibold text-white truncate group-hover:text-rose-200 transition-colors">
                            {ev.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          {ev.game && <span>{ev.game}</span>}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />{t._count.participants} Teilnehmer
                          </span>
                          <span className="flex items-center gap-1">
                            <Swords className="w-3 h-3" />{t._count.matches} Matches
                          </span>
                        </div>
                      </div>

                      {/* Status + Arrow */}
                      <div className="relative flex items-center gap-2 shrink-0 mt-4">
                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${statusCls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotCls}`} />
                          {statusLabel}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                      </div>
                    </Link>
                  );
                })}

                {/* Vergangene angemeldete Turniere — kompakt */}
                {finishedTournaments.length > 0 && (
                  <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
                    {finishedTournaments.map(ev => (
                      <Link key={ev.id} href={`/tournament/${ev.id}`}
                        className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.025] transition-colors group opacity-55 hover:opacity-100">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-rose-300 transition-colors">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-600 border border-white/[0.06] px-2 py-0.5 rounded-full">Beendet</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-rose-400 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Event List ────────────────────────────────────────────────── */}
      <div>
        {hasTournamentSection && (
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Alle Events</h2>
          </div>
        )}

        <div className="space-y-3">
          {events.length === 0 && (
            <EmptyState
              type="events"
              title="Noch keine Events"
              description={'Events werden automatisch von Discord synchronisiert. Klicke auf "Discord sync" um sie zu laden.'}
            />
          )}

          {events.map((ev, idx) => {
            const s            = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
            const isRegistered = userId
              ? (ev.registrations as { userId: string }[])?.some(r => r.userId === userId)
              : false;
            const isFull       = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
            const canRegister  = ev.status === "open" || ev.status === "active";
            const isTournament = !!ev.tournament;

            const discordEventUrl = ev.discordEventId && GUILD_ID
              ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;

            const date = new Date(ev.startAt);

            return (
              <div key={ev.id}
                className={`card-hover card-shine glass rounded-2xl p-5 flex items-start gap-5 relative overflow-hidden group animate-slide-up ${
                  isRegistered ? "border border-emerald-500/10" : ""
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}>

                {/* Status accent left bar */}
                <div className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${
                  isRegistered ? "bg-emerald-400" : s.bar
                }`} />

                {/* Subtle glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${
                  isRegistered ? "from-emerald-500/4" : s.glow
                } to-transparent opacity-60 pointer-events-none`} />

                {/* ── Date badge ──────────────────────────────────────── */}
                <div className="relative glass-heavy rounded-xl px-3 py-2.5 text-center min-w-[52px] shrink-0">
                  <p className="text-xl font-bold text-white leading-none tabular-nums">{date.getDate()}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5 font-medium">
                    {date.toLocaleString("de-DE", { month: "short" })}
                  </p>
                  <RelativeTime date={date} className="text-[9px] text-gray-600 mt-1.5 block tabular-nums" />
                </div>

                {/* ── Content ─────────────────────────────────────────── */}
                <div className="relative flex-1 min-w-0">
                  {/* Title row — clean, no badge overload */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-semibold text-white text-base truncate group-hover:text-rose-200 transition-colors">
                      {ev.title}
                    </p>
                    {isTournament && <Swords className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    {isRegistered && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>

                  {/* Single meta row — only the essentials */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {ev.game && <span className="text-xs text-gray-400 font-medium">{ev.game}</span>}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Users className="w-3 h-3" />
                      {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                      <Zap className="w-3 h-3" />+{ev.pointReward}
                    </span>
                    {discordEventUrl && (
                      <a href={discordEventUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-rose-400 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Discord
                      </a>
                    )}
                  </div>
                </div>

                {/* ── Actions ─────────────────────────────────────────── */}
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
                      discordEventUrl={discordEventUrl}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

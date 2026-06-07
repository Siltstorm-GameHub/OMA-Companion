import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Users, Zap, ArrowLeft, Repeat, Trophy, ChevronRight, Check } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import RegisterButton from "../RegisterButton";

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",          dot: "bg-blue-400" },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",        dot: "bg-amber-400" },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",        dot: "bg-gray-600" },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId  = session?.user?.id;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      _count:        { select: { registrations: true } },
      tournament:    true,
      registrations: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
      series: {
        include: {
          events: {
            orderBy: { startAt: "desc" },
            include: {
              _count:     { select: { registrations: true } },
              tournament: { select: { id: true, status: true } },
              registrations: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
            },
          },
        },
      },
    },
  });

  if (!event) notFound();

  const s            = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.finished;
  const isRegistered = userId ? event.registrations.some(r => r.userId === userId) : false;
  const isFull       = !!(event.maxPlayers && event._count.registrations >= event.maxPlayers);
  const canRegister  = event.status === "open" || event.status === "active";
  const date         = new Date(event.startAt);
  const discordUrl   = event.discordEventId && GUILD_ID
    ? `https://discord.com/events/${GUILD_ID}/${event.discordEventId}` : null;

  const seriesEvents = event.series?.events ?? [];

  return (
    <div className="p-5 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* ── Back ─────────────────────────────────────────────────────── */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Events
      </Link>

      {/* ── Event-Karte ──────────────────────────────────────────────── */}
      <div className="glass card-shine rounded-2xl p-6 relative overflow-hidden"
        style={{ border: isRegistered ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full ${isRegistered ? "bg-emerald-400" : "bg-blue-400"}`} />

        {/* Series-Badge */}
        {event.series && (
          <div className="flex items-center gap-1.5 mb-3">
            <Repeat className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold">{event.series.name}</span>
            <span className="text-xs text-gray-600">· Eventreihe</span>
          </div>
        )}

        <div className="flex items-start gap-4">
          {/* Datum */}
          <div className="glass-heavy rounded-xl px-3 py-3 text-center min-w-[56px] shrink-0">
            <p className="text-2xl font-black text-white leading-none tabular-nums">{date.getDate()}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5 font-medium">
              {date.toLocaleString("de-DE", { month: "short" })}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">{date.getFullYear()}</p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{event.title}</h1>
              {event.tournament && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
              {isRegistered && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400 mb-3">
              {event.game && <span className="font-medium text-gray-300">{event.game}</span>}
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {date.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                {event._count.registrations}{event.maxPlayers ? ` / ${event.maxPlayers}` : ""} Teilnehmer
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                <Zap className="w-3.5 h-3.5" />+{event.pointReward} Punkte
              </span>
              <RelativeTime date={date} className="text-xs text-gray-600" />
            </div>
          </div>
        </div>

        {/* Beschreibung */}
        {event.description && (
          <p className="mt-4 text-sm text-gray-400 leading-relaxed whitespace-pre-line pl-1">
            {event.description.replace(/discord:[a-z0-9]+/gi, "").trim()}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          {userId && canRegister && (
            <RegisterButton eventId={event.id} isRegistered={isRegistered} isFull={isFull && !isRegistered} discordEventUrl={discordUrl} />
          )}
          {event.tournament && (
            <Link href={`/tournament/${event.id}`}
              className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-xl">
              <Trophy className="w-3.5 h-3.5" /> Turnierbaum ansehen
            </Link>
          )}
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-teal-400 transition-colors">
              In Discord ansehen ↗
            </a>
          )}
        </div>
      </div>

      {/* ── Eventreihe: Historie ─────────────────────────────────────── */}
      {event.series && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Reihe: {event.series.name}</h2>
            <span className="text-xs text-gray-600">{seriesEvents.length} Events insgesamt</span>
          </div>

          {event.series.description && (
            <p className="text-xs text-gray-500 ml-6">{event.series.description}</p>
          )}

          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {seriesEvents.map(ev => {
              const isCurrent   = ev.id === event.id;
              const evDate      = new Date(ev.startAt);
              const evStatus    = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
              const evRegistered = userId ? ev.registrations.some(r => r.userId === userId) : false;
              const isPast      = ev.status === "finished";

              return (
                <Link key={ev.id}
                  href={`/events/${ev.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3 transition-all group ${isCurrent ? "bg-teal-500/5" : "hover:bg-white/[0.025]"} ${isPast && !isCurrent ? "opacity-55 hover:opacity-100" : ""}`}>

                  {/* Datum */}
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-center ${isCurrent ? "bg-teal-500/15 border border-teal-500/25" : "bg-gray-800/60 border border-white/[0.06]"}`}>
                    <p className="text-xs font-bold text-white leading-none">{evDate.getDate()}</p>
                    <p className="text-[8px] text-gray-500 uppercase">{evDate.toLocaleString("de-DE", { month: "short" })}</p>
                    <p className="text-[7px] text-gray-600">{evDate.getFullYear()}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${isCurrent ? "text-teal-300" : "text-white group-hover:text-teal-300"} transition-colors`}>
                        {ev.title}
                        {isCurrent && <span className="text-[10px] text-teal-500 ml-1.5 font-normal">← dieses Event</span>}
                      </p>
                      {ev.tournament && <Trophy className="w-3 h-3 text-amber-500 shrink-0" />}
                      {evRegistered && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {evDate.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      {ev._count.registrations > 0 && ` · ${ev._count.registrations} Teilnehmer`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${evStatus.badge}`}>
                      {evStatus.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-teal-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import {
  CalendarDays, ExternalLink, Users, Zap, Swords, Trophy,
  ChevronRight, Check, Repeat, Gamepad2,
} from "lucide-react";
import RegisterButton from "./RegisterButton";
import SyncButton from "./SyncButton";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import GameCover from "@/components/GameCover";
import LulRegisterButton from "@/components/LulRegisterButton";
import { getGenreIcon } from "@/lib/genre-icons";
import EventCategoryBadge, { CATEGORY_BG_TINT } from "@/components/EventCategoryBadge";
import { EventCategory } from "@prisma/client";

const CATEGORY_STRIP: Record<EventCategory, string> = {
  competitive:     "bg-red-500",
  fun:             "bg-amber-400",
  casual:          "bg-emerald-500",
  training:        "bg-indigo-500",
  community_event: "bg-violet-500",
  special:         "bg-yellow-400",
};

const EVENT_STATUS: Record<string, { label: string; badge: string; bar: string; glow: string; dot: string }> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",             bar: "bg-blue-400",   glow: "from-blue-500/5",    dot: "bg-blue-400"              },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",    bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", glow: "from-emerald-500/5", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",          bar: "bg-amber-400",  glow: "from-amber-500/5",   dot: "bg-amber-400"             },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",          bar: "bg-gray-700",   glow: "from-transparent",   dot: "bg-gray-600"              },
};

const LUL_STATUS: Record<string, { label: string; badge: string; bar: string; dot: string }> = {
  upcoming: { label: "Geplant", badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",          bar: "bg-blue-400",   dot: "bg-blue-400"              },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", dot: "bg-emerald-400 animate-pulse" },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",       bar: "bg-gray-700",   dot: "bg-gray-600"              },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export default async function EventsPage() {
  const me     = await getSessionUser();
  const userId = me?.id;
  const isMod  = me?.role === "moderator" || me?.role === "admin";

  const [events, activeSeason] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startAt: "asc" },
      include: {
        _count:        { select: { registrations: true } },
        series:        { select: { id: true, name: true } },
        registrations: { select: { userId: true } },
      },
    }),
    prisma.lulSeason.findFirst({
      where: { status: "active" },
      include: {
        spieltage: {
          orderBy: { number: "asc" },
          include: { entries: { select: { userId: true, role: true } } },
        },
      },
    }),
  ]);

  type EventItem = { kind: "event"; date: Date; finished: boolean; ev: typeof events[number] };
  type LulItem   = { kind: "lul";   date: Date | null; finished: boolean; st: NonNullable<typeof activeSeason>["spieltage"][number]; seasonLabel: string };
  type AnyItem   = EventItem | LulItem;

  const seasonLabel = activeSeason?.name ?? (activeSeason ? `Saison ${activeSeason.number}` : "");

  const allItems: AnyItem[] = [
    ...events.map(ev => ({
      kind:     "event" as const,
      date:     new Date(ev.startAt),
      finished: ev.status === "finished",
      ev,
    })),
    ...(activeSeason?.spieltage ?? []).map(st => ({
      kind:     "lul" as const,
      date:     st.scheduledAt ? new Date(st.scheduledAt) : null,
      finished: st.status === "finished",
      st,
      seasonLabel,
    })),
  ];

  const upcomingItems = allItems
    .filter(i => !i.finished)
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  const finishedItems = allItems
    .filter(i => i.finished)
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));

  const openCount = upcomingItems.filter(i =>
    i.kind === "event"
      ? (i.ev.status === "open" || i.ev.status === "active")
      : i.st.status === "active"
  ).length;

  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">

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

      <div className="space-y-2">
        {upcomingItems.length === 0 && finishedItems.length === 0 && (
          <EmptyState
            type="events"
            title="Noch keine Events"
            description="Schau bald wieder vorbei – Events werden hier angekündigt."
          />
        )}

        {upcomingItems.map((item, idx) => {
          if (item.kind === "event") {
            const { ev } = item;
            const s            = EVENT_STATUS[ev.status] ?? EVENT_STATUS.finished;
            const isRegistered = userId
              ? (ev.registrations as { userId: string }[]).some(r => r.userId === userId)
              : false;
            const isFull       = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
            const canRegister  = ev.status === "open" || ev.status === "active";
            const isTournament = !!ev.format;
            const hasSeries    = !!ev.seriesId;
            const discordUrl   = ev.discordEventId && GUILD_ID
              ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;
            const date = item.date;

            return (
              <div key={`ev-${ev.id}`}
                className="surface animate-slide-up relative overflow-hidden flex items-start gap-4 p-5"
                style={{
                  borderRadius: 6,
                  border: isRegistered ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                  animationDelay: `${idx * 30}ms`,
                }}>
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${CATEGORY_STRIP[ev.category as EventCategory] ?? "bg-emerald-500"}`} />
                <div className={`absolute inset-0 ${CATEGORY_BG_TINT[ev.category as EventCategory] ?? ""} opacity-60 pointer-events-none`} />
                <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${isRegistered ? "bg-emerald-400" : s.bar}`} />
                <div className={`absolute inset-0 bg-gradient-to-r ${isRegistered ? "from-emerald-500/4" : s.glow} to-transparent opacity-60 pointer-events-none`} />
                <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                  <GameCover game={ev.game} className="w-20 h-[52px]" rounded="rounded-lg" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-white leading-none tabular-nums">
                      {date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}
                    </p>
                    <RelativeTime date={date} className="text-[9px] text-gray-600 mt-0.5 block tabular-nums" />
                  </div>
                </div>
                <div className="relative flex-1 min-w-0">
                  {hasSeries && (
                    <Link href={`/events/series/${ev.seriesId}`}
                      className="flex items-center gap-1 mb-1 hover:text-teal-300 transition-colors group/series">
                      <Repeat className="w-3 h-3 text-teal-400 shrink-0" />
                      <span className="text-[10px] text-teal-400 font-medium group-hover/series:text-teal-300">{ev.series?.name}</span>
                      <span className="text-[10px] text-gray-600">· Eventreihe</span>
                    </Link>
                  )}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Link href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/events/${ev.id}`}
                      className="font-semibold text-white text-base truncate hover:text-teal-300 transition-colors">
                      {ev.title}
                    </Link>
                    {isTournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {ev.category && <EventCategoryBadge category={ev.category as EventCategory} />}
                    {isRegistered && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                        <Check className="w-3 h-3" /> Angemeldet
                      </span>
                    )}
                  </div>
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
                    {isTournament && (
                      <Link href={`/tournament/${ev.id}`}
                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors">
                        <Swords className="w-3 h-3" /> Turnierbaum
                      </Link>
                    )}
                  </div>
                </div>
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
          }

          const { st } = item;
          const s           = LUL_STATUS[st.status] ?? LUL_STATUS.upcoming;
          const myEntry     = userId ? st.entries.find(e => e.userId === userId) : null;
          const myRole      = (myEntry?.role ?? null) as "player" | "spectator" | null;
          const playerCount = st.entries.filter(e => e.role === "player").length;
          const spectCount  = st.entries.filter(e => e.role === "spectator").length;
          const date        = item.date;
          const genreIcon   = getGenreIcon((st as { gameType?: string | null }).gameType);

          return (
            <div key={`lul-${st.id}`}
              className="surface animate-slide-up relative overflow-hidden flex items-start gap-4 p-5"
              style={{
                borderRadius: 6,
                border: myRole ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                animationDelay: `${idx * 30}ms`,
              }}>
              <div className={`absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full ${myRole ? "bg-amber-400" : s.bar}`} />
              <div className={`absolute inset-0 bg-gradient-to-r ${myRole ? "from-amber-500/5" : "from-transparent"} to-transparent opacity-60 pointer-events-none`} />
              <div className="relative shrink-0 flex flex-col items-center gap-1.5">
                <GameCover game={st.game} className="w-20 h-[52px]" rounded="rounded-lg" />
                {date ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-white leading-none tabular-nums">
                      {date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}
                    </p>
                    <RelativeTime date={date} className="text-[9px] text-gray-600 mt-0.5 block tabular-nums" />
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-600">Datum TBD</p>
                )}
              </div>
              <div className="relative flex-1 min-w-0">
                <Link href="/lul"
                  className="flex items-center gap-1 mb-1 hover:text-amber-300 transition-colors group/lul">
                  <Swords className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[10px] text-amber-400 font-medium group-hover/lul:text-amber-300">
                    Level-Up-League · {item.seasonLabel}
                  </span>
                </Link>
                <Link href={`/lul/spieltag/${st.id}`}
                  className="font-semibold text-white text-base truncate hover:text-amber-300 transition-colors block mb-1.5">
                  Spieltag {st.number}: {st.game}
                  {(st as { gameType?: string | null }).gameType && <span className="text-sm text-gray-500 font-normal ml-2">{(st as { gameType?: string | null }).gameType}</span>}
                </Link>
                <div className="flex items-center gap-3 flex-wrap">
                  {genreIcon && <img src={genreIcon.src} alt={genreIcon.alt} className="w-4 h-4 object-contain" />}
                  {(st as { platform?: string | null }).platform && <span className="text-xs text-gray-500">{(st as { platform?: string | null }).platform}</span>}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Gamepad2 className="w-3 h-3" />{playerCount} Mitspieler
                  </span>
                  {spectCount > 0 && (
                    <span className="text-xs text-gray-500">{spectCount} Zuschauer</span>
                  )}
                  {myRole && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                      <Check className="w-3 h-3" /> Angemeldet
                    </span>
                  )}
                  <Link href={`/lul/spieltag/${st.id}`}
                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-400 transition-colors">
                    <ChevronRight className="w-3 h-3" /> Details
                  </Link>
                </div>
              </div>
              <div className="relative flex flex-col items-end gap-2 shrink-0">
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                {userId && st.status !== "finished" && (
                  <LulRegisterButton spieltagId={st.id} currentRole={myRole} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {finishedItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 pb-1">
            <div className="h-px flex-1 bg-white/[0.05]" />
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Abgeschlossen</span>
            <div className="h-px flex-1 bg-white/[0.05]" />
          </div>

          {finishedItems.map(item => {
            if (item.kind === "event") {
              const { ev } = item;
              const discordUrl = ev.discordEventId && GUILD_ID
                ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;
              return (
                <div key={`ev-fin-${ev.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] opacity-50 hover:opacity-75 transition-opacity group">
                  <GameCover game={ev.game} className="w-9 h-6 shrink-0" rounded="rounded" />
                  <div className="flex-1 min-w-0">
                    <Link href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/events/${ev.id}`}
                      className="text-sm text-gray-400 font-medium truncate block group-hover:text-gray-300 transition-colors">
                      {ev.title}
                    </Link>
                    <p className="text-[10px] text-gray-600">
                      {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                      {ev.series && <> · {ev.series.name}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[10px] text-gray-600">
                      <Users className="w-3 h-3" />{ev._count.registrations}
                    </span>
                    {discordUrl && (
                      <a href={discordUrl} target="_blank" rel="noopener noreferrer"
                        className="text-gray-700 hover:text-gray-500 transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-[10px] text-gray-600 bg-gray-800/60 border border-white/[0.04] px-1.5 py-0.5 rounded">
                      Beendet
                    </span>
                  </div>
                </div>
              );
            }

            const { st } = item;
            return (
              <div key={`lul-fin-${st.id}`}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] opacity-50 hover:opacity-75 transition-opacity group">
                <div className="w-9 h-6 shrink-0 flex items-center justify-center rounded bg-amber-900/20">
                  <Swords className="w-3.5 h-3.5 text-amber-900/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/lul/spieltag/${st.id}`}
                    className="text-sm text-gray-400 font-medium truncate block group-hover:text-gray-300 transition-colors">
                    Spieltag {st.number}: {st.game}
                  </Link>
                  <p className="text-[10px] text-gray-600">
                    Level-Up-League · {item.seasonLabel}
                    {st.scheduledAt && <> · {new Date(st.scheduledAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-[10px] text-gray-600">
                    <Gamepad2 className="w-3 h-3" />{st.entries.filter(e => e.role === "player").length}
                  </span>
                  <span className="text-[10px] text-gray-600 bg-gray-800/60 border border-white/[0.04] px-1.5 py-0.5 rounded">
                    Beendet
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

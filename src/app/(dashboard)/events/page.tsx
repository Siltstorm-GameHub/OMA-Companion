import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import {
  CalendarDays, ExternalLink, Users, Swords, Trophy,
  ChevronRight, Check, Gamepad2, Clapperboard,
} from "lucide-react";
import SeriesIcon from "@/components/SeriesIcon";
import { resolveSeriesColor } from "@/lib/series-icons";
import RegisterButton from "./RegisterButton";
import SyncButton from "./SyncButton";
import StreamRegisterButton from "@/components/StreamRegisterButton";
import CoinIcon from "@/components/CoinIcon";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import GameCover from "@/components/GameCover";
import EventCardLink from "./EventCardLink";
import LulRegisterButton from "@/components/LulRegisterButton";
import { getGenreIcon } from "@/lib/genre-icons";
import EventCategoryBadge, { CATEGORY_BG_TINT } from "@/components/EventCategoryBadge";
import { EventCategory } from "@prisma/client";
import { EyeOff } from "lucide-react";
import { getEventEndedAt, RECENTLY_FINISHED_MS } from "@/lib/event-completion";

const CATEGORY_STRIP: Record<EventCategory, string> = {
  competitive:     "bg-red-500",
  fun:             "bg-amber-400",
  casual:          "bg-emerald-500",
  training:        "bg-indigo-500",
  community_event: "bg-violet-500",
  special:         "bg-yellow-400",
};

const EVENT_STATUS: Record<string, { label: string; badge: string; bar: string; glow: string; dot: string }> = {
  open:     { label: "Offen",         badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",             bar: "bg-blue-400",   glow: "from-blue-500/5",    dot: "bg-blue-400"              },
  active:   { label: "Läuft",         badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",    bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", glow: "from-emerald-500/5", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",          badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",          bar: "bg-amber-400",  glow: "from-amber-500/5",   dot: "bg-amber-400"             },
  umfrage:  { label: "Umfragephase",  badge: "text-violet-300 bg-violet-500/10 border border-violet-500/20",       bar: "bg-violet-400", glow: "from-violet-500/5",  dot: "bg-violet-400 animate-pulse" },
  finished: { label: "Beendet",       badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",          bar: "bg-gray-700",   glow: "from-transparent",   dot: "bg-gray-600"              },
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

  const [events, hiddenEvents, activeSeason] = await Promise.all([
    prisma.event.findMany({
      where:   { hidden: false, OR: [{ seriesId: null }, { series: { hidden: false } }] },
      orderBy: { startAt: "asc" },
      include: {
        _count:        { select: { registrations: true } },
        series:        { select: { id: true, name: true, icon: true } },
        registrations: { select: { userId: true } },
        streamingPartners: { include: { partner: { select: { userId: true } } } },
        communityStreamers: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
      },
    }),
    isMod
      ? prisma.event.findMany({
          where:   { OR: [{ hidden: true }, { series: { hidden: true } }] },
          orderBy: { startAt: "desc" },
          include: {
            _count: { select: { registrations: true } },
            series: { select: { id: true, name: true, icon: true } },
          },
        })
      : Promise.resolve([]),
    // Nur alte Saisons ohne EventSeries-Link (neue erscheinen als normale Events)
    prisma.lulSeason.findFirst({
      where: { status: "active", seriesId: null },
      include: {
        spieltage: {
          orderBy: { number: "asc" },
          include: { entries: { select: { userId: true, role: true } } },
        },
      },
    }),
  ]);

  type EventItem = { kind: "event"; date: Date; finished: boolean; endedAt: number; ev: typeof events[number] };
  type LulItem   = { kind: "lul";   date: Date | null; finished: boolean; endedAt: number; st: NonNullable<typeof activeSeason>["spieltage"][number]; seasonLabel: string };
  type AnyItem   = EventItem | LulItem;

  const seasonLabel = activeSeason?.name ?? (activeSeason ? `Saison ${activeSeason.number}` : "");

  const allItems: AnyItem[] = [
    ...events.map(ev => ({
      kind:     "event" as const,
      date:     new Date(ev.startAt),
      finished: ev.status === "finished",
      endedAt:  getEventEndedAt(ev).getTime(),
      ev,
    })),
    ...(activeSeason?.spieltage ?? []).map(st => ({
      kind:     "lul" as const,
      date:     st.scheduledAt ? new Date(st.scheduledAt) : null,
      finished: st.status === "finished",
      endedAt:  st.scheduledAt ? new Date(st.scheduledAt).getTime() : 0,
      st,
      seasonLabel,
    })),
  ];

  const now = Date.now();
  const isRecentlyFinished = (i: AnyItem) => i.finished && (now - i.endedAt) <= RECENTLY_FINISHED_MS;

  // Kürzlich (≤3 Tage) beendete Events bleiben ganz oben sichtbar, damit Nutzer die Ergebnisse
  // nicht verpassen — erst danach wandern sie in den eingeklappten "Abgeschlossen"-Bereich.
  const recentFinishedItems = allItems
    .filter(isRecentlyFinished)
    .sort((a, b) => b.endedAt - a.endedAt);

  const upcomingItems = allItems
    .filter(i => !i.finished)
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  const finishedItems = allItems
    .filter(i => i.finished && !isRecentlyFinished(i))
    .sort((a, b) => b.endedAt - a.endedAt);

  const openCount = upcomingItems.filter(i =>
    i.kind === "event"
      ? (i.ev.status === "open" || i.ev.status === "active")
      : i.st.status === "active"
  ).length;

  // Anstehende Events nach Monat gruppieren, damit die Liste bei vielen
  // Events pro Monat nicht unübersichtlich wird (Monate sind über Sticky-Header abgrenzbar).
  const MONTH_FORMATTER = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
  const monthKey = (d: Date | null) => d ? `${d.getFullYear()}-${d.getMonth()}` : "tbd";
  const monthLabel = (d: Date | null) => {
    if (!d) return "Termin TBD";
    const label = MONTH_FORMATTER.format(d);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  const upcomingGroups: { key: string; label: string; items: AnyItem[] }[] = [];
  for (const item of upcomingItems) {
    const key = monthKey(item.date);
    let group = upcomingGroups.find(g => g.key === key);
    if (!group) {
      group = { key, label: monthLabel(item.date), items: [] };
      upcomingGroups.push(group);
    }
    group.items.push(item);
  }

  const renderItem = (item: AnyItem, idx: number) => {
    if (item.kind === "event") {
      const { ev } = item;
      const s            = EVENT_STATUS[ev.status] ?? EVENT_STATUS.finished;
      const isRegistered = userId
        ? (ev.registrations as { userId: string }[]).some(r => r.userId === userId)
        : false;
      const isFull       = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
      const canRegister  = ev.status === "open" || ev.status === "active";
      const isPartnerStreamer = userId
        ? (ev as unknown as { streamingPartners: { partner: { userId: string | null } }[] }).streamingPartners.some(sp => sp.partner.userId === userId)
        : false;
      const isCommunityStreamer = userId
        ? (ev as unknown as { communityStreamers: { userId: string }[] }).communityStreamers.length > 0
        : false;
      const isTournament = !!ev.format;
      const hasSeries    = !!ev.seriesId;
      const seriesColor  = resolveSeriesColor(ev.series?.icon);
      const cardHref     = hasSeries ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`;
      const discordUrl   = ev.discordEventId && GUILD_ID
        ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}` : null;
      const date = item.date;

      return (
        <EventCardLink key={`ev-${ev.id}`}
          href={cardHref}
          className="surface animate-slide-up group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
          style={{
            borderRadius: 6,
            border: isRegistered ? "1px solid rgba(52,211,153,0.18)" : "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
            animationDelay: `${idx * 30}ms`,
          }}>
          <div className="relative overflow-hidden" style={{ height: 108 }}>
            <GameCover game={ev.game} className="absolute inset-0 w-full h-full" rounded="rounded-none"
              imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700" />
            <div className={`absolute inset-0 ${CATEGORY_BG_TINT[ev.category as EventCategory] ?? ""} opacity-70 pointer-events-none`} />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent 35%, rgba(11,13,18,0.9) 100%)" }} />
            <div className={`absolute top-0 left-0 right-0 h-[2px] ${CATEGORY_STRIP[ev.category as EventCategory] ?? "bg-emerald-500"}`} />
            <span className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium ${s.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {isFull && !isRegistered ? "Voll" : s.label}
            </span>
            {isRegistered && (
              <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 rounded-full font-medium">
                <Check className="w-3 h-3" /> Angemeldet
              </span>
            )}
            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
              <p className="text-xs font-bold text-white leading-none tabular-nums">
                {date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}
              </p>
              <RelativeTime date={date} className="text-[9px] text-gray-300 tabular-nums" />
            </div>
          </div>
          <div className="px-4 pb-4 pt-3">
            {hasSeries && (
              <Link href={`/events/series/${ev.seriesId}`}
                className="relative z-10 flex items-center gap-1 mb-1 transition-opacity hover:opacity-80 group/series">
                <SeriesIcon name={ev.series?.icon} className="w-3 h-3 shrink-0" />
                <span className="text-[10px] font-medium" style={{ color: seriesColor }}>{ev.series?.name}</span>
                <span className="text-[10px] text-gray-600">· Eventreihe</span>
              </Link>
            )}
            <div className="flex items-center gap-2 mb-1.5">
              <p className="font-semibold text-white text-sm truncate flex-1 min-w-0">{ev.title}</p>
              {isTournament && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {ev.category && <EventCategoryBadge category={ev.category as EventCategory} />}
              {ev.game && <span className="text-[11px] text-gray-400 font-medium truncate">{ev.game}</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                +{ev.pointReward} <CoinIcon size={12} />
              </span>
              {discordUrl && (
                <a href={discordUrl} target="_blank" rel="noopener noreferrer"
                  className="relative z-10 flex items-center gap-1 text-gray-600 hover:text-teal-400 transition-colors ml-auto">
                  <ExternalLink className="w-3 h-3" /> Discord
                </a>
              )}
            </div>
            {userId && canRegister && (
              <div className="relative z-10 flex items-center gap-2 flex-wrap">
                <RegisterButton
                  eventId={ev.id}
                  isRegistered={isRegistered}
                  isFull={isFull && !isRegistered}
                  discordEventUrl={discordUrl}
                />
                {!isPartnerStreamer && (
                  <StreamRegisterButton eventId={ev.id} isStreaming={isCommunityStreamer} />
                )}
              </div>
            )}
          </div>
        </EventCardLink>
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
        className="surface animate-slide-up group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1"
        style={{
          borderRadius: 6,
          border: myRole ? "1px solid rgba(251,191,36,0.18)" : "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
          animationDelay: `${idx * 30}ms`,
        }}>
        <div className="relative overflow-hidden" style={{ height: 108 }}>
          <GameCover game={st.game} className="absolute inset-0 w-full h-full" rounded="rounded-none"
            imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent 35%, rgba(11,13,18,0.9) 100%)" }} />
          <span className={`absolute top-2.5 left-2.5 flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full font-medium ${s.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
          {myRole && (
            <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-1 rounded-full font-medium">
              <Check className="w-3 h-3" /> Angemeldet
            </span>
          )}
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
            {date ? (
              <>
                <p className="text-xs font-bold text-white leading-none tabular-nums">
                  {date.getDate()}. {date.toLocaleString("de-DE", { month: "short" })}
                </p>
                <RelativeTime date={date} className="text-[9px] text-gray-300 tabular-nums" />
              </>
            ) : (
              <p className="text-[10px] text-gray-300">Datum TBD</p>
            )}
          </div>
        </div>
        <div className="px-4 pb-4 pt-3">
          <Link href="/lul"
            className="relative z-10 flex items-center gap-1 mb-1 hover:text-amber-300 transition-colors group/lul">
            <Swords className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-400 font-medium group-hover/lul:text-amber-300">
              Level-Up-League · {item.seasonLabel}
            </span>
          </Link>
          <Link href={`/lul/spieltag/${st.id}`}
            className="relative z-10 font-semibold text-white text-sm truncate hover:text-amber-300 transition-colors block mb-1.5">
            Spieltag {st.number}: {st.game}
            {(st as { gameType?: string | null }).gameType && <span className="text-xs text-gray-500 font-normal ml-2">{(st as { gameType?: string | null }).gameType}</span>}
          </Link>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {genreIcon && <img src={genreIcon.src} alt={genreIcon.alt} className="w-4 h-4 object-contain" />}
            {(st as { platform?: string | null }).platform && <span className="text-[11px] text-gray-500">{(st as { platform?: string | null }).platform}</span>}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3 h-3" />{playerCount} Mitspieler
            </span>
            {spectCount > 0 && <span>{spectCount} Zuschauer</span>}
            <Link href={`/lul/spieltag/${st.id}`}
              className="relative z-10 flex items-center gap-1 text-amber-600 hover:text-amber-400 transition-colors ml-auto">
              <ChevronRight className="w-3 h-3" /> Details
            </Link>
          </div>
          {userId && st.status !== "finished" && (
            <div className="relative z-10">
              <LulRegisterButton spieltagId={st.id} currentRole={myRole} />
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <div className="flex items-center gap-2">
          <Link href="/clip-des-monats"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-[#9146ff]/20 hover:border-[#9146ff]/40 transition-colors group text-sm">
            <Clapperboard className="w-3.5 h-3.5 text-[#9146ff]" />
            <span className="text-gray-300 group-hover:text-white transition-colors">Clip des Monats</span>
          </Link>
          {isMod && <SyncButton />}
        </div>
      </div>

      <div className="space-y-2">
        {recentFinishedItems.length === 0 && upcomingItems.length === 0 && finishedItems.length === 0 && (
          <EmptyState
            type="events"
            title="Noch keine Events"
            description="Schau bald wieder vorbei – Events werden hier angekündigt."
          />
        )}

        {recentFinishedItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 pb-2">
              <div className="h-px flex-1 bg-emerald-500/10" />
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Kürzlich beendet</span>
              <div className="h-px flex-1 bg-emerald-500/10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFinishedItems.map((item, idx) => renderItem(item, idx))}
            </div>
          </div>
        )}

        {upcomingGroups.map(group => (
          <div key={group.key} className="mb-4 last:mb-0">
            <div className="sticky top-0 z-10 flex items-center gap-3 py-1.5 -mx-5 px-5 sm:mx-0 sm:px-0 bg-[#0b0d12]/90 backdrop-blur">
              <span className="text-xs font-semibold text-gray-300 tracking-wide">{group.label}</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {group.items.map((item, idx) => renderItem(item, idx))}
            </div>
          </div>
        ))}
      </div>


      {isMod && hiddenEvents.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 pb-1">
            <div className="h-px flex-1 bg-rose-500/10" />
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-400 uppercase tracking-widest">
              <EyeOff className="w-3 h-3" /> Ausgeblendet · nur für Admins/Mods sichtbar
            </span>
            <div className="h-px flex-1 bg-rose-500/10" />
          </div>

          {hiddenEvents.map(ev => (
            <Link key={`hidden-${ev.id}`}
              href={ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.07] transition-colors group">
              <GameCover game={ev.game} className="w-9 h-6 shrink-0" rounded="rounded" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-300 font-medium truncate group-hover:text-white transition-colors">
                  {ev.title}
                </p>
                <p className="text-[10px] text-gray-600">
                  {new Date(ev.startAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                  {ev.series && <> · {ev.series.name}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[10px] text-gray-600">
                  <Users className="w-3 h-3" />{ev._count.registrations}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                  <EyeOff className="w-2.5 h-2.5" /> Ausgeblendet
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

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
              const cardHref = ev.seriesId ? `/events/series/${ev.seriesId}` : `/tournament/${ev.id}`;
              return (
                <EventCardLink key={`ev-fin-${ev.id}`}
                  href={cardHref}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] opacity-50 hover:opacity-75 transition-opacity group">
                  <GameCover game={ev.game} className="w-9 h-6 shrink-0" rounded="rounded" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/tournament/${ev.id}`}
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
                </EventCardLink>
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

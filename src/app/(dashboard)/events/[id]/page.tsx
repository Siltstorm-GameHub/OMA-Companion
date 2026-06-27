import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Users, ArrowLeft, Repeat, Trophy, ChevronRight, Check, Clock, Vote, Tv2, Clapperboard } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import ClientTime from "@/components/ClientTime";
import { RelativeTime } from "@/components/RelativeTime";
import RegisterButton from "../RegisterButton";
import EventSummarySection from "@/components/EventSummarySection";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import { EventCategory } from "@prisma/client";
import SpectatorRegisterButton from "./SpectatorRegisterButton";
import EventLiveBadge from "./EventLiveBadge";
import ClipSubmitter from "./ClipSubmitter";
import StreamRegisterButton from "@/components/StreamRegisterButton";

const GENRE_MAP: Record<string, { label: string; icon: string }> = {
  arcade:    { label: "Arcade",     icon: "/Arcade Icon.png" },
  beat_em_up:{ label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  sport:     { label: "Sport",      icon: "/Sport Icon.png" },
  racing:    { label: "Racing",     icon: "/Racing Icon.png" },
  shooter:   { label: "Shooter",    icon: "/Shooter Icon.png" },
  community: { label: "Community",  icon: "/Community Icon.png" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  open:     { label: "Offen",       badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",          dot: "bg-blue-400"                  },
  active:   { label: "Läuft",       badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", dot: "bg-emerald-400 animate-pulse"  },
  umfrage:  { label: "Abstimmung",  badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",       dot: "bg-amber-400 animate-pulse"   },
  finished: { label: "Beendet",     badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",        dot: "bg-gray-600"                  },
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
      registrations: userId ? { where: { userId }, select: { userId: true, role: true } } : { select: { userId: true, role: true }, take: 0 },
      streamingPartners: { include: { partner: { include: { user: { select: { id: true } } } } } },
      communityStreamers: { include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true } } } },
      clipSubmissions: userId ? { where: { userId }, select: { clipUrl: true } } : false,
      series: {
        include: {
          events: {
            orderBy: { startAt: "asc" },
            include: {
              _count:        { select: { registrations: true } },
              registrations: userId ? { where: { userId }, select: { userId: true } } : { select: { userId: true }, take: 0 },
            },
          },
        },
      },
    },
  });

  if (!event) notFound();

  const s            = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.finished;
  const myReg        = userId ? event.registrations.find(r => r.userId === userId) : null;
  const isRegistered = !!myReg && myReg.role !== "spectator";
  const isSpectator  = !!myReg && myReg.role === "spectator";
  const isFull       = !!(event.maxPlayers && event._count.registrations >= event.maxPlayers);
  const canRegister  = event.status === "open" || event.status === "active";
  const date         = new Date(event.startAt);
  const TZ           = "Europe/Berlin";
  const fmtDate      = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleString("de-DE", { timeZone: TZ, ...opts });
  const discordUrl   = event.discordEventId && GUILD_ID
    ? `https://discord.com/events/${GUILD_ID}/${event.discordEventId}` : null;

  // Discord-Kanal-Link für Abstimmungsphase
  const channelId = event.discordChannelId ?? event.series?.discordChannelId ?? null;
  const discordChannelUrl = channelId && GUILD_ID
    ? `https://discord.com/channels/${GUILD_ID}/${channelId}` : null;

  // Poll config
  const pollConfig: { enabled: boolean; question: string } | null = (() => {
    const raw = event.pollConfigJson ?? event.series?.pollConfigJson;
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();

  // 1. Platz Belohnung aus placementRewardsJson
  const rewardsData: { placements?: { place: number; coins: number; rankPoints: number }[] } | null = (() => {
    const raw = (event as unknown as Record<string, unknown>).placementRewardsJson;
    if (!raw) return null;
    try { return (typeof raw === "string" ? JSON.parse(raw) : raw) as { placements?: { place: number; coins: number; rankPoints: number }[] }; } catch { return null; }
  })();
  const firstPlace = rewardsData?.placements?.find(p => p.place === 1) ?? null;

  // Genre + Streaming-Partner
  const genre = (event as unknown as Record<string, unknown>).genre as string | null | undefined;
  const genreInfo = genre ? (GENRE_MAP[genre] ?? null) : null;
  type PartnerEntry = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string; user?: { id: string } | null } };
  type CommunityStreamerEntry = { user: { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null } };
  const streamingPartners = (event as unknown as { streamingPartners?: PartnerEntry[] }).streamingPartners ?? [];
  const communityStreamers = (event as unknown as { communityStreamers?: CommunityStreamerEntry[] }).communityStreamers ?? [];

  // Check if current user is already a partner streamer (linked via Partner.userId)
  const isPartnerStreamer = userId ? streamingPartners.some(sp => sp.partner.user?.id === userId) : false;
  // Check if current user is already a community streamer
  const isCommunityStreamer = userId ? communityStreamers.some(cs => cs.user.id === userId) : false;
  // Show stream register button only for logged-in users on open/active events who are not partner streamers
  const canStreamRegister = !!userId && canRegister && !isPartnerStreamer;

  // Combined streamers for display (community streamers not already in partners)
  const partnerUserIds = new Set(streamingPartners.map(sp => sp.partner.user?.id).filter(Boolean));
  const filteredCommunityStreamers = communityStreamers.filter(cs => !partnerUserIds.has(cs.user.id));

  // Server-Fallback für Uhrzeit (client-side überschrieben durch ClientTime)
  const serverTimeFallback = fmtDate(date, { hour: "2-digit", minute: "2-digit" });

  // Reihen-Events aufteilen: kommende vs. vergangene (ohne dieses Event)
  const allSeriesEvents = event.series?.events ?? [];
  const now = new Date();
  const upcomingInSeries = allSeriesEvents.filter(e => e.id !== id && e.status !== "finished");
  const pastInSeries     = allSeriesEvents.filter(e => e.id !== id && e.status === "finished")
                                          .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div className="p-5 sm:p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">

      {/* ── Back ─────────────────────────────────────────────────────── */}
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-400 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Events
      </Link>

      {/* ── Event-Karte ──────────────────────────────────────────────── */}
      <div className="glass card-shine rounded-2xl p-6 relative overflow-hidden"
        style={{ border: isRegistered ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(255,255,255,0.06)" }}>
        <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full ${isRegistered ? "bg-emerald-400" : s.dot.replace("animate-pulse", "")}`} />

        {/* Series-Badge */}
        {event.series && (
          <Link href={`/events/series/${event.seriesId}`}
            className="flex items-center gap-1.5 mb-3 hover:opacity-80 transition-opacity group">
            <Repeat className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs text-teal-400 font-semibold group-hover:text-teal-300">{event.series.name}</span>
            <span className="text-xs text-gray-600">· Eventreihe →</span>
          </Link>
        )}

        <div className="flex items-start gap-4">
          {/* Datum-Box */}
          <div className="glass-heavy rounded-xl px-3 py-3 text-center min-w-[56px] shrink-0">
            <p className="text-2xl font-black text-white leading-none tabular-nums">{fmtDate(date, { day: "numeric" })}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5 font-medium">
              {fmtDate(date, { month: "short" })}
            </p>
            <p className="text-[10px] text-gray-600 mt-0.5">{fmtDate(date, { year: "numeric" })}</p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-white">{event.title}</h1>
              {event.format && <Trophy className="w-4 h-4 text-amber-400 shrink-0" />}
              {event.category && <EventCategoryBadge category={event.category as EventCategory} />}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-sm text-gray-400 mb-3">
              {event.game && (
                <span className="flex items-center gap-1.5 font-medium text-gray-300">
                  {genreInfo && (
                    <Image src={genreInfo.icon} alt={genreInfo.label} width={15} height={15} className="object-contain shrink-0" />
                  )}
                  {event.game}
                  {genreInfo && <span className="text-gray-600 text-xs font-normal">· {genreInfo.label}</span>}
                </span>
              )}
              {!event.game && genreInfo && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Image src={genreInfo.icon} alt={genreInfo.label} width={14} height={14} className="object-contain" />
                  {genreInfo.label}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs">
                <CalendarDays className="w-3.5 h-3.5" />
                {fmtDate(date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                <ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} />
                {" Uhr"}
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
              {firstPlace && (firstPlace.coins > 0 || firstPlace.rankPoints > 0) && (
                <span className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold border border-amber-500/20 bg-amber-500/[0.08] rounded-full px-2.5 py-1">
                  <span className="text-[11px]">🥇</span>
                  {firstPlace.coins > 0 && (
                    <>
                      <Image src="/Muenze Icon.png" alt="Münzen" width={13} height={13} className="object-contain shrink-0" />
                      <span>{firstPlace.coins}</span>
                    </>
                  )}
                  {firstPlace.coins > 0 && firstPlace.rankPoints > 0 && (
                    <span className="text-amber-800 font-normal">·</span>
                  )}
                  {firstPlace.rankPoints > 0 && (
                    <>
                      <RankPointsIcon size={13} />
                      <span>{firstPlace.rankPoints}</span>
                    </>
                  )}
                </span>
              )}
              {isRegistered && (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" /> Angemeldet
                </span>
              )}
              <RelativeTime date={date} className="text-xs text-gray-600" />
            </div>
          </div>
        </div>

        {/* Beschreibung */}
        {event.description && (
          <p className="mt-4 text-sm text-gray-400 leading-relaxed whitespace-pre-line pl-1">
            {event.description}
          </p>
        )}

        {/* Streaming-Partner + Community-Streamer + Live-Badge */}
        {(streamingPartners.length > 0 || filteredCommunityStreamers.length > 0) && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Tv2 className="w-3.5 h-3.5 text-[#9146ff] shrink-0" />
              <span className="text-xs text-gray-500 font-medium">Live übertragen von:</span>
              {streamingPartners.map(({ partner: p }) => (
                <a
                  key={p.id}
                  href={`https://twitch.tv/${p.twitchLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                  style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.25)", color: "#c4a3ff" }}
                >
                  <Image src={p.logoUrl} alt={p.name} width={16} height={16} className="rounded-full shrink-0" />
                  {p.name}
                  <span className="opacity-50 text-[10px]">↗</span>
                </a>
              ))}
              {filteredCommunityStreamers.map(({ user: u }) => (
                u.twitchLogin ? (
                  <a
                    key={u.id}
                    href={`https://twitch.tv/${u.twitchLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                    style={{ background: "rgba(145,70,255,0.08)", border: "1px solid rgba(145,70,255,0.18)", color: "#c4a3ff" }}
                  >
                    {u.image && <Image src={u.image} alt={u.name ?? u.username ?? ""} width={16} height={16} className="rounded-full shrink-0" />}
                    {u.name ?? u.username}
                    <span className="opacity-50 text-[10px]">↗</span>
                  </a>
                ) : (
                  <span
                    key={u.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af" }}
                  >
                    {u.image && <Image src={u.image} alt={u.name ?? u.username ?? ""} width={16} height={16} className="rounded-full shrink-0" />}
                    {u.name ?? u.username}
                  </span>
                )
              ))}
            </div>
            {streamingPartners.length > 0 && (
              <EventLiveBadge
                twitchLogins={streamingPartners.map(ep => ep.partner.twitchLogin.toLowerCase())}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          {userId && canRegister && (
            <RegisterButton eventId={event.id} isRegistered={isRegistered} isFull={isFull && !isRegistered} discordEventUrl={discordUrl} />
          )}
          {userId && canRegister && (event as { spectatorMode?: boolean }).spectatorMode && !isRegistered && (
            <SpectatorRegisterButton eventId={event.id} isSpectator={isSpectator} />
          )}
          {canStreamRegister && (
            <StreamRegisterButton eventId={event.id} isStreaming={isCommunityStreamer} />
          )}
          {event.format && (
            <Link href={`/tournament/${event.id}`}
              className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-xl">
              <Trophy className="w-3.5 h-3.5" /> Turnierbaum ansehen
            </Link>
          )}
          {event.status === "umfrage" && discordChannelUrl && (
            <a href={discordChannelUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors border border-amber-500/20 hover:border-amber-500/40 px-3 py-1.5 rounded-xl font-medium">
              <Vote className="w-3.5 h-3.5" />
              {pollConfig?.question ? `Jetzt für „${pollConfig.question}" abstimmen` : "Jetzt abstimmen"} ↗
            </a>
          )}
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-teal-400 transition-colors">
              In Discord ansehen ↗
            </a>
          )}
        </div>
      </div>


      {/* ── Eventbericht ──────────────────────────────────────────────── */}
      {event.status === "finished" && event.summary && (
        <EventSummarySection summary={event.summary} />
      )}

      {/* ── Twitch-Clip (Admin-Highlight) ────────────────────────────── */}
      {(event as any).twitchClipUrl && (
        <div className="glass rounded-2xl p-4" style={{ border: "1px solid rgba(145,70,255,0.15)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Clapperboard className="w-4 h-4 text-[#9146ff]" />
            <span className="text-sm font-semibold text-gray-300">Event-Highlight</span>
          </div>
          <a href={(event as any).twitchClipUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-[#9146ff] hover:text-purple-300 transition-colors">
            Clip auf Twitch ansehen ↗
          </a>
        </div>
      )}

      {/* ── Clip-Einreichungen (für Teilnehmer nach Event) ───────────── */}
      {event.status === "finished" && userId && isRegistered && (
        <div className="glass rounded-2xl p-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Clapperboard className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-300">Deinen Twitch-Clip einreichen</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Hattest du einen guten Moment im Stream? Reiche deinen Clip ein.</p>
          <ClipSubmitter
            eventId={event.id}
            existingClipUrl={(event as any).clipSubmissions?.[0]?.clipUrl ?? null}
          />
        </div>
      )}

      {/* ── Kommende Termine der Reihe ───────────────────────────────── */}
      {event.series && upcomingInSeries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Nächste Termine</h2>
            <span className="text-xs text-gray-600">· {event.series.name}</span>
          </div>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {upcomingInSeries.map(ev => {
              const evDate      = new Date(ev.startAt);
              const evStatus    = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
              const evReg       = userId ? ev.registrations.some(r => r.userId === userId) : false;
              const fmtEv       = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleString("de-DE", { timeZone: TZ, ...opts });

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 hover:bg-white/[0.025] transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/60 border border-white/[0.06] flex flex-col items-center justify-center shrink-0 text-center">
                    <p className="text-xs font-bold text-white leading-none">{fmtEv(evDate, { day: "numeric" })}</p>
                    <p className="text-[8px] text-gray-500 uppercase">{fmtEv(evDate, { month: "short" })}</p>
                    <p className="text-[7px] text-gray-600">{fmtEv(evDate, { year: "numeric" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-white truncate group-hover:text-teal-300 transition-colors">
                        {ev.title}
                      </p>
                      {ev.format && <Trophy className="w-3 h-3 text-amber-500 shrink-0" />}
                      {evReg && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {fmtEv(evDate, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
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

      {/* ── Vergangene Termine der Reihe ─────────────────────────────── */}
      {event.series && pastInSeries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-500">Vergangene Termine</h2>
            <span className="text-xs text-gray-600">· {event.series.name}</span>
          </div>
          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {pastInSeries.map(ev => {
              const evDate  = new Date(ev.startAt);
              const evReg   = userId ? ev.registrations.some(r => r.userId === userId) : false;
              const fmtEv   = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleString("de-DE", { timeZone: TZ, ...opts });

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="flex items-center gap-3.5 px-4 py-3 opacity-50 hover:opacity-100 transition-opacity group">
                  <div className="w-10 h-10 rounded-xl bg-gray-800/60 border border-white/[0.06] flex flex-col items-center justify-center shrink-0 text-center">
                    <p className="text-xs font-bold text-gray-400 leading-none">{fmtEv(evDate, { day: "numeric" })}</p>
                    <p className="text-[8px] text-gray-600 uppercase">{fmtEv(evDate, { month: "short" })}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-400 truncate group-hover:text-white transition-colors">
                        {ev.title}
                      </p>
                      {ev.format && <Trophy className="w-3 h-3 text-gray-600 shrink-0" />}
                      {evReg && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {fmtEv(evDate, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                      {ev._count.registrations > 0 && ` · ${ev._count.registrations} Teilnehmer`}
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

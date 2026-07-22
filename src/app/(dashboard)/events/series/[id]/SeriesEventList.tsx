"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, ChevronDown, ChevronUp, ChevronRight, Check, Tv2 } from "lucide-react";
import GameCover from "@/components/GameCover";
import { AvatarStack } from "@/components/AvatarStack";
import ClientTime from "@/components/ClientTime";
import RankPointsIcon from "@/components/RankPointsIcon";

const GENRE_MAP: Record<string, { label: string; icon: string }> = {
  arcade:    { label: "Arcade",     icon: "/Arcade Icon.png" },
  beat_em_up:{ label: "Beat-em-Up", icon: "/Beat-em-Up Icon.png" },
  sport:     { label: "Sport",      icon: "/Sport Icon.png" },
  racing:    { label: "Racing",     icon: "/Racing Icon.png" },
  shooter:   { label: "Shooter",    icon: "/Shooter Icon.png" },
  community: { label: "Community",  icon: "/Community Icon.png" },
};

const STATUS_CFG: Record<string, { label: string; badge: string; dot: string; stripe: string }> = {
  open:     { label: "Offen",      badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",           dot: "bg-blue-400",                  stripe: "bg-blue-500/40"    },
  active:   { label: "Läuft",      badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20",  dot: "bg-emerald-400 animate-pulse", stripe: "bg-emerald-500/60" },
  umfrage:  { label: "Abstimmung", badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",        dot: "bg-amber-400 animate-pulse",   stripe: "bg-amber-500/60"   },
  finished: { label: "Beendet",    badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",         dot: "bg-gray-600",                  stripe: "bg-white/10"       },
};

type EventUser = { id: string; name: string | null; username: string | null; image: string | null };
type StreamingPartner = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string } };
export type SeriesEventItem = {
  id: string;
  title: string;
  status: string;
  startAt: Date | string;
  game: string | null;
  genre?: string | null;
  placementRewardsJson?: unknown;
  streamingPartners?: StreamingPartner[];
  registrations: { userId: string; user: EventUser }[];
};

function EventCard({ ev, userId, fixedGame }: { ev: SeriesEventItem; userId: string; fixedGame?: string | null }) {
  const s = STATUS_CFG[ev.status] ?? STATUS_CFG.finished;
  const isRegistered = ev.registrations.some(r => r.userId === userId);
  const isLive = ev.status === "active" || ev.status === "umfrage";
  const participants = ev.registrations.map(r => r.user);
  const date = new Date(ev.startAt);
  const isoStr = date.toISOString();
  const serverTimeFallback = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const genre = ev.genre as string | null | undefined;
  const genreInfo = genre ? (GENRE_MAP[genre] ?? null) : null;

  const rewardsData: { placements?: { place: number; coins: number; rankPoints: number }[] } | null = (() => {
    const raw = ev.placementRewardsJson;
    if (!raw) return null;
    try { return (typeof raw === "string" ? JSON.parse(raw) : raw) as { placements?: { place: number; coins: number; rankPoints: number }[] }; } catch { return null; }
  })();
  const firstPlace = rewardsData?.placements?.find(p => p.place === 1) ?? null;

  const partners = ev.streamingPartners ?? [];

  return (
    <Link href={`/tournament/${ev.id}`}
      className={`card-hover relative flex items-center gap-3 glass rounded-xl pl-3 pr-4 py-3 overflow-hidden ${isLive ? "ring-1 ring-teal-500/20" : ""}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${s.stripe} rounded-l-xl`} />
      {isLive && <div className="absolute inset-0 bg-gradient-to-r from-teal-500/[0.04] to-transparent pointer-events-none" />}

      <div className="relative shrink-0 ml-1">
        <GameCover game={ev.game ?? fixedGame ?? ""} className="w-14 h-9" rounded="rounded-lg" />
      </div>

      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {ev.title}
          <span className="text-gray-500 font-normal"> · {date.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "numeric" })}</span>
        </p>

        {/* Game + Genre */}
        {(ev.game ?? fixedGame ?? genreInfo) && (
          <div className="flex items-center gap-1.5 mt-0.5">
            {(ev.game ?? fixedGame) && (
              <span className="text-[10px] text-gray-500">{ev.game ?? fixedGame}</span>
            )}
            {genreInfo && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <Image src={genreInfo.icon} alt={genreInfo.label} width={10} height={10} className="object-contain" />
                {genreInfo.label}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-gray-500">
            {date.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })}
            {" · "}
            <ClientTime iso={isoStr} serverDisplay={serverTimeFallback} /> Uhr
          </p>
          {participants.length > 0 && <AvatarStack users={participants} max={4} size="xs" />}
        </div>

        {/* Streaming Partners */}
        {partners.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Tv2 className="w-3 h-3 text-[#9146ff] shrink-0" />
            {partners.map(sp => (
              <a
                key={sp.partner.id}
                href={`https://twitch.tv/${sp.partner.twitchLogin}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg font-medium hover:brightness-110 transition-all"
                style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.25)", color: "#c4a3ff" }}
              >
                <Image src={sp.partner.logoUrl} alt={sp.partner.name} width={12} height={12} className="rounded-full shrink-0" />
                {sp.partner.name}
              </a>
            ))}
          </div>
        )}

        {/* 1st place reward */}
        {firstPlace && (
          <div className="flex items-center gap-1 mt-1">
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
              🥇
              {firstPlace.coins > 0 && (
                <>
                  <Image src="/Muenze Icon.png" alt="Münzen" width={10} height={10} className="object-contain" />
                  {firstPlace.coins}
                </>
              )}
              {firstPlace.rankPoints > 0 && (
                <>
                  <span className="text-amber-500/60">·</span>
                  <RankPointsIcon size={10} />
                  {firstPlace.rankPoints}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-1.5 shrink-0">
        {isRegistered && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        <span className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${s.badge}`}>{s.label}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-700 shrink-0" />
      </div>
    </Link>
  );
}

interface Props {
  activeEvents: SeriesEventItem[];
  openEvents: SeriesEventItem[];
  recentlyFinishedEvents?: SeriesEventItem[];
  finishedEvents: SeriesEventItem[];
  userId: string;
  fixedGame?: string | null;
}

export default function SeriesEventList({ activeEvents, openEvents, recentlyFinishedEvents = [], finishedEvents, userId, fixedGame }: Props) {
  const [pastOpen, setPastOpen] = useState(false);
  // Kürzlich beendete Events bleiben eine Zeit lang oben bei den anstehenden sichtbar
  // (siehe RECENTLY_FINISHED_MS in @/lib/event-completion), bevor sie in den
  // eingeklappten "Vergangene Events"-Bereich wandern.
  const upcoming = [...activeEvents, ...openEvents, ...recentlyFinishedEvents];
  const hasAny = upcoming.length > 0 || finishedEvents.length > 0;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <CalendarDays className="w-3.5 h-3.5" /> Events
      </h2>

      {!hasAny && (
        <div className="glass rounded-xl px-4 py-8 text-center text-sm text-gray-600">
          Noch keine Events in dieser Reihe
        </div>
      )}

      <div className="space-y-2">
        {upcoming.map(ev => (
          <EventCard key={ev.id} ev={ev} userId={userId} fixedGame={fixedGame} />
        ))}

        {upcoming.length === 0 && finishedEvents.length > 0 && (
          <p className="text-xs text-gray-600 text-center py-1">Keine aktiven oder kommenden Events</p>
        )}

        {finishedEvents.length > 0 && (
          <>
            <button
              onClick={() => setPastOpen(o => !o)}
              className="w-full flex items-center gap-2 glass rounded-xl px-4 py-3 hover:bg-white/[0.03] transition-colors group">
              <span className="flex-1 text-left text-xs font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
                Vergangene Events
              </span>
              <span className="text-[10px] text-gray-600 px-1.5 py-0.5 rounded-full bg-white/[0.04] tabular-nums">
                {finishedEvents.length}
              </span>
              {pastOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
              }
            </button>

            {pastOpen && finishedEvents.map(ev => (
              <EventCard key={ev.id} ev={ev} userId={userId} fixedGame={fixedGame} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

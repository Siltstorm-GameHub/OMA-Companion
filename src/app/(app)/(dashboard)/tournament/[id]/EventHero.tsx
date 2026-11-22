// Kopfbereich der Eventseite: Cover, Kalenderblock, Status, eigener Stand, Titel und Termin.
// Ausgelagert aus page.tsx (die Seite war über 1.800 Zeilen lang) — reine Darstellung, alle Werte als Props.

import Link from "next/link";
import GameCover from "@/components/GameCover";
import ClientTime from "@/components/ClientTime";
import SeriesIcon from "@/components/SeriesIcon";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { CheckCircle2, Clock, Timer } from "@/components/icons";
import { formatBerlinDate, formatBerlinTime } from "@/lib/time";
import type { loadSeriesContext } from "@/lib/series-context";
import type { periodInfo } from "@/lib/event-period";
import type { dateBlock, EventPhase } from "@/lib/event-display";

export type EventHeroProps = {
  event: {
    title: string;
    game: string | null;
    coverImageUrl: string | null;
    endAt: Date | null;
    series: { coverImageUrl: string | null; icon: string | null } | null;
  };
  omaOriginal: boolean;
  heroDate: ReturnType<typeof dateBlock>;
  seriesCtx: Awaited<ReturnType<typeof loadSeriesContext>>;
  statusLabel: string | null;
  statusPill: string;
  phase: EventPhase;
  /** Countdown "startet in …" zeigen (vor dem Start, auch wenn schon ausgelost) */
  showCountdown: boolean;
  startsIn: string | null;
  /** Eigener Stand, z.B. "Du bist dabei · noch nicht bereit" */
  myStatus: { label: string; tone: "teal" | "amber" | "muted" } | null;
  date: Date;
  serverTimeFallback: string;
  period: ReturnType<typeof periodInfo> | null;
};

export default function EventHero({
  event, omaOriginal, heroDate, seriesCtx, statusLabel, statusPill, phase, showCountdown, startsIn, myStatus, date, serverTimeFallback, period,
}: EventHeroProps) {
  return (
      <section aria-label={event.title} className="relative overflow-hidden rounded-2xl mb-3">
        {/* Priorität wie in der Discord-Ankündigung: eigenes Cover → Reihen-Cover
            → Steam-Cover (übernimmt GameCover selbst anhand von `game`) → Default. */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[16/6]">
          <GameCover
            game={event.game}
            coverUrl={event.coverImageUrl ?? event.series?.coverImageUrl ?? null}
            className="absolute inset-0 w-full h-full"
            rounded="rounded-none"
            imgClassName="w-full h-full object-cover"
            brandBadge
            omaOriginal={omaOriginal}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-[#0b0d12]/50 to-transparent pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />

          {/* Kalenderblock */}
          <div className="absolute top-3 left-3 rounded-lg bg-[#0b0d12]/90 px-2.5 py-1.5 text-center leading-tight shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
            <div className={`text-[11px] font-semibold ${heroDate.top === "HEUTE" ? "text-teal-300" : "text-gray-400"}`}>{heroDate.top}</div>
            <div className="text-2xl font-bold !text-white tabular-nums">{heroDate.day}</div>
            <div className="text-[11px] text-gray-400 tabular-nums"><ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /></div>
          </div>

          {/* Reihen-Termin: Akzent in Reihenfarbe (wie auf der Reihen-Seite) */}
          {seriesCtx && <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: seriesCtx.color }} />}

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {statusLabel && (
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${statusPill}`} style={{ textShadow: "none" }}>
                  {phase === "live" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {phase === "period" && <Timer className="w-3.5 h-3.5" />}
                  {statusLabel}
                </span>
              )}
              {showCountdown && startsIn && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/50 px-2 py-0.5 text-xs font-medium text-gray-200" style={{ textShadow: "none" }}>
                  <Clock className="w-3.5 h-3.5" /> startet {startsIn}
                </span>
              )}
              {myStatus && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${myStatus.tone === "teal" ? "bg-teal-400/15 text-teal-300" : myStatus.tone === "amber" ? "bg-amber-400/15 text-amber-300" : "bg-white/[0.08] text-gray-300"}`} style={{ textShadow: "none" }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {myStatus.label}
                </span>
              )}
            </div>
            {seriesCtx && event.series && (
              <Link href={`/events/series/${seriesCtx.id}`} className="mb-0.5 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: seriesCtx.color }}>
                <SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" />
                Eventreihe {seriesCtx.name} · Termin {seriesCtx.position} von {seriesCtx.total}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold !text-white leading-tight">
              {omaOriginal && <OmaTitlePrefix title={event.title} />}
              {event.title}
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              {formatBerlinDate(date, { weekday: "long", day: "2-digit", month: "long" })}
              {" · "}<ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /> Uhr
              {event.endAt && !period && <> – {formatBerlinTime(event.endAt, { hour: "2-digit", minute: "2-digit" })} Uhr</>}
              {period && <> · bis {formatBerlinDate(event.endAt!, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
            </p>
          </div>
          {period && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40" title={`${Math.round(period.progress * 100)} % des Zeitraums vorbei`}>
              <div className="h-full bg-teal-400/80" style={{ width: `${period.progress * 100}%` }} />
            </div>
          )}
        </div>
      </section>
  );
}

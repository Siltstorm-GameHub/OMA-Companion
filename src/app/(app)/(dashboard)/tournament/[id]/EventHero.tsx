// Kopfbereich der Eventseite: Cover, Kalenderblock, Status, eigener Stand, Titel und Termin.
// Ausgelagert aus page.tsx (die Seite war über 1.800 Zeilen lang) — reine Darstellung, alle Werte als Props.

import Link from "next/link";
import type { ReactNode } from "react";
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
  /** Aktionsleiste, direkt unter dem Bild in derselben Karte */
  footer?: ReactNode;
};

export default function EventHero({
  event, omaOriginal, heroDate, seriesCtx, statusLabel, statusPill, phase, showCountdown, startsIn, myStatus, date, serverTimeFallback, period, footer,
}: EventHeroProps) {
  // Kein overflow-hidden an der Karte: das Menü "Mehr" der Aktionsleiste (footer) ragt nach unten heraus.
  // Abgeschnitten (für die runden Ecken) wird nur das Bild.
  return (
      <section aria-label={event.title} className="relative rounded-card border border-line bg-surface shadow-card mb-3">
        {/* Priorität wie in der Discord-Ankündigung: eigenes Cover → Reihen-Cover
            → Steam-Cover (übernimmt GameCover selbst anhand von `game`) → Default. */}
        <div className={`relative w-full aspect-[16/9] sm:aspect-[16/6] overflow-hidden ${footer ? "rounded-t-card" : "rounded-card"}`}>
          <GameCover
            game={event.game}
            coverUrl={event.coverImageUrl ?? event.series?.coverImageUrl ?? null}
            className="absolute inset-0 w-full h-full"
            rounded="rounded-none"
            imgClassName="w-full h-full object-cover"
            brandBadge
            omaOriginal={omaOriginal}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/50 to-transparent pointer-events-none" />

          {/* Kalenderblock */}
          <div className="absolute top-3 left-3 rounded-control bg-canvas/90 px-3 py-1.5 text-center leading-tight shadow-card">
            <div className={`text-xs font-bold ${heroDate.top === "HEUTE" ? "text-primary-fg" : "text-muted"}`}>{heroDate.top}</div>
            <div className="text-2xl font-extrabold text-fg tabular-nums">{heroDate.day}</div>
            <div className="text-xs text-muted tabular-nums"><ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /></div>
          </div>

          {/* Reihen-Termin: Akzent in Reihenfarbe (wie auf der Reihen-Seite) */}
          {seriesCtx && <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full" style={{ background: seriesCtx.color }} />}

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {statusLabel && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${statusPill}`} style={{ textShadow: "none" }}>
                  {phase === "live" && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                  {phase === "period" && <Timer className="w-3.5 h-3.5" />}
                  {statusLabel}
                </span>
              )}
              {showCountdown && startsIn && (
                <span className="inline-flex items-center gap-1 rounded-full bg-canvas/80 px-2.5 py-1 text-xs font-bold text-fg" style={{ textShadow: "none" }}>
                  <Clock className="w-3.5 h-3.5" /> startet {startsIn}
                </span>
              )}
              {myStatus && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${myStatus.tone === "teal" ? "bg-primary/15 text-primary-fg" : myStatus.tone === "amber" ? "bg-warning-soft text-warning" : "bg-surface-3 text-muted"}`} style={{ textShadow: "none" }}>
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
            <h1 className="text-2xl sm:text-4xl font-extrabold !text-fg leading-tight tracking-tight">
              {omaOriginal && <OmaTitlePrefix title={event.title} />}
              {event.title}
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-fg/90">
              {formatBerlinDate(date, { weekday: "long", day: "2-digit", month: "long" })}
              {" · "}<ClientTime iso={date.toISOString()} serverDisplay={serverTimeFallback} /> Uhr
              {event.endAt && !period && <> – {formatBerlinTime(event.endAt, { hour: "2-digit", minute: "2-digit" })} Uhr</>}
              {period && <> · bis {formatBerlinDate(event.endAt!, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>}
            </p>
          </div>
          {period && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40" title={`${Math.round(period.progress * 100)} % des Zeitraums vorbei`}>
              <div className="h-full bg-primary/80" style={{ width: `${period.progress * 100}%` }} />
            </div>
          )}
        </div>
        {footer}
      </section>
  );
}

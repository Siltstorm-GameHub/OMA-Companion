import GameCover from "@/components/GameCover";
import { AvatarStack } from "@/components/AvatarStack";
import { GateLink } from "@/components/GuestGate";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { CalendarPlus, Clock, ExternalLink } from "@/components/icons";
import type { EventCardData } from "./EventCard";

/**
 * "Dein nächstes Event" — oben auf der Events-Seite, sobald du für ein kommendes oder laufendes
 * Event angemeldet bist. Hier (und nur hier) sitzt der Discord-Link prominent.
 */
export default function NextEventHero({
  ev, startsIn, discordUrl,
}: {
  ev: EventCardData;
  /** "in 2 Std 14 Min" — null, wenn das Event schon läuft */
  startsIn: string | null;
  discordUrl: string | null;
}) {
  const othersCount = Math.max(0, ev.playerCount - 1 - ev.friendNames.length);
  const running = ev.phase.phase === "live" || ev.phase.phase === "period";

  return (
    <section aria-label="Dein nächstes Event"
      className="surface group relative flex flex-col sm:flex-row overflow-hidden rounded-lg border border-teal-400/40 shadow-[0_4px_24px_rgba(0,0,0,0.4)] focus-within:ring-2 focus-within:ring-teal-400/60">
      <div className="relative sm:w-[38%] aspect-video sm:aspect-auto sm:min-h-[150px] shrink-0 overflow-hidden">
        <GameCover game={ev.game} coverUrl={ev.coverUrl} className="absolute inset-0 w-full h-full" rounded="rounded-none" brandBadge omaOriginal={ev.omaOriginal}
          imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Dein nächstes Event</p>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${running ? "bg-red-500/15 text-red-400" : "bg-teal-400/15 text-teal-300"}`}>
          {running
            ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />{ev.phase.phase === "period" ? ev.phase.label : "Läuft gerade"}</>
            : <><Clock className="w-3.5 h-3.5" />startet {startsIn}</>}
        </span>
        <h2 className="text-lg font-bold text-white leading-snug line-clamp-2">
          <GateLink href={ev.href} className="outline-none after:absolute after:inset-0 after:content-['']">
            {ev.omaOriginal && <OmaTitlePrefix title={ev.title} />}
            {ev.title}
          </GateLink>
        </h2>
        <p className="text-xs text-gray-400">
          {ev.date.top === "HEUTE" ? "Heute" : ev.date.top === "MORGEN" ? "Morgen" : `${ev.date.weekday.charAt(0)}${ev.date.weekday.slice(1).toLowerCase()} ${ev.date.day}.`} · {ev.date.time} Uhr
          {ev.metaLine && <> · {ev.metaLine}</>}
          {ev.maxPlayers && <> · {ev.playerCount}/{ev.maxPlayers} Plätze</>}
        </p>
        {ev.avatars.length > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative z-10 shrink-0"><AvatarStack users={ev.avatars} max={3} size="xs" /></div>
            <span className="text-xs text-gray-500 truncate">
              {ev.friendNames.length > 0
                ? <><span className="text-gray-300">{ev.friendNames.join(", ")}</span>{othersCount > 0 && ` und ${othersCount} weitere`}</>
                : `mit ${ev.playerCount - 1} anderen`}
            </span>
          </div>
        )}
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
          {discordUrl && (
            <a href={discordUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-teal-950 hover:bg-teal-400 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Discord öffnen
            </a>
          )}
          <a href={`/api/events/${ev.id}/ics`} download
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.08] transition-colors">
            <CalendarPlus className="w-3.5 h-3.5" /> In den Kalender
          </a>
        </div>
      </div>
    </section>
  );
}

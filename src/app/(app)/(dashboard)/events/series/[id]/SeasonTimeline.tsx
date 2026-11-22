import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";
import { Check } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import type { TimelineState } from "@/lib/series-timeline";

export type TimelineEvent = {
  id: string;
  title: string;
  startAt: Date;
  /** "done" = Spielphase abgeschlossen/beendet, "live" = läuft/Abstimmung, "next" = nächster Termin, "upcoming" */
  state: TimelineState;
  winner: { id: string; name: string | null; username: string | null; image: string | null } | null;
};

const shortDate = (d: Date) => formatBerlinDate(d, { day: "2-digit", month: "2-digit" });

/**
 * Saison-Verlauf: ein Punkt je Termin (gespielt ✓ bzw. Sieger-Avatar, läuft, nächster, kommend).
 * Jeder Punkt führt zum Event. Viele Termine → waagerecht scrollbar statt gequetscht.
 */
export default function SeasonTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length < 2) return null;
  const doneCount = events.filter(e => e.state === "done").length;
  const next = events.find(e => e.state === "live" || e.state === "next");

  return (
    <section aria-label="Saison-Verlauf" className="glass rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400">
          Saison-Verlauf <span className="text-gray-600 font-normal tabular-nums">· {doneCount} von {events.length} gespielt</span>
        </h2>
        {next && (
          <Link href={`/tournament/${next.id}`} className="text-xs font-medium text-teal-300 hover:text-teal-200">
            {next.state === "live" ? "Läuft gerade" : `Nächster: ${shortDate(next.startAt)}`} →
          </Link>
        )}
      </div>
      {/* overflow-x schneidet auch senkrecht ab: Innenabstand, damit Avatar-Ring (oben) und
          Datum am Rand (breiter als der Punkt) nicht angeschnitten werden */}
      <ol className="flex items-start overflow-x-auto scrollbar-none pt-1 pb-1 px-2 -mx-2">
        {events.map((e, i) => {
          const last = i === events.length - 1;
          const lineDone = e.state === "done" && events[i + 1]?.state === "done";
          return (
            <li key={e.id} className={`flex items-start ${last ? "" : "flex-1 min-w-[44px]"}`}>
              <Link href={`/tournament/${e.id}`} title={`${e.title} · ${shortDate(e.startAt)}${e.winner ? ` · Sieg: ${e.winner.username ?? e.winner.name}` : ""}`}
                className="group flex flex-col items-center gap-1 shrink-0 w-8">
                {e.state === "done" ? (
                  e.winner ? (
                    <span className="rounded-full ring-2 ring-teal-400/80 group-hover:ring-teal-300">
                      <RankedAvatar userId={e.winner.id} src={e.winner.image} alt={e.winner.username ?? e.winner.name ?? "?"} size={22} variant="flat" className="w-[22px] h-[22px]" />
                    </span>
                  ) : (
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-teal-500 text-teal-950"><Check className="w-3 h-3" /></span>
                  )
                ) : e.state === "live" ? (
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-red-400"><span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" /></span>
                ) : e.state === "next" ? (
                  <span className="h-[22px] w-[22px] rounded-full border-2 border-teal-300 bg-teal-400/15 group-hover:bg-teal-400/30" />
                ) : (
                  <span className="mt-[5px] h-3 w-3 rounded-full bg-white/[0.15] group-hover:bg-white/30" />
                )}
                <span className={`text-xs tabular-nums whitespace-nowrap ${e.state === "next" || e.state === "live" ? "text-teal-300 font-semibold" : "text-gray-600"}`}>
                  {shortDate(e.startAt)}
                </span>
              </Link>
              {!last && <span className={`mt-[10px] h-0.5 flex-1 rounded ${lineDone ? "bg-teal-500/70" : "bg-line"}`} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import { timelineWindow, type SeriesContext } from "@/lib/series-context";

/**
 * Reihen-Leiste unter dem Kopf eines Reihen-Termins: wo stehe ich in der Reihe (Termin x von y,
 * Mini-Zeitstrahl, vorheriger/nächster Termin), wo stehe ICH in der Reihentabelle, was gibt es am
 * Ende — und der Weg zur Reihen-Übersicht.
 */
export default function SeriesStrip({ ctx, currentId }: { ctx: SeriesContext; currentId: string }) {
  const index = ctx.position - 1;
  const win = timelineWindow(ctx.events, index, 9);
  const NAV = "inline-flex min-h-9 items-center gap-1 rounded-control border border-line-strong bg-surface-2 px-3 text-xs font-semibold text-fg hover:bg-surface-3 transition-colors max-w-[11rem]";

  return (
    <section aria-label={`Eventreihe ${ctx.name}`} className="glass rounded-2xl px-3 sm:px-4 py-3 mb-3 border-l-4 flex flex-wrap items-center gap-x-4 gap-y-3"
      style={{ borderLeftColor: ctx.color }}>
      {/* Navigation in der Reihe */}
      <div className="flex items-center gap-2 min-w-0">
        {ctx.prev ? (
          <Link href={`/tournament/${ctx.prev.id}`} className={NAV} title={`Vorheriger Termin: ${ctx.prev.title}`}>
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" /><span className="hidden sm:inline">Vorheriger</span>
          </Link>
        ) : <span className="w-8" />}

        <ol className="flex items-center" aria-label={`Termin ${ctx.position} von ${ctx.total}`}>
          {win.hiddenBefore > 0 && <li className="text-xs text-subtle mr-1">+{win.hiddenBefore}</li>}
          {win.items.map((e, i) => {
            const current = e.id === currentId;
            const dot = current
              ? <span className="block h-3.5 w-3.5 rounded-full border-2 bg-line" style={{ borderColor: ctx.color }} />
              : e.state === "done"
                ? <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                : e.state === "live"
                  ? <span className="block h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse" />
                  : e.state === "cancelled"
                  ? <span className="block h-2.5 w-2.5 rounded-full border border-dashed border-red-400/70" title="Fällt aus" />
                  : <span className="block h-2.5 w-2.5 rounded-full bg-line-strong" />;
            return (
              <li key={e.id} className="flex items-center">
                {i > 0 && <span className={`h-0.5 w-2.5 sm:w-3.5 ${e.state === "done" ? "bg-primary/60" : "bg-line"}`} />}
                {current ? dot : (
                  <Link href={`/tournament/${e.id}`} className="p-0.5 hover:opacity-80" title={`${e.title} · ${formatBerlinDate(e.startAt, { day: "2-digit", month: "2-digit" })}`}>
                    {dot}
                  </Link>
                )}
              </li>
            );
          })}
          {win.hiddenAfter > 0 && <li className="text-xs text-subtle ml-1">+{win.hiddenAfter}</li>}
        </ol>

        {ctx.next ? (
          <Link href={`/tournament/${ctx.next.id}`} className={NAV} title={`Nächster Termin: ${ctx.next.title}`}>
            <span className="hidden sm:inline">Nächster</span><ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </Link>
        ) : <span className="w-8" />}
      </div>

      {/* Welcher Termin/welche Runde (Challenge-Reihe: Zeitraum der Runde) */}
      {ctx.termLabel && (
        <span className="text-xs font-semibold text-fg">
          {ctx.termLabel}{ctx.kindLabel && <span className="font-normal text-subtle"> · {ctx.kindLabel}</span>}
        </span>
      )}

      {/* Dein Stand + Endwertung */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted min-w-0">
        {ctx.myPlace ? (
          <span>Du: <span className="font-semibold text-primary-fg">Platz {ctx.myPlace}</span> von {ctx.tableSize} · {ctx.myPoints} Punkte</span>
        ) : (
          <span>Dieses Event zählt für die Reihentabelle</span>
        )}
        {ctx.finalFirst && (
          <span className="flex items-center gap-1" title="Belohnung für Platz 1 der Endwertung — zum Abschluss der Reihe">
            Endwertung 1. Platz:
            {ctx.finalFirst.coins > 0 && <span className="flex items-center gap-0.5 font-bold text-coin"><CoinIcon size={12} />{ctx.finalFirst.coins.toLocaleString("de-DE")}</span>}
            {ctx.finalFirst.rankPoints > 0 && <span className="flex items-center gap-0.5 font-semibold text-primary"><RankPointsIcon size={12} />{ctx.finalFirst.rankPoints}</span>}
          </span>
        )}
      </div>

      <Link href={`/events/series/${ctx.id}`}
        className="ml-auto inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-semibold text-black hover:brightness-110 transition max-lg:min-h-10"
        style={{ background: ctx.color }}>
        Zur Reihe <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

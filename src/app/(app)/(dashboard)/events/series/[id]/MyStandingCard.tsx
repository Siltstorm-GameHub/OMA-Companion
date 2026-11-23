import { TrendingUp, Flame } from "@/components/icons";

export type MyStanding = {
  rank: number;
  points: number;
  participations: number;
  total: number;
  /** Punkte bis zum Platz darüber (null = schon Erster) */
  gapUp: number | null;
  /** Vorsprung auf den Platz darunter (null = Letzter) */
  gapDown: number | null;
  lastEvent: { title: string; pointsDelta: number; rankDelta: number; participated: boolean } | null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Dein Stand" in der Reihe: Rang, Punkte, Abstand nach oben/unten, Bilanz des letzten Events. */
export default function MyStandingCard({ me, pointsLabel = "Punkte", loggedIn }: { me: MyStanding | null; pointsLabel?: string; loggedIn: boolean }) {
  return (
    <section aria-label="Dein Stand" className="glass rounded-2xl p-4">
      <h2 className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 mb-2">
        <Flame className="w-3.5 h-3.5 text-rose-400" /> Dein Stand
      </h2>
      {!me ? (
        <p className="text-sm text-gray-400">
          {loggedIn
            ? "Du hast in dieser Saison noch keine Punkte. Melde dich für den nächsten Termin an, dann steigst du in die Tabelle ein."
            : "Melde dich an, um deinen Stand in der Tabelle zu sehen."}
        </p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-white leading-tight tabular-nums">
            Platz {me.rank} <span className="text-gray-500 font-normal text-sm">von {me.total}</span>
            <span className="text-gray-600 font-normal"> · </span>{me.points} <span className="text-sm font-normal text-gray-400">{pointsLabel}</span>
          </p>
          <p className="text-xs text-gray-400">
            {me.gapUp === null
              ? <span className="text-yellow-300 font-medium">Du führst die Tabelle an</span>
              : me.gapUp === 0
                ? <span className="text-primary-fg">Punktgleich mit Platz {me.rank - 1}</span>
                : <><span className="text-primary-fg font-medium">{plural(me.gapUp, "Punkt", "Punkte")}</span> bis Platz {me.rank - 1}</>}
            {me.gapDown !== null && <> · {me.gapDown === 0 ? "punktgleich mit dem Platz dahinter" : `${me.gapDown} Vorsprung auf Platz ${me.rank + 1}`}</>}
          </p>
          <p className="text-xs text-gray-500">{plural(me.participations, "Teilnahme", "Teilnahmen")}</p>
          {me.lastEvent && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 border-t border-line">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {me.lastEvent.participated
                  ? <>{me.lastEvent.title}: <span className="text-emerald-300">+{me.lastEvent.pointsDelta}</span>
                      {me.lastEvent.rankDelta > 0 && <>, {plural(me.lastEvent.rankDelta, "Platz", "Plätze")} hoch</>}
                      {me.lastEvent.rankDelta < 0 && <>, {plural(-me.lastEvent.rankDelta, "Platz", "Plätze")} runter</>}</>
                  : <>Bei {me.lastEvent.title} warst du nicht dabei</>}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

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
    <section aria-label="Dein Stand" className="rounded-card border border-primary/40 bg-surface shadow-card p-4">
      <h2 className="text-xs font-semibold text-muted flex items-center gap-1.5 mb-2">
        <Flame className="w-3.5 h-3.5 text-danger" /> Dein Stand
      </h2>
      {!me ? (
        <p className="text-sm text-muted">
          {loggedIn
            ? "Du hast in dieser Saison noch keine Punkte. Melde dich für den nächsten Termin an, dann steigst du in die Tabelle ein."
            : "Melde dich an, um deinen Stand in der Tabelle zu sehen."}
        </p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-fg leading-tight tabular-nums">
            Platz {me.rank} <span className="text-subtle font-normal text-sm">von {me.total}</span>
            <span className="text-subtle font-normal"> · </span>{me.points} <span className="text-sm font-normal text-muted">{pointsLabel}</span>
          </p>
          <p className="text-xs text-muted">
            {me.gapUp === null
              ? <span className="text-coin font-bold">Du führst die Tabelle an</span>
              : me.gapUp === 0
                ? <span className="text-primary-fg">Punktgleich mit Platz {me.rank - 1}</span>
                : <><span className="text-primary-fg font-medium">{plural(me.gapUp, "Punkt", "Punkte")}</span> bis Platz {me.rank - 1}</>}
            {me.gapDown !== null && <> · {me.gapDown === 0 ? "punktgleich mit dem Platz dahinter" : `${me.gapDown} Vorsprung auf Platz ${me.rank + 1}`}</>}
          </p>
          <p className="text-xs text-subtle">{plural(me.participations, "Teilnahme", "Teilnahmen")}</p>
          {me.lastEvent && (
            <p className="flex items-center gap-1.5 text-xs text-muted pt-1 border-t border-line">
              <TrendingUp className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="truncate">
                {me.lastEvent.participated
                  ? <>{me.lastEvent.title}: <span className="text-success">+{me.lastEvent.pointsDelta}</span>
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

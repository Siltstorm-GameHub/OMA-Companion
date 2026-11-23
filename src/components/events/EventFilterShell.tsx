"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Spiel-Filter: `label` ist der kurze Name (Alias), `title` der volle Spielname (Tooltip). */
export type EventFilterGame = { key: string; label: string; title?: string };
/** Ein Tag im Wochen-Streifen: key = "YYYY-MM-DD" (Berlin), count = Events an diesem Tag. */
export type EventFilterDay = { key: string; weekday: string; day: number; count: number };

type Filter =
  | { kind: "all" } | { kind: "mine" } | { kind: "registered" } | { kind: "tournament" }
  | { kind: "game"; key: string } | { kind: "day"; key: string };

/**
 * Schnellfilter über der Event-Liste. Die Kacheln rendert der Server; sie tragen
 * data-ev, data-mine ("Für mich"), data-registered, data-game, data-kind und data-days
 * (Tage, an denen das Event stattfindet/läuft). Gefiltert wird hier per hidden-Attribut —
 * ohne Server-Rundreise. Abschnitte (data-ev-section) ohne sichtbare Kachel verschwinden mit.
 * Oben ein Wochen-Streifen (die nächsten 7 Tage): Klick auf einen Tag zeigt nur dessen Events.
 */
export default function EventFilterShell({
  games, days = [], loggedIn, children,
}: {
  games: EventFilterGame[];
  days?: EventFilterDay[];
  loggedIn: boolean;
  children: ReactNode;
}) {
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const matches = (el: HTMLElement) => {
      switch (filter.kind) {
        case "all": return true;
        case "mine": return el.dataset.mine === "1" || el.dataset.registered === "1";
        case "registered": return el.dataset.registered === "1";
        case "game": return el.dataset.game === filter.key;
        // Turniere = Events mit Platzierung (data-kind, lib/event-placement.ts). Am Handy gibt es keinen
        // eigenen Menüpunkt "Turniere" — dieser Filter ersetzt ihn (Designentwurf).
        case "tournament": return el.dataset.kind === "tournament";
        case "day": return (el.dataset.days ?? "").split(" ").includes(filter.key);
      }
    };
    let count = 0;
    root.querySelectorAll<HTMLElement>("[data-ev]").forEach(el => {
      const ok = matches(el);
      el.hidden = !ok;
      if (ok) count++;
    });
    root.querySelectorAll<HTMLElement>("[data-ev-section]").forEach(sec => {
      sec.hidden = filter.kind !== "all" && !sec.querySelector("[data-ev]:not([hidden])");
    });
    setVisibleCount(filter.kind === "all" ? null : count);
  }, [filter]);

  const chips: { label: string; title?: string; f: Filter }[] = [
    { label: "Alle", f: { kind: "all" } },
    { label: "Turniere", f: { kind: "tournament" } },
    ...(loggedIn ? [{ label: "Für mich", f: { kind: "mine" } as Filter }, { label: "Angemeldet", f: { kind: "registered" } as Filter }] : []),
    ...games.map(g => ({ label: g.label, title: g.title, f: { kind: "game", key: g.key } as Filter })),
  ];
  const isActive = (f: Filter) =>
    f.kind === filter.kind
    && (f.kind !== "game" || (filter.kind === "game" && f.key === filter.key))
    && (f.kind !== "day" || (filter.kind === "day" && f.key === filter.key));
  const activeDay = filter.kind === "day" ? days.find(d => d.key === filter.key) : null;

  return (
    <div className="space-y-3">
      {/* Wochen-Streifen: die nächsten 7 Tage, Punkt = Events an dem Tag */}
      {days.length > 0 && (
        <div role="toolbar" aria-label="Nach Tag filtern" className="grid grid-cols-7 gap-1.5">
          {days.map(d => {
            const on = filter.kind === "day" && filter.key === d.key;
            return (
              <button key={d.key} type="button" aria-pressed={on} disabled={d.count === 0}
                onClick={() => setFilter(on ? { kind: "all" } : { kind: "day", key: d.key })}
                title={d.count === 0 ? "Keine Events" : `${d.count} ${d.count === 1 ? "Event" : "Events"}`}
                className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-control border transition-colors disabled:cursor-default disabled:opacity-40 ${
                  on ? "border-primary/50 bg-primary-soft text-primary-fg" : "border-line bg-surface text-fg hover:border-line-strong hover:bg-surface-2"
                }`}>
                <span className={`text-xs font-semibold ${on ? "" : "text-subtle"}`}>{d.weekday}</span>
                <span className="text-base font-extrabold tabular-nums leading-none">{d.day}</span>
                <span className="flex h-2 items-center gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(d.count, 4) }).map((_, i) => (
                    <span key={i} className={`size-1.5 rounded-full ${on ? "bg-primary-fg" : "bg-primary"}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div role="toolbar" aria-label="Events filtern" className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
        {chips.map(c => (
          <button key={c.label} type="button" aria-pressed={isActive(c.f)} onClick={() => setFilter(c.f)} title={c.title}
            className={`shrink-0 inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              isActive(c.f)
                ? "border-primary/40 bg-primary-soft text-primary-fg"
                : "border-line bg-surface text-gray-300 hover:border-line-strong hover:bg-surface-2"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      {activeDay && (
        <p className="flex items-center gap-2 text-sm text-muted">
          Events am {activeDay.weekday === "Heute" ? "heutigen Tag" : `${activeDay.weekday}, ${activeDay.day}.`}
          <button type="button" onClick={() => setFilter({ kind: "all" })} className="font-semibold text-primary-fg hover:text-fg">Alle zeigen</button>
        </p>
      )}
      <div ref={ref} className="space-y-2">
        {children}
      </div>
      {visibleCount === 0 && (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {filter.kind === "registered"
            ? "Du bist gerade für kein Event angemeldet."
            : filter.kind === "mine"
              ? "Gerade passt kein Event zu deinen Spielen oder Squads. Markier Spiele im GameSwipe, dann tauchen sie hier auf."
              : filter.kind === "tournament"
                ? "Gerade ist kein Turnier geplant."
                : filter.kind === "day"
                  ? "An diesem Tag ist nichts geplant."
                  : "Für dieses Spiel steht gerade nichts an."}
        </div>
      )}
    </div>
  );
}

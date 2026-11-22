"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type EventFilterGame = { key: string; label: string };

type Filter = { kind: "all" } | { kind: "mine" } | { kind: "registered" } | { kind: "game"; key: string };

/**
 * Schnellfilter über der Event-Liste. Die Kacheln rendert der Server; sie tragen
 * data-ev, data-mine ("Für mich"), data-registered und data-game. Gefiltert wird hier per
 * hidden-Attribut — ohne Server-Rundreise. Abschnitte (data-ev-section) ohne sichtbare
 * Kachel verschwinden mit.
 */
export default function EventFilterShell({
  games, loggedIn, children,
}: {
  games: EventFilterGame[];
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

  const chips: { label: string; f: Filter }[] = [
    { label: "Alle", f: { kind: "all" } },
    ...(loggedIn ? [{ label: "Für mich", f: { kind: "mine" } as Filter }, { label: "Angemeldet", f: { kind: "registered" } as Filter }] : []),
    ...games.map(g => ({ label: g.label, f: { kind: "game", key: g.key } as Filter })),
  ];
  const isActive = (f: Filter) => f.kind === filter.kind && (f.kind !== "game" || (filter.kind === "game" && f.key === filter.key));

  return (
    <div className="space-y-3">
      <div role="toolbar" aria-label="Events filtern" className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
        {chips.map(c => (
          <button key={c.label} type="button" aria-pressed={isActive(c.f)} onClick={() => setFilter(c.f)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isActive(c.f)
                ? "border-teal-400 bg-teal-500 text-teal-950"
                : "border-line-strong text-gray-300 hover:border-line-strong hover:bg-line"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
      <div ref={ref} className="space-y-2">
        {children}
      </div>
      {visibleCount === 0 && (
        <div className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-gray-500">
          {filter.kind === "registered"
            ? "Du bist gerade für kein Event angemeldet."
            : filter.kind === "mine"
              ? "Gerade passt kein Event zu deinen Spielen oder Squads. Markier Spiele im GameSwipe, dann tauchen sie hier auf."
              : "Für dieses Spiel steht gerade nichts an."}
        </div>
      )}
    </div>
  );
}

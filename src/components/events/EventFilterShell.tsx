"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGrid, List, Search, X } from "@/components/icons";

/** Spiel-Filter: `label` ist der kurze Name (Alias), `title` der volle Spielname (Tooltip). */
export type EventFilterGame = { key: string; label: string; title?: string };
/**
 * Ein Tag im Wochen-Streifen: key = "YYYY-MM-DD" (Berlin).
 * count = Events, die an diesem Tag beginnen; running = Zeitraum-Events, die an dem Tag laufen.
 */
export type EventFilterDay = { key: string; weekday: string; day: number; count: number; running?: number };

type Filter =
  | { kind: "all" } | { kind: "mine" } | { kind: "registered" } | { kind: "tournament" }
  | { kind: "game"; key: string } | { kind: "day"; key: string };
type Layout = "tiles" | "list";
const LAYOUT_KEY = "oma:events-layout";
/** Ab so vielen Spielen wird aus den Chips ein Auswahlfeld */
const GAME_SELECT_FROM = 5;

/**
 * Schnellfilter über der Event-Liste. Die Kacheln rendert der Server; sie tragen
 * data-ev, data-mine ("Für mich"), data-registered, data-game, data-kind, data-days
 * (Tage, an denen das Event stattfindet/läuft) und data-search (Titel, Spiel, Reihe).
 * Gefiltert wird hier per hidden-Attribut — ohne Server-Rundreise. Abschnitte (data-ev-section)
 * ohne sichtbare Kachel verschwinden mit.
 * Oben: Wochen-Streifen (Klick auf einen Tag), Suche, Kacheln/Liste (pro Gerät gemerkt).
 * Startfilter per URL: ?filter=angemeldet | fuer-mich | turniere.
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
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<Layout>("tiles");
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Gemerkte Ansicht und Startfilter aus der URL (nach dem ersten Render, damit Server und Client gleich starten)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalig gemerkte Einstellung übernehmen
      if (saved === "list" || saved === "tiles") setLayout(saved);
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search);
    // alter Reiter "Meine Events" (?tab=mine) → Liste mit Filter "Angemeldet"
    const f = params.get("filter") ?? (params.get("tab") === "mine" ? "angemeldet" : null);
    if (f === "angemeldet" && loggedIn) setFilter({ kind: "registered" });
    else if (f === "fuer-mich" && loggedIn) setFilter({ kind: "mine" });
    else if (f === "turniere") setFilter({ kind: "tournament" });
  }, [loggedIn]);
  function chooseLayout(l: Layout) {
    setLayout(l);
    try { localStorage.setItem(LAYOUT_KEY, l); } catch { /* ignore */ }
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const q = query.trim().toLowerCase();
    const matches = (el: HTMLElement) => {
      if (q && !(el.dataset.search ?? "").includes(q)) return false;
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
    const filtering = filter.kind !== "all" || !!q;
    root.querySelectorAll<HTMLElement>("[data-ev-section]").forEach(sec => {
      sec.hidden = filtering && !sec.querySelector("[data-ev]:not([hidden])");
    });
    // Gäste-Platzhalter ("+3 weitere nach dem Login") nur ohne Filter zeigen
    root.querySelectorAll<HTMLElement>("[data-ev-placeholder]").forEach(el => { el.hidden = filtering; });
    setVisibleCount(filtering ? count : null);
  }, [filter, query]);

  const useGameSelect = games.length >= GAME_SELECT_FROM;
  const chips: { label: string; title?: string; f: Filter }[] = [
    { label: "Alle", f: { kind: "all" } },
    { label: "Turniere", f: { kind: "tournament" } },
    ...(loggedIn ? [{ label: "Für mich", f: { kind: "mine" } as Filter }, { label: "Angemeldet", f: { kind: "registered" } as Filter }] : []),
    ...(useGameSelect ? [] : games.map(g => ({ label: g.label, title: g.title, f: { kind: "game", key: g.key } as Filter }))),
  ];
  const isActive = (f: Filter) =>
    f.kind === filter.kind
    && (f.kind !== "game" || (filter.kind === "game" && f.key === filter.key))
    && (f.kind !== "day" || (filter.kind === "day" && f.key === filter.key));
  const activeDay = filter.kind === "day" ? days.find(d => d.key === filter.key) : null;
  const CHIP = "shrink-0 inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors";
  const chipCls = (on: boolean) => `${CHIP} ${on ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-2 hover:text-fg"}`;

  return (
    <div className="space-y-3">
      {/* Wochen-Streifen: Punkte = Events, die an dem Tag beginnen; Balken = laufende Zeitraum-Events */}
      {days.length > 0 && (
        <div role="toolbar" aria-label="Nach Tag filtern" className="grid grid-cols-7 gap-1.5">
          {days.map(d => {
            const on = filter.kind === "day" && filter.key === d.key;
            const running = d.running ?? 0;
            const empty = d.count === 0 && running === 0;
            return (
              <button key={d.key} type="button" aria-pressed={on} disabled={empty}
                onClick={() => setFilter(on ? { kind: "all" } : { kind: "day", key: d.key })}
                title={[d.count > 0 ? `${d.count} ${d.count === 1 ? "Event startet" : "Events starten"}` : null, running > 0 ? `${running} läuft über mehrere Tage` : null].filter(Boolean).join(" · ") || "Keine Events"}
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
                <span className={`h-0.5 w-3/5 rounded-full ${running > 0 ? (on ? "bg-primary-fg/60" : "bg-subtle/60") : "bg-transparent"}`} aria-hidden />
              </button>
            );
          })}
        </div>
      )}

      {/* Suche + Ansicht */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Titel, Spiel oder Reihe suchen" aria-label="Events suchen"
            className="w-full min-h-10 rounded-control border border-line bg-surface-2 pl-9 pr-9 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Suche leeren" className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-control text-subtle hover:text-fg">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div role="group" aria-label="Ansicht" className="flex shrink-0 rounded-control border border-line bg-surface p-0.5">
          {([["tiles", LayoutGrid, "Kacheln"], ["list", List, "Liste"]] as const).map(([k, Icon, label]) => (
            <button key={k} type="button" onClick={() => chooseLayout(k)} aria-pressed={layout === k} aria-label={label} title={label}
              className={`grid size-9 place-items-center rounded-[0.6rem] transition-colors ${layout === k ? "bg-primary-soft text-primary-fg" : "text-subtle hover:text-fg"}`}>
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div role="toolbar" aria-label="Events filtern" className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-5 px-5 sm:mx-0 sm:px-0 sm:flex-wrap">
        {chips.map(c => (
          <button key={c.label} type="button" aria-pressed={isActive(c.f)} onClick={() => setFilter(c.f)} title={c.title} className={chipCls(isActive(c.f))}>
            {c.label}
          </button>
        ))}
        {/* Viele Spiele: Auswahlfeld statt langer Chip-Reihe */}
        {useGameSelect && (
          <label className={`${chipCls(filter.kind === "game")} gap-1 pr-2`}>
            <span className="sr-only">Spiel</span>
            <select value={filter.kind === "game" ? filter.key : ""} onChange={e => setFilter(e.target.value ? { kind: "game", key: e.target.value } : { kind: "all" })}
              className="max-w-[11rem] cursor-pointer bg-transparent text-sm font-semibold focus:outline-none">
              <option value="">Spiel: alle</option>
              {games.map(g => <option key={g.key} value={g.key} title={g.title}>{g.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {activeDay && (
        <p className="flex items-center gap-2 text-sm text-muted">
          Events am {activeDay.weekday === "Heute" ? "heutigen Tag" : `${activeDay.weekday}, ${activeDay.day}.`}
          <button type="button" onClick={() => setFilter({ kind: "all" })} className="font-semibold text-primary-fg hover:text-fg">Alle zeigen</button>
        </p>
      )}
      <div ref={ref} data-ev-layout={layout} className="space-y-2">
        {children}
      </div>
      {visibleCount === 0 && (
        <div className="rounded-card border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          {query.trim()
            ? <>Nichts gefunden für „{query.trim()}“.</>
            : filter.kind === "registered"
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

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Gamepad2, Search, User, X } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import type { SearchResults } from "@/app/api/search/route";

type Hit = { key: string; href: string; label: string; hint: string; icon: typeof Search; image?: string | null };

function toHits(r: SearchResults): { title: string; hits: Hit[] }[] {
  return [
    { title: "Mitglieder", hits: r.users.map((u) => ({ key: `u-${u.id}`, href: `/profile/${u.id}`, label: u.name, hint: "Profil", icon: User, image: u.image })) },
    {
      title: "Events",
      hits: r.events.map((e) => ({
        key: `e-${e.id}`, href: `/tournament/${e.id}`, label: e.title, icon: CalendarDays,
        hint: [formatBerlinDate(e.startAt, { day: "numeric", month: "short", year: "numeric" }), e.game].filter(Boolean).join(" · "),
      })),
    },
    { title: "Spiele", hits: r.games.map((g) => ({ key: `g-${g.slug}`, href: `/spiele/${g.slug}`, label: g.name, hint: "Spieleliste", icon: Gamepad2, image: g.coverUrl })) },
  ].filter((s) => s.hits.length > 0);
}

/**
 * Suche in der Kopfzeile über Mitglieder, Events und Spiele (/api/search).
 * Desktop: Feld in der Kopfzeile. Handy: Lupe, die ein Feld unter der Kopfzeile öffnet.
 * Enter öffnet den ersten Treffer, Escape schließt.
 */
export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Verzögert suchen (250 ms), alte Antworten verwerfen
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: SearchResults) => { setResults(data); setFailed(false); })
        .catch((e: unknown) => { if (!(e instanceof DOMException && e.name === "AbortError")) setFailed(true); })
        .finally(() => setLoading(false));
    }, 250);
    return () => { ctrl.abort(); window.clearTimeout(t); };
  }, [q]);

  // Schließen bei Klick außerhalb und bei Seitenwechsel
  useEffect(() => {
    if (!open && !mobileOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) { setOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, mobileOpen]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- bei Navigation zurücksetzen
  useEffect(() => { setOpen(false); setMobileOpen(false); setQ(""); setResults(null); }, [pathname]);

  const term = q.trim();
  const sections = term.length >= 2 && results ? toHits(results) : [];
  const first = sections[0]?.hits[0];
  const showList = open && term.length >= 2;

  function go(href: string) {
    setOpen(false);
    setMobileOpen(false);
    router.push(href);
  }

  const field = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && first) { e.preventDefault(); go(first.href); }
          if (e.key === "Escape") { setOpen(false); setMobileOpen(false); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder="Mitglieder, Events, Spiele …"
        aria-label="Suche"
        aria-expanded={showList}
        aria-controls={listId}
        role="combobox"
        aria-autocomplete="list"
        className="h-10 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none lg:h-11"
      />
    </div>
  );

  const list = showList && (
    <div id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-line bg-surface-2 p-2 shadow-pop">
      {sections.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-muted">{failed ? "Suche gerade nicht verfügbar" : loading || !results ? "Suche …" : "Nichts gefunden"}</p>
      ) : sections.map((s) => (
        <div key={s.title} className="mb-1 last:mb-0">
          <p className="px-3 pb-1 pt-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-subtle">{s.title}</p>
          {s.hits.map((h) => (
            <button
              key={h.key}
              type="button"
              role="option"
              aria-selected={h === first}
              onClick={() => go(h.href)}
              className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-1.5 text-left hover:bg-surface-3"
            >
              {h.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Avatare/Cover von fremden Hosts
                <img src={h.image} alt="" className={`size-8 shrink-0 object-cover ${h.icon === User ? "rounded-full" : "rounded-md"}`} />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-fg"><h.icon className="size-4" aria-hidden /></span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-fg">{h.label}</span>
                <span className="block truncate text-xs text-subtle">{h.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div ref={boxRef} className="lg:relative lg:w-80 xl:w-96">
      {/* Desktop: Feld direkt in der Kopfzeile */}
      <div className="hidden lg:block">
        {field}
        {list}
      </div>

      {/* Handy/Tablet: Lupe → Feld unter der Kopfzeile */}
      <button
        type="button"
        onClick={() => { setMobileOpen((o) => !o); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="grid size-10 place-items-center rounded-control border border-line bg-surface text-fg hover:border-line-strong lg:hidden"
        aria-label={mobileOpen ? "Suche schließen" : "Suchen"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="size-[1.125rem]" aria-hidden /> : <Search className="size-[1.125rem]" aria-hidden />}
      </button>
      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-canvas p-3 lg:hidden">
          <div className="relative">
            {field}
            {list}
          </div>
        </div>
      )}
    </div>
  );
}

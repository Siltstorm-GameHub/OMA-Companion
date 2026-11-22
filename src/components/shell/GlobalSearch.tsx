"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarDays, Clapperboard, Clock, Gamepad2, Search, User, Users, X } from "@/components/icons";
import { formatBerlinDate } from "@/lib/time";
import type { SearchResults } from "@/app/api/search/route";

type Hit = { key: string; href: string; label: string; hint: string; kind: "user" | "event" | "game" | "squad" | "clip"; image?: string | null; external?: boolean };

const KIND_ICON = { user: User, event: CalendarDays, game: Gamepad2, squad: Users, clip: Clapperboard } as const;
const RECENT_KEY = "oma-search-recent";
const RECENT_MAX = 5;

function toHits(r: SearchResults): { title: string; hits: Hit[] }[] {
  return [
    { title: "Mitglieder", hits: r.users.map((u): Hit => ({ key: `u-${u.id}`, href: `/profile/${u.id}`, label: u.name, hint: "Profil", kind: "user", image: u.image })) },
    {
      title: "Events",
      hits: r.events.map((e): Hit => ({
        key: `e-${e.id}`, href: `/tournament/${e.id}`, label: e.title, kind: "event",
        hint: [formatBerlinDate(e.startAt, { day: "numeric", month: "short", year: "numeric" }), e.game].filter(Boolean).join(" · "),
      })),
    },
    { title: "Spiele", hits: r.games.map((g): Hit => ({ key: `g-${g.slug}`, href: `/spiele/${g.slug}`, label: g.name, hint: "Spieleliste", kind: "game", image: g.coverUrl })) },
    { title: "Squads", hits: (r.squads ?? []).map((s): Hit => ({ key: `s-${s.id}`, href: `/squads/${s.id}`, label: s.name, hint: [s.game, `${s.members} Mitglieder`].filter(Boolean).join(" · "), kind: "squad" })) },
    { title: "Clips", hits: (r.clips ?? []).map((c): Hit => ({ key: `c-${c.id}`, href: c.url, label: c.title, hint: "Clip auf Twitch", kind: "clip", image: c.thumbnailUrl, external: true })) },
  ].filter((s) => s.hits.length > 0);
}

function readRecent(): Hit[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Hit[]; } catch { return []; }
}
function saveRecent(hit: Hit) {
  try {
    const list = [hit, ...readRecent().filter((h) => h.key !== hit.key)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch { /* Speicher gesperrt */ }
}

/**
 * Suche in der Kopfzeile über Mitglieder, Events, Spiele, Squads und Clips (/api/search).
 * - mode "desktop": Feld in der Kopfzeile, Strg+K fokussiert (außer im Admin-Bereich, dort sucht Strg+K Admin-Seiten)
 * - mode "mobile": Lupe, die ein Feld unter der Kopfzeile öffnet
 * Ohne Eingabe zeigt sie die zuletzt geöffneten Treffer. Enter öffnet den ersten Treffer, Escape schließt.
 */
export function GlobalSearch({ mode }: { mode: "desktop" | "mobile" }) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recent, setRecent] = useState<Hit[]>([]);
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

  // Schließen bei Klick außerhalb
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

  // Strg/Cmd+K: Suche fokussieren (Admin-Bereich hat eigene Strg+K-Suche)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) return;
      if (pathname.startsWith("/admin")) return;
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      if ((mode === "desktop") !== desktop) return;
      e.preventDefault();
      if (mode === "mobile") setMobileOpen(true);
      setRecent(readRecent());
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, pathname]);

  const term = q.trim();
  const sections = term.length >= 2 && results ? toHits(results) : [];
  const first = sections[0]?.hits[0];
  const showRecent = open && term.length < 2 && recent.length > 0;
  const showList = open && (term.length >= 2 || showRecent);

  function openFocus() {
    setRecent(readRecent());
    setOpen(true);
  }

  function go(hit: Hit) {
    saveRecent(hit);
    setOpen(false);
    setMobileOpen(false);
    if (hit.external) window.open(hit.href, "_blank", "noopener,noreferrer");
    else router.push(hit.href);
  }

  const renderHit = (h: Hit, selected: boolean) => {
    const Icon = KIND_ICON[h.kind];
    return (
      <button
        key={h.key}
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => go(h)}
        className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 py-1.5 text-left hover:bg-surface-3"
      >
        {h.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Avatare/Cover von fremden Hosts
          <img src={h.image} alt="" className={`size-8 shrink-0 object-cover ${h.kind === "user" ? "rounded-full" : "rounded-md"}`} />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-fg"><Icon className="size-4" aria-hidden /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{h.label}</span>
          <span className="block truncate text-xs text-subtle">{h.hint}</span>
        </span>
      </button>
    );
  };

  const field = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={openFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter" && first) { e.preventDefault(); go(first); }
          if (e.key === "Escape") { setOpen(false); setMobileOpen(false); (e.target as HTMLInputElement).blur(); }
        }}
        placeholder="Mitglieder, Events, Spiele, Squads …"
        aria-label="Suche"
        aria-expanded={showList}
        aria-controls={listId}
        role="combobox"
        aria-autocomplete="list"
        className="h-10 w-full rounded-control border border-line bg-surface pl-9 pr-16 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none lg:h-11"
      />
      {mode === "desktop" && (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-xs text-subtle">Strg K</kbd>
      )}
    </div>
  );

  const list = showList && (
    <div id={listId} role="listbox" className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-line bg-surface-2 p-2 shadow-pop">
      {showRecent ? (
        <div>
          <p className="flex items-center gap-1.5 px-3 pb-1 pt-1.5 text-xs font-bold uppercase tracking-[0.1em] text-subtle"><Clock className="size-3.5" aria-hidden /> Zuletzt geöffnet</p>
          {recent.map((h) => renderHit(h, false))}
        </div>
      ) : sections.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-muted">{failed ? "Suche gerade nicht verfügbar" : loading || !results ? "Suche …" : "Nichts gefunden"}</p>
      ) : sections.map((s) => (
        <div key={s.title} className="mb-1 last:mb-0">
          <p className="px-3 pb-1 pt-1.5 text-xs font-bold uppercase tracking-[0.1em] text-subtle">{s.title}</p>
          {s.hits.map((h) => renderHit(h, h === first))}
        </div>
      ))}
    </div>
  );

  if (mode === "desktop") {
    return (
      <div ref={boxRef} className="relative w-80 xl:w-96">
        {field}
        {list}
      </div>
    );
  }

  return (
    <div ref={boxRef}>
      <button
        type="button"
        onClick={() => { setMobileOpen((o) => !o); openFocus(); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="grid size-10 place-items-center rounded-control border border-line bg-surface text-fg hover:border-line-strong"
        aria-label={mobileOpen ? "Suche schließen" : "Suchen"}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="size-[1.125rem]" aria-hidden /> : <Search className="size-[1.125rem]" aria-hidden />}
      </button>
      {mobileOpen && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-line bg-canvas p-3">
          <div className="relative">
            {field}
            {list}
          </div>
        </div>
      )}
    </div>
  );
}

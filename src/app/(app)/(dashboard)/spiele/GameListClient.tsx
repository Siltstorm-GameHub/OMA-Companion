"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/button-styles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameCard from "@/components/games/GameCard";
import SwipeDeck from "@/components/games/SwipeDeck";
import OmaWordmark from "@/components/OmaWordmark";
import type { SwipeDeckData } from "@/lib/games/deck";
import AddGameModal from "@/components/games/AddGameModal";
import { Chip } from "@/components/games/GameFieldsForm";
import { ChevronDown, Dices, Copy, Gamepad2, List, Plus, Search, SearchX, Settings2, ShieldCheck, Users, X } from "@/components/icons";
import {
  EMPTY_FILTERS, GAME_SORTS, activeFilterCount, filterGames, sortGames,
  type GameFilters, type GameListItem, type GameSort,
} from "@/lib/games/filter";
import {
  GAME_GENRES, GAME_PLATFORMS, GAME_SUBSCRIPTIONS, SESSION_LENGTHS,
  type GameGenre, type GameMode, type GamePlatform, type GameSubscription,
} from "@/lib/games/options";

const PLAYER_CHOICES = [1, 2, 3, 4, 5, 6, 8];
const ALL_SUBS = Object.keys(GAME_SUBSCRIPTIONS) as GameSubscription[];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v];
}

export default function GameListClient({
  games, initialQuery, initialSort = "popular", openAdd, pendingCount, isModerator, tabs, sales, swipe, initialView = "list",
}: {
  games: GameListItem[];
  initialQuery: string;
  initialSort?: GameSort;
  openAdd: boolean;
  pendingCount: number;
  isModerator: boolean;
  /** Reiter des Games-Bereichs (serverseitig gerendert, siehe GamesSectionTabs) */
  tabs?: ReactNode;
  /** "Gerade im Angebot" (serverseitig gerendert, siehe GameSalesStrip) — in beiden Ansichten */
  sales?: ReactNode;
  /** Erster Swipe-Stapel (nur für angemeldete Mitglieder) */
  swipe?: SwipeDeckData | null;
  /** Startansicht: Swipen (Standard für Mitglieder) oder Liste (Suche, Sortierung, ?ansicht=liste) */
  initialView?: "swipe" | "list";
}) {
  const [view, setView] = useState<"swipe" | "list">(swipe ? initialView : "list");
  const router = useRouter();
  const [filters, setFilters] = useState<GameFilters>({ ...EMPTY_FILTERS, q: initialQuery });
  const [sort, setSort] = useState<GameSort>(initialSort);
  const [showMore, setShowMore] = useState(false);
  const [addOpen, setAddOpen] = useState(openAdd);

  const visible = useMemo(() => sortGames(filterGames(games, filters), sort), [games, filters, sort]);
  const set = <K extends keyof GameFilters>(key: K, v: GameFilters[K]) => setFilters(f => ({ ...f, [key]: v }));
  const filterCount = activeFilterCount(filters);
  const moreCount = (filters.genre ? 1 : 0) + filters.platforms.length + (filters.sessionLength ? 1 : 0) + (filters.crossplayOnly ? 1 : 0)
    + (filters.subscriptions.length > 0 && filters.subscriptions.length < ALL_SUBS.length ? filters.subscriptions.length : 0);
  const toggleMode = (m: GameMode) => set("modes", toggle(filters.modes, m));
  const pickRandom = () => {
    if (visible.length === 0) return;
    router.push(`/spiele/${visible[Math.floor(Math.random() * visible.length)].slug}`);
  };

  return (
    <div className="px-5 pt-0 sm:p-6 max-w-5xl mx-auto w-full min-w-0 space-y-5 animate-fade-in pb-28 sm:pb-6">
      {tabs}
      {/* Kopf: OMA GameSwipe als eigenes Produkt — Logo + Name statt "Spieleliste" */}
      <PageHeader
        title={<OmaWordmark product="gameSwipe" size="lg" />}
        description="Wisch dich durch die Spiele, bewerte sie und finde Mitspieler — oder such in allen Spielen."
        actions={<>
          <Link href="/spiele/gruppe" className={buttonClasses("secondary", "md")}><Users className="size-4" /> Was zocken wir?</Link>
          <button type="button" onClick={() => setAddOpen(true)} className={buttonClasses("primary", "md", "max-sm:hidden")}>
            <Plus className="size-4" /> Spiel hinzufügen
          </button>
        </>}
      />

      {isModerator && pendingCount > 0 && (
        <Link href="/admin/spiele" className="flex items-center gap-2 rounded-control border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs text-warning transition-colors hover:border-warning/50">
          <ShieldCheck className="size-4" />
          {pendingCount} {pendingCount === 1 ? "Vorschlag wartet" : "Vorschläge warten"} auf Freischaltung →
        </Link>
      )}

      {/* Ansicht: Wischen (Stapel) oder alle Spiele (Liste mit Suche und Filtern) */}
      {swipe && (
        <div role="tablist" aria-label="Ansicht" className="grid max-w-sm grid-cols-2 gap-1 rounded-control border border-line bg-surface-2 p-1">
          {([["swipe", "Wischen", Copy], ["list", "Alle Spiele", List]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" role="tab" onClick={() => setView(key)} aria-selected={view === key}
              className={`flex min-h-9 items-center justify-center gap-1.5 rounded-control text-sm font-semibold transition-colors ${
                view === key ? "bg-surface-3 text-fg shadow-card" : "text-muted hover:text-fg"
              }`}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* "Gerade im Angebot" in beiden Ansichten (schmale Leiste) */}
      {sales}

      {view === "swipe" && swipe ? (
        <div className="space-y-3">
          <p className="text-xs text-subtle">Am Start, würde ich holen oder nicht meins — deine Wahl hilft, Mitspieler und Gruppen-Games zu finden.</p>
          <SwipeDeck initial={swipe} onShowList={() => setView("list")} />
        </div>
      ) : (
      <>
      {/* Suche + Sortierung */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={filters.q}
            onChange={e => set("q", e.target.value)}
            placeholder="Spiel suchen …"
            aria-label="Spiel suchen"
            className="w-full bg-surface-2 border border-line rounded-control pl-9 pr-8 py-2.5 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary"
          />
          {filters.q && (
            <button type="button" onClick={() => set("q", "")} aria-label="Suche leeren"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-subtle hover:text-fg">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <label className="relative">
          <span className="sr-only">Sortierung</span>
          <select value={sort} onChange={e => setSort(e.target.value as GameSort)}
            className="input-glass h-full appearance-none rounded-control pl-3 pr-8 text-sm text-fg">
            {(Object.keys(GAME_SORTS) as GameSort[]).map(s => <option key={s} value={s}>{GAME_SORTS[s]}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-subtle absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </label>
        <button type="button" onClick={pickRandom} disabled={visible.length === 0} title="Zufälliges Spiel aus den Treffern"
          aria-label="Zufälliges Spiel aus den Treffern"
          className="shrink-0 w-11 rounded-control border border-line-strong text-fg/85 hover:text-primary-fg hover:border-primary/40 flex items-center justify-center disabled:opacity-40 transition-colors">
          <Dices className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Schnellfilter */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <span className="text-xs text-subtle shrink-0 mr-0.5">Wir sind</span>
          {PLAYER_CHOICES.map(n => (
            <Chip key={n} active={filters.players === n} onClick={() => set("players", filters.players === n ? null : n)}>
              {n === PLAYER_CHOICES[PLAYER_CHOICES.length - 1] ? `${n}+` : n}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <span className="text-xs text-subtle shrink-0 mr-0.5">Wie</span>
          <Chip active={filters.modes.includes("coop")} onClick={() => toggleMode("coop")}>Koop</Chip>
          <Chip active={filters.modes.includes("pvp")} onClick={() => toggleMode("pvp")}>Gegeneinander</Chip>
          <Chip active={filters.freeOnly} onClick={() => set("freeOnly", !filters.freeOnly)}>Kostenlos</Chip>
          <Chip active={filters.onSaleOnly} onClick={() => set("onSaleOnly", !filters.onSaleOnly)}>Im Angebot</Chip>
          <Chip active={filters.subscriptions.length > 0} onClick={() => set("subscriptions", filters.subscriptions.length > 0 ? [] : [...ALL_SUBS])}>Im Abo</Chip>
          <Chip active={filters.mineOnly} onClick={() => set("mineOnly", !filters.mineOnly)}>Meine</Chip>
          <button type="button" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              moreCount > 0 ? "border-primary/60 text-primary-fg bg-primary/10" : "border-line text-fg/85 hover:border-line-strong"} max-lg:min-h-10`}>
            <Settings2 className="w-3.5 h-3.5" /> Mehr Filter{moreCount > 0 ? ` (${moreCount})` : ""}
          </button>
          {filterCount > 0 && (
            <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}
              className="shrink-0 text-xs text-subtle hover:text-fg px-2">Zurücksetzen</button>
          )}
        </div>

        {showMore && (
          <div className="surface rounded-card p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg/85">Genre</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GAME_GENRES) as GameGenre[]).map(g => (
                  <Chip key={g} active={filters.genre === g} onClick={() => set("genre", filters.genre === g ? null : g)}>{GAME_GENRES[g]}</Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg/85">Plattform</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GAME_PLATFORMS) as GamePlatform[]).map(p => (
                  <Chip key={p} active={filters.platforms.includes(p)} onClick={() => set("platforms", toggle(filters.platforms, p))}>{GAME_PLATFORMS[p]}</Chip>
                ))}
                <Chip active={filters.crossplayOnly} onClick={() => set("crossplayOnly", !filters.crossplayOnly)}>Crossplay</Chip>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg/85">Im Abo enthalten</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SUBS.map(sub => (
                  <Chip key={sub} active={filters.subscriptions.includes(sub)}
                    onClick={() => set("subscriptions", toggle(filters.subscriptions.length === ALL_SUBS.length ? [] : filters.subscriptions, sub))}>
                    {GAME_SUBSCRIPTIONS[sub]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-fg/85">Rundenlänge</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(SESSION_LENGTHS) as (keyof typeof SESSION_LENGTHS)[]).map(s => (
                  <Chip key={s} active={filters.sessionLength === s} onClick={() => set("sessionLength", filters.sessionLength === s ? null : s)}>{SESSION_LENGTHS[s]}</Chip>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ergebnis */}
      {games.length === 0 ? (
        <div className="surface rounded-card p-10 text-center space-y-3">
          <Gamepad2 className="w-8 h-8 text-subtle mx-auto" />
          <p className="text-fg font-semibold">Die Spieleliste ist noch leer</p>
          <p className="text-sm text-subtle">Füge das erste Spiel hinzu{isModerator ? " – oder übernimm alle Spiele aus Events & Profilen im Admin-Bereich" : ""}.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button type="button" onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-primary-ink">
              <Plus className="w-4 h-4" /> Spiel hinzufügen
            </button>
            {isModerator && (
              <Link href="/admin/spiele" className="inline-flex items-center rounded-control px-3.5 py-2 text-sm border border-line-strong text-fg/85 hover:text-fg">
                Zum Admin-Bereich
              </Link>
            )}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="surface rounded-card p-10 text-center space-y-3">
          <SearchX className="w-8 h-8 text-subtle mx-auto" />
          <p className="text-fg font-semibold">Kein passendes Spiel gefunden</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {filterCount > 0 && (
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}
                className="rounded-control px-3.5 py-2 text-sm border border-line-strong text-fg/85 hover:text-fg">Filter zurücksetzen</button>
            )}
            {filters.q.trim().length >= 2 && (
              <button type="button" onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold bg-primary hover:bg-primary-hover text-primary-ink">
                <Plus className="w-4 h-4" /> „{filters.q.trim()}“ hinzufügen
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-subtle">{visible.length} {visible.length === 1 ? "Spiel" : "Spiele"}{filterCount > 0 ? ` · ${filterCount} ${filterCount === 1 ? "Filter" : "Filter"} aktiv` : ""}</p>
            {filterCount > 0 && (
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })} className={buttonClasses("ghost", "sm")}>Filter zurücksetzen</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {visible.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </>
      )}
      </>
      )}

      {/* Mobil: schwebender Button über der Navigation — nur in der Liste (im Stapel stört er die Wisch-Knöpfe) */}
      {view === "list" && (
        <button type="button" onClick={() => setAddOpen(true)} aria-label="Spiel hinzufügen"
          className="sm:hidden fixed right-4 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-ink shadow-pop transition-transform hover:bg-primary-hover active:scale-95">
          <Plus className="size-6" />
        </button>
      )}

      <AddGameModal open={addOpen} onClose={() => setAddOpen(false)} initialQuery={filters.q.trim()} />
    </div>
  );
}

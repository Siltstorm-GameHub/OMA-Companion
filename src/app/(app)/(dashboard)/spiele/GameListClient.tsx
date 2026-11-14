"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GameCard from "@/components/games/GameCard";
import SwipeDeck from "@/components/games/SwipeDeck";
import type { SwipeDeckData } from "@/lib/games/deck";
import AddGameModal from "@/components/games/AddGameModal";
import { Chip } from "@/components/games/GameFieldsForm";
import { ChevronDown, ChevronRight, Dices, Copy, Gamepad2, List, Plus, Search, SearchX, Settings2, ShieldCheck, Users, X } from "@/components/icons";
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
  games, initialQuery, initialSort = "popular", openAdd, pendingCount, isModerator, tabs, swipe, initialView = "list",
}: {
  games: GameListItem[];
  initialQuery: string;
  initialSort?: GameSort;
  openAdd: boolean;
  pendingCount: number;
  isModerator: boolean;
  /** Reiter des Games-Bereichs (serverseitig gerendert, siehe GamesSectionTabs) */
  tabs?: ReactNode;
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
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-5 animate-fade-in pb-28 sm:pb-6">
      {tabs}
      {/* Kopf */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", boxShadow: "0 0 20px rgba(20,184,166,0.10)" }}>
              <Gamepad2 className="w-4.5 h-4.5 text-teal-400" />
            </div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Spieleliste</h1>
          </div>
          <p className="text-xs text-gray-500 ml-11">Was zocken wir heute? Spiele für eure Runde finden — bewertet von der Community.</p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors">
          <Plus className="w-4 h-4" /> Spiel hinzufügen
        </button>
      </div>

      <Link href="/spiele/gruppe"
        className="group flex items-center gap-3 rounded-2xl p-3 border border-teal-500/25 hover:border-teal-400/50 transition-colors"
        style={{ background: "linear-gradient(110deg, rgba(20,184,166,0.12), rgba(20,184,166,0.02) 65%)" }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/15 border border-teal-500/30">
          <Users className="w-4.5 h-4.5 text-teal-300" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white">Was zocken wir?</span>
          <span className="block text-xs text-gray-400 truncate">Wähle, wer mitzockt — wir zeigen Spiele, die alle haben.</span>
        </span>
        <ChevronRight className="w-4 h-4 text-teal-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {isModerator && pendingCount > 0 && (
        <Link href="/admin/spiele" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-200 hover:bg-amber-500/15 transition-colors">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          {pendingCount} {pendingCount === 1 ? "Vorschlag wartet" : "Vorschläge warten"} auf Freischaltung →
        </Link>
      )}

      {/* Ansicht: GameSwipe oder Liste */}
      {swipe && (
        <div className="grid grid-cols-2 gap-1 rounded-xl p-1 bg-white/[0.03] border border-white/[0.06] max-w-xs">
          {([["swipe", "GameSwipe", Copy], ["list", "Liste", List]] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setView(key)} aria-pressed={view === key}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                view === key ? "bg-teal-500/15 text-white ring-1 ring-teal-400/40" : "text-gray-400 hover:text-white"
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      {view === "swipe" && swipe ? (
        <SwipeDeck initial={swipe} onShowList={() => setView("list")} />
      ) : (
      <>
      {/* Suche + Sortierung */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={filters.q}
            onChange={e => set("q", e.target.value)}
            placeholder="Spiel suchen …"
            aria-label="Spiel suchen"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40"
          />
          {filters.q && (
            <button type="button" onClick={() => set("q", "")} aria-label="Suche leeren"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <label className="relative">
          <span className="sr-only">Sortierung</span>
          <select value={sort} onChange={e => setSort(e.target.value as GameSort)}
            className="input-glass h-full appearance-none rounded-xl pl-3 pr-8 text-sm text-white">
            {(Object.keys(GAME_SORTS) as GameSort[]).map(s => <option key={s} value={s}>{GAME_SORTS[s]}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </label>
        <button type="button" onClick={pickRandom} disabled={visible.length === 0} title="Zufälliges Spiel aus den Treffern"
          aria-label="Zufälliges Spiel aus den Treffern"
          className="shrink-0 w-11 rounded-xl border border-white/10 text-gray-300 hover:text-teal-200 hover:border-teal-500/40 flex items-center justify-center disabled:opacity-40 transition-colors">
          <Dices className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Schnellfilter */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <span className="text-xs text-gray-500 shrink-0 mr-0.5">Wir sind</span>
          {PLAYER_CHOICES.map(n => (
            <Chip key={n} active={filters.players === n} onClick={() => set("players", filters.players === n ? null : n)}>
              {n === PLAYER_CHOICES[PLAYER_CHOICES.length - 1] ? `${n}+` : n}
            </Chip>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <Chip active={filters.modes.includes("coop")} onClick={() => toggleMode("coop")}>Koop</Chip>
          <Chip active={filters.modes.includes("pvp")} onClick={() => toggleMode("pvp")}>Gegeneinander</Chip>
          <Chip active={filters.freeOnly} onClick={() => set("freeOnly", !filters.freeOnly)}>Kostenlos</Chip>
          <Chip active={filters.onSaleOnly} onClick={() => set("onSaleOnly", !filters.onSaleOnly)}>Im Angebot</Chip>
          <Chip active={filters.subscriptions.length > 0} onClick={() => set("subscriptions", filters.subscriptions.length > 0 ? [] : [...ALL_SUBS])}>Im Abo</Chip>
          <Chip active={filters.mineOnly} onClick={() => set("mineOnly", !filters.mineOnly)}>Meine</Chip>
          <button type="button" onClick={() => setShowMore(v => !v)} aria-expanded={showMore}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              moreCount > 0 ? "border-teal-400/60 text-teal-100 bg-teal-500/10" : "border-white/[0.08] text-gray-300 hover:border-white/20"}`}>
            <Settings2 className="w-3.5 h-3.5" /> Mehr Filter{moreCount > 0 ? ` (${moreCount})` : ""}
          </button>
          {filterCount > 0 && (
            <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}
              className="shrink-0 text-xs text-gray-500 hover:text-white px-2">Zurücksetzen</button>
          )}
        </div>

        {showMore && (
          <div className="surface rounded-2xl p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300">Genre</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GAME_GENRES) as GameGenre[]).map(g => (
                  <Chip key={g} active={filters.genre === g} onClick={() => set("genre", filters.genre === g ? null : g)}>{GAME_GENRES[g]}</Chip>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300">Plattform</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GAME_PLATFORMS) as GamePlatform[]).map(p => (
                  <Chip key={p} active={filters.platforms.includes(p)} onClick={() => set("platforms", toggle(filters.platforms, p))}>{GAME_PLATFORMS[p]}</Chip>
                ))}
                <Chip active={filters.crossplayOnly} onClick={() => set("crossplayOnly", !filters.crossplayOnly)}>Crossplay</Chip>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-300">Im Abo enthalten</p>
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
              <p className="text-xs font-semibold text-gray-300">Rundenlänge</p>
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
        <div className="surface rounded-2xl p-10 text-center space-y-3">
          <Gamepad2 className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-white font-semibold">Die Spieleliste ist noch leer</p>
          <p className="text-sm text-gray-500">Füge das erste Spiel hinzu{isModerator ? " – oder übernimm alle Spiele aus Events & Profilen im Admin-Bereich" : ""}.</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <button type="button" onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white">
              <Plus className="w-4 h-4" /> Spiel hinzufügen
            </button>
            {isModerator && (
              <Link href="/admin/spiele" className="inline-flex items-center rounded-xl px-3.5 py-2 text-sm border border-white/10 text-gray-300 hover:text-white">
                Zum Admin-Bereich
              </Link>
            )}
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center space-y-3">
          <SearchX className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-white font-semibold">Kein passendes Spiel gefunden</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {filterCount > 0 && (
              <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })}
                className="rounded-xl px-3.5 py-2 text-sm border border-white/10 text-gray-300 hover:text-white">Filter zurücksetzen</button>
            )}
            {filters.q.trim().length >= 2 && (
              <button type="button" onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white">
                <Plus className="w-4 h-4" /> „{filters.q.trim()}“ hinzufügen
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{visible.length} {visible.length === 1 ? "Spiel" : "Spiele"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {visible.map(g => <GameCard key={g.id} game={g} />)}
          </div>
        </>
      )}
      </>
      )}

      {/* Mobil: schwebender Button über der Navigation */}
      <button type="button" onClick={() => setAddOpen(true)} aria-label="Spiel hinzufügen"
        className="sm:hidden fixed right-4 bottom-24 z-30 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-[0_8px_24px_rgba(20,184,166,0.35)] flex items-center justify-center active:scale-95 transition-transform">
        <Plus className="w-6 h-6" />
      </button>

      <AddGameModal open={addOpen} onClose={() => setAddOpen(false)} initialQuery={filters.q.trim()} />
    </div>
  );
}

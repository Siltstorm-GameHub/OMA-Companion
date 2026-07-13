"use client";

import { useState, useRef, useEffect } from "react";
import type { SteamGameResult } from "@/app/api/game-search/route";
import { Gamepad2, Loader2, Plus, X } from "lucide-react";

type GameSuggestion = { name: string; appId: number | null };

interface PollGameSuggestInputProps {
  value: GameSuggestion[];
  onChange: (games: GameSuggestion[]) => void;
  max?: number;
  /** Meldet den aktuell getippten (noch nicht hinzugefügten) Text an die Eltern-Komponente —
   * so kann beim Abstimmen auch ohne aktiven "+"-Klick eine unbekannte Freitext-Eingabe übernommen werden. */
  onDraftChange?: (text: string) => void;
}

/** Mehrfach-Spielvorschlag-Eingabe für Umfragen: Steam-Suche + Chip-Liste. */
export default function PollGameSuggestInput({ value, onChange, max = 10, onDraftChange }: PollGameSuggestInputProps) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SteamGameResult[]>([]);
  const containerRef          = useRef<HTMLDivElement>(null);
  const debounceRef           = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/game-search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json() as SteamGameResult[];
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function add(game: GameSuggestion) {
    if (value.length >= max) return;
    if (value.some(g => (g.appId && g.appId === game.appId) || g.name.toLowerCase() === game.name.toLowerCase())) return;
    onChange([...value, game]);
    setQuery("");
    onDraftChange?.("");
    setResults([]);
    setOpen(false);
  }

  function addFreeform() {
    const name = query.trim();
    if (!name) return;
    add({ name, appId: null });
  }

  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((g, i) => (
            <span key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] bg-purple-500/10 border border-purple-500/25 text-purple-200">
              {g.appId && (
                <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/capsule_sm_120.jpg`}
                  alt="" className="w-6 h-4 rounded object-cover" />
              )}
              {g.name}
              <button type="button" onClick={() => remove(i)} className="text-purple-300/60 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {value.length < max && (
        <div className="relative flex items-center">
          <Gamepad2 className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
          <input
            type="text"
            value={query}
            placeholder="Spieltitel suchen und hinzufügen …"
            autoComplete="off"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
            onChange={e => { setQuery(e.target.value); onDraftChange?.(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) add({ name: results[0].name, appId: results[0].appId });
                else addFreeform();
              }
            }}
          />
          {loading
            ? <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-gray-500 animate-spin" />
            : query && (
              <button type="button" onClick={addFreeform} className="absolute right-2 text-gray-500 hover:text-purple-300 transition-colors" title="Als Freitext hinzufügen">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
        </div>
      )}

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg shadow-2xl"
          style={{ background: "rgba(13,13,18,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}>
          {results.map(g => (
            <li key={g.appId}>
              <button type="button"
                onMouseDown={() => add({ name: g.name, appId: g.appId })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-500/10 transition-colors">
                <img src={g.thumbUrl} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                <span className="text-xs text-white/85 truncate">{g.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

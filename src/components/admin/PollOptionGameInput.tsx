"use client";

import { useState, useRef, useEffect } from "react";
import type { SteamGameResult } from "@/app/api/game-search/route";
import { Gamepad2, Loader2 } from "lucide-react";

interface PollOptionGameInputProps {
  value: string;
  onSelect: (game: { name: string; appId: number; coverUrl: string } | null) => void;
}

/** Kleines Autocomplete für Spieltitel in Umfrage-Optionen — wählt Name + Steam-AppID + Cover. */
export default function PollOptionGameInput({ value, onSelect }: PollOptionGameInputProps) {
  const [query, setQuery]     = useState(value);
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <Gamepad2 className="absolute left-2.5 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Spieltitel suchen (Steam) — optional"
          autoComplete="off"
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(null); }}
          onFocus={() => setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-2.5 w-3.5 h-3.5 text-gray-500 animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg shadow-2xl"
          style={{ background: "rgba(13,13,18,0.98)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}>
          {results.map(g => (
            <li key={g.appId}>
              <button type="button"
                onMouseDown={() => { setQuery(g.name); setOpen(false); onSelect({ name: g.name, appId: g.appId, coverUrl: g.coverUrl }); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-purple-500/10 transition-colors">
                <img src={g.thumbUrl} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                <span className="text-sm text-white/85 truncate">{g.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

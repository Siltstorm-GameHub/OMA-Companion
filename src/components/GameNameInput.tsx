"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getGameCoverUrl, getGameFallbackGradient, KNOWN_GAMES } from "@/lib/game-cover";
import type { SteamGameResult } from "@/app/api/game-search/route";
import { Gamepad2, X, Loader2 } from "lucide-react";

interface GameNameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  required?: boolean;
}

/** Normalisiert für den Cover-Cache-Key */
function norm(s: string) { return s.toLowerCase().trim(); }

/** Session-Cache: normierter Name → CDN-URL (von Steam-Suche) */
const coverCache = new Map<string, string>();

export default function GameNameInput({
  value,
  onChange,
  placeholder = "z.B. Brawlhalla, Rocket League …",
  className = "",
  style,
  id,
  required,
}: GameNameInputProps) {
  const [open, setOpen]             = useState(false);
  const [active, setActive]         = useState(-1);
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState<SteamGameResult[]>([]);
  const containerRef                = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const listRef                     = useRef<HTMLUListElement>(null);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout>>();

  // Statische Vorschläge wenn Feld leer oder kein Steam-Ergebnis
  const staticSuggestions = value.trim().length === 0
    ? KNOWN_GAMES.slice(0, 8)
    : KNOWN_GAMES.filter(g => g.toLowerCase().includes(value.toLowerCase())).slice(0, 5);

  const suggestions = results.length > 0 ? results : null;

  // Steam-Suche (debounced 350 ms)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/game-search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json() as SteamGameResult[];
        // Cache Cover-URLs
        data.forEach(g => coverCache.set(norm(g.name), g.coverUrl));
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const allItems: { name: string; coverUrl?: string; thumbUrl?: string }[] =
    suggestions
      ? suggestions.map(g => ({ name: g.name, coverUrl: g.coverUrl, thumbUrl: g.thumbUrl }))
      : staticSuggestions.map(g => ({ name: g, coverUrl: getGameCoverUrl(g) ?? undefined }));

  const select = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }, [onChange]);

  // Klick außerhalb
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false); setActive(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Aktives Item in Sicht scrollen
  useEffect(() => {
    if (active >= 0 && listRef.current) {
      (listRef.current.children[active] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "ArrowDown")        { e.preventDefault(); setActive(a => Math.min(a + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp")     { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); select(allItems[active].name); }
    else if (e.key === "Escape")      { setOpen(false); setActive(-1); }
  }

  // Cover für den aktuellen Wert
  const staticCover  = getGameCoverUrl(value);
  const cachedCover  = coverCache.get(norm(value));
  const coverUrl     = staticCover ?? cachedCover ?? null;
  const fallbackGrad = getGameFallbackGradient(value);
  const hasMatch     = !!coverUrl;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* Mini-Cover-Preview links im Input */}
        <div
          className="absolute left-2 w-8 h-5 rounded overflow-hidden shrink-0 pointer-events-none"
          style={coverUrl ? {} : { background: fallbackGrad }}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gamepad2 className="w-2.5 h-2.5 text-white/40" />
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          required={required}
          placeholder={placeholder}
          className={`pl-12 pr-8 ${className}`}
          style={style}
          autoComplete="off"
          onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {/* Spinner oder Clear */}
        <div className="absolute right-2 flex items-center">
          {loading
            ? <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
            : value
            ? <button type="button" onClick={() => { onChange(""); inputRef.current?.focus(); setOpen(true); }}
                className="text-gray-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            : null
          }
        </div>
      </div>

      {/* Status-Zeile */}
      {value && (
        <p className={`text-[10px] mt-0.5 ml-1 ${hasMatch ? "text-emerald-500" : "text-gray-600"}`}>
          {hasMatch ? "✓ Cover wird gefunden" : "Kein Cover bekannt – Gradient-Fallback"}
        </p>
      )}

      {/* Dropdown */}
      {open && (loading || allItems.length > 0) && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-xl shadow-2xl"
          style={{
            background: "rgba(13,13,18,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Ladezustand */}
          {loading && results.length === 0 && (
            <li className="flex items-center gap-2 px-4 py-3 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Suche in Steam…
            </li>
          )}

          {/* Quelle-Label */}
          {!loading && (
            <li className="px-3 pt-2 pb-1">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                {results.length > 0 ? "Steam-Suche" : "Bekannte Spiele"}
              </span>
            </li>
          )}

          {allItems.map((item, i) => {
            const isActive = i === active;
            const url      = item.coverUrl ?? item.thumbUrl ?? null;
            const grad     = getGameFallbackGradient(item.name);

            return (
              <li key={item.name + i}>
                <button
                  type="button"
                  onMouseDown={() => select(item.name)}
                  onMouseEnter={() => setActive(i)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                  style={{ background: isActive ? "rgba(20,184,166,0.12)" : "transparent" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-14 h-8 rounded-md overflow-hidden shrink-0"
                    style={url ? {} : { background: grad }}
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.currentTarget.parentElement as HTMLDivElement).style.background = grad; e.currentTarget.remove(); }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white/50">
                          {item.name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name (mit Highlighting) */}
                  <span
                    className="text-sm font-medium flex-1 min-w-0 truncate"
                    style={{ color: isActive ? "#2dd4bf" : "rgba(255,255,255,0.85)" }}
                  >
                    {highlightMatch(item.name, value)}
                  </span>

                  {url && (
                    <span className="text-[9px] text-emerald-700 shrink-0">Cover ✓</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-teal-500/20 text-teal-300 rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

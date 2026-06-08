"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { KNOWN_GAMES, getGameCoverUrl, getGameFallbackGradient } from "@/lib/game-cover";
import { Gamepad2, X } from "lucide-react";

interface GameNameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  required?: boolean;
}

export default function GameNameInput({
  value,
  onChange,
  placeholder = "z.B. Brawlhalla, Rocket League …",
  className = "",
  style,
  id,
  required,
}: GameNameInputProps) {
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);

  // Gefilterte Vorschläge
  const suggestions = value.trim().length === 0
    ? KNOWN_GAMES.slice(0, 8)           // Top-8 wenn leer
    : KNOWN_GAMES.filter(g =>
        g.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);

  const hasMatch = getGameCoverUrl(value) !== null;

  const select = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
  }, [onChange]);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Aktives Element in Sicht scrollen
  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(a => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(a => Math.max(a - 1, -1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      select(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const coverUrl = getGameCoverUrl(value);
  const fallback = getGameFallbackGradient(value);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* Mini-Cover-Preview links im Input */}
        <div
          className="absolute left-2 w-8 h-5 rounded overflow-hidden shrink-0 pointer-events-none"
          style={coverUrl ? {} : { background: fallback }}
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

        {/* Clear-Button */}
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); inputRef.current?.focus(); setOpen(true); }}
            className="absolute right-2 text-gray-600 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grüner Haken wenn Cover gefunden */}
      {value && (
        <p className={`text-[10px] mt-0.5 ml-1 ${hasMatch ? "text-emerald-500" : "text-gray-600"}`}>
          {hasMatch ? "✓ Cover wird gefunden" : "Kein Cover bekannt – Fallback-Farbe wird verwendet"}
        </p>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl shadow-2xl"
          style={{
            background: "rgba(15,15,20,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          {suggestions.map((game, i) => {
            const url      = getGameCoverUrl(game);
            const grad     = getGameFallbackGradient(game);
            const isActive = i === active;

            return (
              <li key={game}>
                <button
                  type="button"
                  onMouseDown={() => select(game)}
                  onMouseEnter={() => setActive(i)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                  style={{
                    background: isActive ? "rgba(20,184,166,0.12)" : "transparent",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-12 h-7 rounded-md overflow-hidden shrink-0"
                    style={url ? {} : { background: grad }}
                  >
                    {url ? (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white/50 leading-none">
                          {game.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <span
                    className="text-sm font-medium flex-1 min-w-0 truncate"
                    style={{ color: isActive ? "#2dd4bf" : "rgba(255,255,255,0.85)" }}
                  >
                    {/* Übereinstimmenden Teil hervorheben */}
                    {highlightMatch(game, value)}
                  </span>

                  {/* Cover-Badge */}
                  {url && (
                    <span className="text-[9px] text-emerald-600 shrink-0">Cover ✓</span>
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

/** Hebt den getippten Teil im Vorschlags-Text hervor */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-teal-500/20 text-teal-300 rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

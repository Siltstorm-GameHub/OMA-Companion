"use client";

import { useState } from "react";
import { Star } from "@/components/icons";

const STARS = [1, 2, 3, 4, 5];

/**
 * Anklickbare 1–5-Sterne-Bewertung. Ein Klick auf den bereits gewählten Stern nimmt die
 * Bewertung zurück (onChange(null)).
 */
export function StarRatingInput({
  value, onChange, disabled = false, size = "lg",
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  const iconClass = size === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Sterne-Bewertung" onMouseLeave={() => setHover(null)}>
      {STARS.map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "Stern" : "Sterne"}${value === n ? " (nochmal tippen zum Zurücknehmen)" : ""}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(null)}
          onClick={() => onChange(value === n ? null : n)}
          className="p-0.5 rounded-md transition-transform active:scale-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        >
          <Star
            className={`${iconClass} transition-colors ${n <= shown ? "text-amber-400" : "text-white/15"}`}
          />
        </button>
      ))}
    </div>
  );
}

/** Nur-Anzeige: Schnitt als teilweise gefüllte Sterne */
export function StarDisplay({ value, className = "w-3.5 h-3.5" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-px" aria-hidden>
      {STARS.map(n => {
        const fill = Math.max(0, Math.min(1, value - (n - 1)));
        return (
          <span key={n} className="relative inline-block">
            <Star className={`${className} text-white/15`} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${className} text-amber-400`} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

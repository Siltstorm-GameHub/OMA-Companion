"use client";
import { useEffect, useState } from "react";

/** Vergleicht `value` mit dem zuletzt in localStorage gespeicherten Wert und liefert die Differenz kurzzeitig zurück. */
export function useValueDelta(storageKey: string, value: number): number | null {
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const prev = stored !== null ? Number(stored) : null;
    localStorage.setItem(storageKey, String(value));
    if (prev === null || Number.isNaN(prev) || prev === value) return;
    setDelta(value - prev);
    const t = setTimeout(() => setDelta(null), 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, value]);

  return delta;
}

export function ValueDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const positive = delta > 0;
  return (
    <span
      className={`value-delta-pop absolute left-1/2 -top-1 -translate-x-1/2 text-[11px] font-bold tabular-nums whitespace-nowrap pointer-events-none ${
        positive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {positive ? "+" : ""}
      {delta.toLocaleString("de-DE")}
    </span>
  );
}

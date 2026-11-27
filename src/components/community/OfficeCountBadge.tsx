"use client";
import { useEffect, useState } from "react";

/**
 * Zahl offener Aufgaben im Büro der Community-Jobs (Empfehlungen aller Jobs: Events ohne Beitrag, Bildwünsche,
 * Hilfe-Anfragen …) — am Reiter "Büro" des Community-Boards. Quelle: /api/community-jobs/recommendations/count.
 */
export function useOfficeCount(enabled = true): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/community-jobs/recommendations/count")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setCount(d.count ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);
  return count;
}

export default function OfficeCountBadge() {
  const n = useOfficeCount();
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 min-w-5 rounded-full bg-warning px-1.5 text-center text-xs font-bold leading-5 tabular-nums text-canvas" aria-label={`${n} offen`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

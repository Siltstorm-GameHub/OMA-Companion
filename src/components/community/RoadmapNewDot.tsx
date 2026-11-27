"use client";
import { useEffect, useState } from "react";

/**
 * "Neu seit deinem letzten Besuch" auf der Roadmap: Die Roadmap-Seite merkt sich den Besuch (localStorage,
 * ROADMAP_VISIT_KEY), /api/roadmap/latest liefert die jüngste Änderung. Ist die neuer → Punkt an "Roadmap".
 */
export const ROADMAP_VISIT_KEY = "oma.roadmap.lastVisit";

export function readRoadmapVisit(): number {
  try { return Number(window.localStorage.getItem(ROADMAP_VISIT_KEY)) || 0; } catch { return 0; }
}

export function markRoadmapVisit() {
  try { window.localStorage.setItem(ROADMAP_VISIT_KEY, String(Date.now())); } catch { /* egal */ }
}

export function useRoadmapNew(enabled = true): boolean {
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch("/api/roadmap/latest")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.at) return;
        const last = readRoadmapVisit();
        // Wer die Roadmap noch nie geöffnet hat, sieht den Punkt auch (gibt ja etwas zu entdecken)
        setIsNew(new Date(d.at).getTime() > last);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);
  return isNew;
}

export default function RoadmapNewDot() {
  const isNew = useRoadmapNew();
  if (!isNew) return null;
  return <span className="ml-1.5 size-2 rounded-full bg-primary" aria-label="Neu seit deinem letzten Besuch" />;
}

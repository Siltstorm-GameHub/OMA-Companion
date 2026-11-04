"use client";
import { useState, useCallback } from "react";
import { usePolling } from "./usePolling";

// Gemeinsamer Abruf je URL: dieselbe Badge steckt teils mehrfach im DOM (z.B. PollBadge in
// Desktop-Pill UND mobiler BottomNav, eine davon per CSS versteckt). Innerhalb von DEDUPE_MS
// teilen sich alle Instanzen eine Anfrage statt je eine eigene Function aufzurufen.
const DEDUPE_MS = 5_000;
const cache = new Map<string, { at: number; promise: Promise<number> }>();

function getCount(url: string): Promise<number> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < DEDUPE_MS) return hit.promise;
  const promise = fetch(url)
    .then(async (res) => (res.ok ? ((await res.json()) as { count: number }).count : 0))
    .catch(() => 0);
  cache.set(url, { at: Date.now(), promise });
  return promise;
}

/** Zähler für Navigations-Badges: pollt `url` (Antwort `{ count }`) nur bei sichtbarem Tab. */
export function usePolledCount(url: string, intervalMs = 60_000): number {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => setCount(await getCount(url)), [url]);
  usePolling(load, intervalMs);
  return count;
}

"use client";
import { useEffect, useState } from "react";
import type { JobBadgeData } from "@/lib/job-badges";

/**
 * Ansehens-Stufe eines Users für den Profilrahmen. Anfragen aller Rahmen einer Seite
 * werden gebündelt (ein Request je 100 User) und 5 Minuten gecacht.
 */

const TTL_MS = 5 * 60_000;
const CHUNK = 100;
const SOURCE_PREFIX = "/api/community-jobs/badges?ids=";

const cache = new Map<string, { data: JobBadgeData | null; at: number }>();
const pending = new Set<string>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function isFresh(id: string): boolean {
  const hit = cache.get(id);
  return !!hit && Date.now() - hit.at < TTL_MS;
}

async function flush() {
  timer = null;
  const ids = [...pending];
  pending.clear();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    chunk.forEach(id => inflight.add(id));
    try {
      const res = await fetch(`${SOURCE_PREFIX}${encodeURIComponent(chunk.join(","))}`);
      const data: Record<string, JobBadgeData> = res.ok ? await res.json() : {};
      const now = Date.now();
      chunk.forEach(id => cache.set(id, { data: data[id] ?? null, at: now }));
    } catch {
      // Netzwerkfehler: neutraler Rahmen, beim nächsten Mount wird erneut versucht
      chunk.forEach(id => cache.delete(id));
    } finally {
      chunk.forEach(id => inflight.delete(id));
    }
    listeners.forEach(l => l());
  }
}

function request(id: string) {
  if (isFresh(id) || inflight.has(id) || pending.has(id)) return;
  pending.add(id);
  if (!timer) timer = setTimeout(flush, 30);
}

/** undefined = lädt noch (oder keine userId), null = unbekannter User. */
export function useReputation(userId: string | null | undefined, prefetched?: JobBadgeData | null): JobBadgeData | null | undefined {
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!userId || prefetched !== undefined) return;
    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);
    request(userId);
    return () => { listeners.delete(listener); };
  }, [userId, prefetched]);

  if (prefetched !== undefined) return prefetched;
  if (!userId) return undefined;
  const hit = cache.get(userId);
  return hit ? hit.data : undefined;
}

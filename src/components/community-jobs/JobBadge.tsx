"use client";
import JobIcon from "@/components/JobIcon";
import { jobColor, GOLD } from "@/lib/job-ring";
import { useEffect, useState } from "react";
import {
  JOB_BADGE_META, LEVEL_RING_COLORS, BADGE_MAX_LEVEL, BADGE_MIN_LEVEL, levelTitle, type JobBadgeData,
} from "@/lib/job-badges";

/**
 * Job-Badge hinter dem Usernamen: Job-Emoji mit farbigem Ring je Ansehens-Stufe.
 *  - variant "full"    → Emoji-Ring + Stufentitel ("📰 Redakteur")
 *  - variant "compact" → nur Emoji-Ring (für Listen mit wenig Platz), Titel im Tooltip
 * Ehemalige Inhaber bekommen ein gedämpftes "Ehem."-Zeichen, verwarnte einen Amber-Punkt.
 * Anfragen aller Badges einer Seite werden gebündelt und gecacht (siehe unten).
 */

// ── Gebündelter, gecachter Abruf ─────────────────────────────────────────────

const TTL_MS = 5 * 60_000;
const CHUNK = 100;
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
      const res = await fetch(`/api/community-jobs/badges?ids=${encodeURIComponent(chunk.join(","))}`);
      const data: Record<string, JobBadgeData> = res.ok ? await res.json() : {};
      const now = Date.now();
      chunk.forEach(id => cache.set(id, { data: data[id] ?? null, at: now }));
    } catch {
      // Netzwerkfehler: kein Badge anzeigen, beim nächsten Mount wird erneut versucht
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

/** undefined = lädt noch (oder keine userId), null = geladen, kein Job (arbeitslos). */
export function useJobBadge(userId: string | null | undefined, prefetched?: JobBadgeData | null): JobBadgeData | null | undefined {
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

// ── Darstellung ──────────────────────────────────────────────────────────────

interface JobBadgeProps {
  userId: string | null | undefined;
  variant?: "full" | "compact";
  /** Schon bekannte Badge-Daten (spart den Abruf); `null` = bekannt, kein Badge. */
  data?: JobBadgeData | null;
  className?: string;
}

export default function JobBadge({ userId, variant = "full", data, className = "" }: JobBadgeProps) {
  const badge = useJobBadge(userId, data);
  if (badge === undefined) return null;

  // Kein Job: Arbeitslos-Zeichen
  if (badge === null) {
    const jobless = (
      <span
        className="relative inline-flex items-center justify-center rounded-full shrink-0 w-5 h-5 bg-black/40"
        style={{ border: "2px solid #52525b" }}
      >
        <span
          aria-hidden
          className="inline-block w-3 h-3"
          style={{
            backgroundColor: "#a16207",
            WebkitMaskImage: "url(/icons/ui/poo.png)", maskImage: "url(/icons/ui/poo.png)",
            WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
            WebkitMaskPosition: "center", maskPosition: "center",
          }}
        />
      </span>
    );
    if (variant === "compact") {
      return <span role="img" aria-label="Arbeitslos" title="Arbeitslos" className={`inline-flex align-middle ${className}`}>{jobless}</span>;
    }
    return (
      <span role="img" aria-label="Arbeitslos" title="Arbeitslos" className={`inline-flex items-center gap-1 align-middle text-[10px] font-semibold ${className}`}>
        {jobless}
        <span className="text-zinc-500">Arbeitslos</span>
      </span>
    );
  }

  const meta = JOB_BADGE_META[badge.jobKey];
  if (!meta) return null;

  const level = Math.min(BADGE_MAX_LEVEL, Math.max(BADGE_MIN_LEVEL, badge.level));
  // Ringfarbe = Farbe des Job-Icons (wie beim Avatar-Ring); höchste Stufe in Gold
  const ring = level === BADGE_MAX_LEVEL ? GOLD : (jobColor(badge.jobKey) ?? LEVEL_RING_COLORS[level - 1]);
  const title = levelTitle(badge.jobKey, level);
  const tooltip = `${meta.label} · ${title} (Stufe ${level}/${BADGE_MAX_LEVEL})${badge.warned ? " · verwarnt" : ""}`;

  const glow = level === BADGE_MAX_LEVEL ? `0 0 7px ${ring}` : undefined;
  const circle = (
    <span
      className="relative inline-flex items-center justify-center rounded-full shrink-0 w-5 h-5 text-[11px] leading-none bg-black/40"
      style={{ border: `2px solid ${ring}`, boxShadow: glow }}
    >
      <JobIcon jobKey={badge.jobKey} className="w-3 h-3" />
      {badge.warned && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
    </span>
  );

  if (variant === "compact") {
    return <span role="img" aria-label={tooltip} title={tooltip} className={`inline-flex align-middle ${className}`}>{circle}</span>;
  }

  return (
    <span role="img" aria-label={tooltip} title={tooltip} className={`inline-flex items-center gap-1 align-middle text-[10px] font-semibold ${className}`}>
      {circle}
      <span style={{ color: jobColor(badge.jobKey) ?? ring }}>{title}</span>
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "@/components/icons";
import type { WatchGroup, WatchOverview } from "@/lib/watch-together";
import { watchGroupHref } from "@/lib/watch-group-href";

/**
 * Dashboard-Hinweis auf "Zusammen ansehen": zeigt Gruppen, die gerade gemeinsam (gleiches Spiel
 * oder dasselbe Event) live sind. Unsichtbar, solange es keine gibt.
 */
export default function WatchTogetherTeaser() {
  const [groups, setGroups] = useState<WatchGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/zusammen", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then((d: WatchOverview | null) => { if (!cancelled && d) setGroups([...(d.sessions ?? []), ...d.events, ...d.auto].slice(0, 3)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (groups.length === 0) return null;
  return (
    <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
      <div className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.04] px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-teal-400/80">
          <Users className="w-3.5 h-3.5" /> Zusammen ansehen
        </span>
        {groups.map(g => (
          <Link
            key={g.key}
            href={watchGroupHref(g)}
            className="text-sm text-gray-200 hover:text-teal-300 truncate"
          >
            <span className="font-semibold">{g.members.map(m => m.name).join(" + ")}</span>
            <span className="text-gray-500"> · {g.label}</span>
          </Link>
        ))}
        <Link href="/zusammen" className="ml-auto text-xs text-teal-300 hover:underline">Alle →</Link>
      </div>
    </div>
  );
}

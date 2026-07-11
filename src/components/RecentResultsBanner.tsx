"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, X, ChevronRight } from "lucide-react";

export type RecentResultEvent = {
  id:    string;
  title: string;
  game:  string | null;
  href:  string;
};

const DISMISS_KEY = "recent-results-dismissed";

export function RecentResultsBanner({ events }: { events: RecentResultEvent[] }) {
  const [dismissedIds, setDismissedIds] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      setDismissedIds(raw ? JSON.parse(raw) : []);
    } catch {
      setDismissedIds([]);
    }
  }, []);

  if (!dismissedIds) return null;
  const visible = events.filter(ev => !dismissedIds.includes(ev.id));
  if (visible.length === 0) return null;

  function dismiss() {
    const next = Array.from(new Set([...(dismissedIds ?? []), ...events.map(ev => ev.id)]));
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
    setDismissedIds(next);
  }

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto w-full">
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)",
          border: "1px solid rgba(245,158,11,0.25)",
          boxShadow: "0 0 20px rgba(245,158,11,0.06)",
        }}>
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/70 mb-1.5">
            Ergebnisse sind da
          </p>
          <div className="space-y-1">
            {visible.map(ev => (
              <Link key={ev.id} href={ev.href}
                className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-amber-300 transition-colors group">
                <span className="truncate">{ev.title}</span>
                {ev.game && <span className="text-xs font-normal text-gray-500 shrink-0">· {ev.game}</span>}
                <ChevronRight className="w-3.5 h-3.5 text-amber-500/60 shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>

        <button
          onClick={dismiss}
          className="shrink-0 self-start p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
          aria-label="Schließen"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

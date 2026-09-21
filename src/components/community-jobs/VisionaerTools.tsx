"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Star, TrendingUp } from "lucide-react";
import { formatBerlinDate } from "@/lib/time";

/** Visionär-Büro: Auswertung (Sterne, Stimmen, Wochenverlauf, Status der Ideen). */

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";

interface Stats {
  total: number; votes: number; average: number; distribution: number[]; starsThisWeek: number;
  best: { id: string; title: string; average: number; count: number } | null;
  weekly: { weekStart: string; stars: number }[];
  lifecycle: { review: number; planned: number; done: number; rejected: number };
  implementedShare: number;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
    </div>
  );
}

export function VisionaerStatsBlock({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/ideas/stats").then(r => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;
  const maxWeek = Math.max(1, ...stats.weekly.map(w => w.stars));
  const maxDist = Math.max(1, ...stats.distribution);
  const { lifecycle } = stats;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          {stats.total} {stats.total === 1 ? "Idee" : "Ideen"} · {stats.votes > 0 ? `Ø ${stats.average.toFixed(1)} ★` : "noch keine Bewertung"} · diese Woche {stats.starsThisWeek} ★
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Tile label="Ideen" value={String(stats.total)} />
            <Tile label="Bewertungen" value={String(stats.votes)} />
            <Tile label="Ø Sterne" value={stats.votes > 0 ? stats.average.toFixed(1) : "–"} />
            <Tile label="Umgesetzt" value={stats.total > 0 ? `${Math.round(stats.implementedShare * 100)} %` : "–"} sub={`${lifecycle.done} von ${stats.total}`} />
          </div>

          {(lifecycle.review + lifecycle.planned + lifecycle.done + lifecycle.rejected) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {lifecycle.review > 0 && <span className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">In Prüfung: {lifecycle.review}</span>}
              {lifecycle.planned > 0 && <span className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">Wird umgesetzt: {lifecycle.planned}</span>}
              {lifecycle.done > 0 && <span className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">Umgesetzt: {lifecycle.done}</span>}
              {lifecycle.rejected > 0 && <span className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">Abgelehnt: {lifecycle.rejected}</span>}
            </div>
          )}

          {stats.best && (
            <p className="text-[11px] text-gray-400">
              Beste Idee: <Link href={`/community-board/idea/${stats.best.id}`} className="text-gray-200 hover:text-teal-300 transition-colors">{stats.best.title}</Link>{" "}
              <span className="text-gray-600">(Ø {stats.best.average.toFixed(1)} ★ · {stats.best.count} Stimmen)</span>
            </p>
          )}

          {stats.votes > 0 && (
            <div className="space-y-1">
              <p className={LABEL}>Sterne-Verteilung</p>
              {stats.distribution.map((n, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-3 flex items-center gap-0.5 tabular-nums">{5 - i}<Star className="w-2 h-2 text-amber-400 fill-amber-400" /></span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-amber-400/80" style={{ width: `${(n / maxDist) * 100}%` }} /></div>
                  <span className="w-5 text-right tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <p className={LABEL}>Sterne pro Woche</p>
            {stats.weekly.length === 0 ? (
              <p className="text-[11px] text-gray-600">Noch keine Bewertungen in den letzten 8 Wochen.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-16">
                {stats.weekly.map(w => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0" title={`${formatBerlinDate(w.weekStart)}: ${w.stars} Sterne`}>
                    <span className="text-[9px] text-gray-500">{w.stars}</span>
                    <div className="w-full rounded-t bg-teal-400/70" style={{ height: `${Math.max(4, (w.stars / maxWeek) * 36)}px` }} />
                    <span className="text-[9px] text-gray-600 truncate">{formatBerlinDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

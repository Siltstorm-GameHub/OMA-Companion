"use client";
import { useEffect, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { reportCategoryLabel } from "@/lib/report-categories";
import { formatBerlinDate } from "@/lib/time";

/** Journalisten-Büro: eigene Auswertung (Berichte, Bewertungen, Ergänzungen, Verlauf). */

interface Stats {
  published: number; drafts: number; totalVotes: number; averageVotes: number; votesThisWeek: number;
  top: { id: string; title: string; votes: number } | null;
  contributionsReceived: number; contributionsWritten: number; contributionVotes: number;
  weekly: { weekStart: string; votes: number }[];
  categories: { category: string; count: number }[];
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

export function JournalistStatsBlock({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/reports/stats").then(r => r.ok ? r.json() : null).then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;
  const maxWeek = Math.max(1, ...stats.weekly.map(w => w.votes));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          {stats.published} {stats.published === 1 ? "Bericht" : "Berichte"} · {stats.totalVotes} 👍 · diese Woche {stats.votesThisWeek}
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Tile label="Veröffentlicht" value={String(stats.published)} sub={stats.drafts > 0 ? `+ ${stats.drafts} Entwürfe` : undefined} />
            <Tile label="Ø Daumen/Bericht" value={stats.averageVotes.toFixed(1)} />
            <Tile label="Ergänzungen erhalten" value={String(stats.contributionsReceived)} />
            <Tile label="Meine Ergänzungen" value={String(stats.contributionsWritten)} sub={`${stats.contributionVotes} 👍 darauf`} />
          </div>

          {stats.top && (
            <p className="text-[11px] text-gray-400">
              Beliebtester Bericht: <span className="text-gray-200">{stats.top.title}</span> <span className="text-gray-600">({stats.top.votes} 👍)</span>
            </p>
          )}

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Daumen pro Woche</p>
            {stats.weekly.length === 0 ? (
              <p className="text-[11px] text-gray-600">Noch keine Bewertungen in den letzten 8 Wochen.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-16">
                {stats.weekly.map(w => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0" title={`${formatBerlinDate(w.weekStart)}: ${w.votes}`}>
                    <span className="text-[9px] text-gray-500">{w.votes}</span>
                    <div className="w-full rounded-t bg-teal-400/70" style={{ height: `${Math.max(4, (w.votes / maxWeek) * 36)}px` }} />
                    <span className="text-[9px] text-gray-600 truncate">{formatBerlinDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stats.categories.map(c => (
                <span key={c.category} className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">
                  {c.category === "ohne" ? "Ohne Kategorie" : reportCategoryLabel(c.category) ?? c.category}: {c.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

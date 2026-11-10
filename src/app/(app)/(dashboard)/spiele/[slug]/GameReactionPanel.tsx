"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarDisplay, StarRatingInput } from "@/components/games/StarRating";
import { Heart } from "@/components/icons";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";

interface Stats { ratingSum: number; ratingCount: number; wantCount: number }
interface Mine { rating: number | null; wantPlay: boolean }

/** Bewertung (1–5 Sterne) + "Würde ich zocken" mit sofortiger Rückmeldung. */
export default function GameReactionPanel({
  slug, initialStats, initialMine, initialDistribution, canReact,
}: {
  slug: string;
  initialStats: Stats;
  initialMine: Mine;
  initialDistribution: { stars: number; count: number }[];
  canReact: boolean;
}) {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [mine, setMine] = useState(initialMine);
  const [distribution, setDistribution] = useState(initialDistribution);
  const [busy, setBusy] = useState(false);

  async function save(change: Partial<Mine>) {
    const prevMine = mine;
    const prevStats = stats;
    const prevDist = distribution;
    // Optimistisch anzeigen
    const nextMine = { ...mine, ...change };
    setMine(nextMine);
    if ("rating" in change) {
      setDistribution(d => d.map(row => ({
        stars: row.stars,
        count: row.count - (row.stars === prevMine.rating ? 1 : 0) + (row.stars === nextMine.rating ? 1 : 0),
      })));
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/games/${encodeURIComponent(slug)}/reaction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      setStats({ ratingSum: data.ratingSum, ratingCount: data.ratingCount, wantCount: data.wantCount });
      setMine({ rating: data.rating, wantPlay: data.wantPlay });
      if ("rating" in change) toast.success(change.rating ? "Bewertung gespeichert" : "Bewertung entfernt");
      router.refresh();
    } catch (err) {
      setMine(prevMine);
      setStats(prevStats);
      setDistribution(prevDist);
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  const avg = averageRating(stats.ratingSum, stats.ratingCount);
  const enough = avg !== null && stats.ratingCount >= MIN_RATINGS_FOR_AVERAGE;
  const maxCount = Math.max(1, ...distribution.map(d => d.count));

  return (
    <div className="surface rounded-2xl p-4 sm:p-5 grid sm:grid-cols-2 gap-5">
      {/* Community-Schnitt */}
      <div className="flex items-center gap-4">
        <div className="text-center shrink-0 w-20">
          <p className="font-display text-4xl font-black text-white leading-none">{enough ? formatRating(avg!) : "–"}</p>
          <div className="mt-1.5 flex justify-center"><StarDisplay value={enough ? avg! : 0} className="w-3 h-3" /></div>
          <p className="text-[10px] text-gray-500 mt-1">
            {stats.ratingCount} Bewertung{stats.ratingCount === 1 ? "" : "en"}
          </p>
        </div>
        <div className="flex-1 space-y-1">
          {distribution.map(d => (
            <div key={d.stars} className="flex items-center gap-2 text-[10px] text-gray-500">
              <span className="w-2 text-right">{d.stars}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-amber-400/80 transition-all duration-300" style={{ width: `${(d.count / maxCount) * 100}%` }} />
              </div>
              <span className="w-4 tabular-nums">{d.count}</span>
            </div>
          ))}
          {!enough && <p className="text-[10px] text-gray-600 pt-0.5">Noch zu wenig Bewertungen für einen Schnitt.</p>}
        </div>
      </div>

      {/* Eigene Reaktion */}
      <div className="space-y-3 sm:border-l sm:border-white/[0.06] sm:pl-5">
        {canReact ? (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-300 mb-1">{mine.rating ? "Deine Bewertung" : "Wie findest du's?"}</p>
              <StarRatingInput value={mine.rating} onChange={rating => save({ rating })} disabled={busy} />
            </div>
            <button
              type="button"
              onClick={() => save({ wantPlay: !mine.wantPlay })}
              disabled={busy}
              aria-pressed={mine.wantPlay}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium border transition-colors disabled:opacity-60 ${
                mine.wantPlay
                  ? "bg-rose-500/15 border-rose-400/50 text-rose-100"
                  : "border-white/10 text-gray-300 hover:border-rose-400/40 hover:bg-rose-500/10"
              }`}
            >
              <Heart className={`w-4 h-4 ${mine.wantPlay ? "text-rose-400" : "text-gray-500"}`} />
              Würde ich zocken
              <span className="text-xs text-gray-500 tabular-nums">{stats.wantCount}</span>
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-500">Bewertungen sind möglich, sobald das Spiel freigeschaltet ist.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarDisplay, StarRatingInput } from "@/components/games/StarRating";
import SwipeStatusButtons from "@/components/games/SwipeStatusButtons";
import { MIN_RATINGS_FOR_AVERAGE, averageRating, formatRating } from "@/lib/games/rating";
import type { SwipeStatus } from "@/lib/games/swipe";

interface Stats { ratingSum: number; ratingCount: number; inCount: number; wishCount: number }
interface Mine { rating: number | null; status: SwipeStatus | null }

/** Bewertung (1–5 Sterne) und Entscheidung (Am Start / Würde ich holen / Nicht meins) mit sofortiger
 *  Rückmeldung — dieselben Entscheidungen wie in GameSwipe. */
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
      setStats(s => ({
        ratingSum: data.ratingSum ?? s.ratingSum, ratingCount: data.ratingCount ?? s.ratingCount,
        inCount: data.inCount ?? s.inCount, wishCount: data.wishCount ?? s.wishCount,
      }));
      setMine(m => ({ rating: "rating" in data ? data.rating : m.rating, status: "status" in data ? data.status : m.status }));
      if ("rating" in change) toast.success(change.rating ? "Bewertung gespeichert" : "Bewertung entfernt");
      for (const match of (data.matches ?? []) as { squadName: string; count: number; isNew: boolean }[]) {
        if (match.isNew) toast.success(`Match: ${match.count} aus ${match.squadName} sind am Start!`);
      }
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
            <SwipeStatusButtons
              value={mine.status}
              onChange={status => save({ status })}
              counts={{ in: stats.inCount, wish: stats.wishCount }}
              disabled={busy}
            />
            <p className="text-[11px] text-gray-500">
              „Am Start“ sehen alle, „Würde ich holen“ bringt dir Angebots-Hinweise, „Nicht meins“ bleibt privat.
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">Bewertungen sind möglich, sobald das Spiel freigeschaltet ist.</p>
        )}
      </div>
    </div>
  );
}

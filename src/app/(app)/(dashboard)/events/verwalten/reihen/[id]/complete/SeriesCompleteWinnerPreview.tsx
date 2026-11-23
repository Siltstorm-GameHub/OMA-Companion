"use client";
import { formatDecimal } from "@/lib/format-number";
import { Trophy } from "@/components/icons";
import { userName } from "./series-complete-shared";
import { Podium, type PodiumEntry } from "@/components/ui/Podium";
import type { SeriesComplete } from "./useSeriesComplete";

/**
 * Vorschau der Endplatzierung vor dem Bestätigen: gemeinsames Podest (wie auf der Reihen-Seite)
 * mit der Belohnung je Platz. Gleichstände stehen darunter in Worten.
 */
export default function SeriesCompleteWinnerPreview({ ctx }: { ctx: SeriesComplete }) {
  const { participants, userStats, rankingGroups, placementMap, rankingOrder, rewardsConfig } = ctx;
  const top = rankingOrder.filter(uid => (placementMap.get(uid) ?? 99) <= 3).slice(0, 3);
  const reward = (uid: string) => rewardsConfig.placements.find(p => p.place === placementMap.get(uid));
  const entries: PodiumEntry[] = top.flatMap(uid => {
    const u = participants.find(p => p.id === uid);
    if (!u) return [];
    const r = reward(uid);
    return [{
      id: uid, name: userName(u), image: u.image,
      value: `${formatDecimal(userStats[uid]?.totalPoints ?? 0)} Pkt.`,
      below: r && (r.coins > 0 || r.rankPoints > 0)
        ? <span className="mt-0.5 flex items-center gap-1.5 text-xs font-bold tabular-nums">
            {r.coins > 0 && <span className="text-coin">+{r.coins.toLocaleString("de-DE")} Münzen</span>}
            {r.rankPoints > 0 && <span className="text-primary-fg">+{r.rankPoints} RP</span>}
          </span>
        : undefined,
    }];
  });
  const ties = rankingGroups.slice(0, 3).filter(g => g.length > 1);
  return (
    <div className="rounded-card border border-coin/30 bg-surface shadow-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-coin" />
        <span className="text-base font-extrabold text-fg">So endet die Saison</span>
      </div>
      {entries.length > 0 && <Podium entries={entries} size="md" className="pt-2" />}
      {ties.length > 0 && (
        <p className="text-xs text-muted">
          Gleichstand: {ties.map(g => g.map(uid => { const u = participants.find(p => p.id === uid); return u ? userName(u) : "?"; }).join(" = ")).join(" · ")} — alle bekommen die Belohnung ihres Platzes.
        </p>
      )}
    </div>
  );
}

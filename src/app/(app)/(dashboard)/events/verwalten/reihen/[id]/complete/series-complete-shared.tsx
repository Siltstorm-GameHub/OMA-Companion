"use client";
import PlaceMedal from "@/components/PlaceMedal";

// Aus SeriesCompleteClient.tsx ausgelagert: Typen, Konstanten und kleine Bausteine, die Hook und Reiter teilen.

export type User = { id: string; name: string | null; username: string | null; image: string | null };
export type PlacementReward = { place: number; coins: number; rankPoints: number };
export type RewardsConfig = { participationCoins: number; placements: PlacementReward[] };
export interface Props {
  seriesId: string;
  seriesName: string;
  seriesIcon?: string | null;
  statFields: string[];
  participants: User[];
  userStats: Record<string, Record<string, number>>;
  rewardsConfig: RewardsConfig;
  isReEdit: boolean;
  pollPhaseComplete: boolean;
  initialData: Record<string, unknown> | null;
  /** Noch offene Termine der Saison (nur beim ersten Abschluss) */
  openEvents: { id: string; title: string; startAt: string; registrations: number }[];
  /** Gespielt, aber nicht abgeschlossen — bleiben in der Saison, sollten vorher abgeschlossen werden */
  playedOpenEvents?: { id: string; title: string; startAt: string; registrations: number }[];
  /** Turnier-Reihe: der Gesamtsieger bekommt einen Eventreihen-Pokal */
  isTournamentSeries: boolean;
}
export type OpenEventsAction = "move" | "delete" | "keep";
export const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const numCls   = "w-24 rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const MEDALS   = [<PlaceMedal key="1" place={1} />, <PlaceMedal key="2" place={2} />, <PlaceMedal key="3" place={3} />];
export function userName(u: User) { return u.username ?? u.name ?? "?"; }
export function Avatar({ u, size = 6 }: { u: User; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0`;
  if (u.image) return <img src={u.image} alt="" className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-400`}>
      {userName(u)[0]?.toUpperCase()}
    </div>
  );
}
export function computeGroups(order: string[], tiedAbove: Set<string>): string[][] {
  const groups: string[][] = [];
  for (const uid of order) {
    if (tiedAbove.has(uid) && groups.length > 0) groups[groups.length - 1].push(uid);
    else groups.push([uid]);
  }
  return groups;
}
export function computePlacementMap(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  let place = 1;
  for (const group of groups) {
    for (const uid of group) map.set(uid, place);
    place += group.length;
  }
  return map;
}

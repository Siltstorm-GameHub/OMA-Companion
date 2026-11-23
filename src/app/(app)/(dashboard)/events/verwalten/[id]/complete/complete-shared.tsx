"use client";
import PlaceMedal from "@/components/PlaceMedal";
import { type AvgDirection } from "@/lib/avg-stats";

// Aus EventCompleteClient.tsx ausgelagert: Typen, Konstanten und kleine Bausteine, die Hook und Reiter teilen.

export const noopSubscribe = () => () => {};
/* ── Types ── */
export type User = { id: string; name: string | null; username: string | null; image: string | null };
export type PlacementReward = { place: number; coins: number; rankPoints: number; /** Tabellenpunkte der Reihe (eventPlacementPoints) */ tablePoints?: number };
export type RewardsConfig = { participationCoins: number; participationRankPts?: number; placements: PlacementReward[] };
export type PollConfig = { enabled: boolean; question: string; coins: number; rankPoints: number };
export type MultiPollConfig = { label: string; question: string; coins: number; rankPoints: number; type: "player" | "spectator" };
export type SeriesStatConfig = {
  participationPoints: number;
  participationCoins?: number;
  spectatorParticipationCoins?: number;
  stats: { field: string; pointsPer: number }[];
  mvpStatField?: string;
  defaultWinnerStatField?: string;
  defaultWinnerTargetField?: string;
  eventPlacementCoins?: { place: number; coins: number }[];
  eventPlacementPoints?: { place: number; points: number }[];
  placementPoints?: Record<string, number>;
  dominionBonus?: {
    enabled: boolean;
    triggerStats?: string[];
    triggerStat?: string;
    threshold: number;
    coins: number;
    seriesPoints: number;
  };
};
export type DominionChange = { streakBefore: number; streakAfter: number; bonusAwarded: boolean; coins: number; seriesPoints: number };
export interface Props {
  /** false bei Community-Events: keine Platzierung, nur Teilnahme-Belohnung (lib/event-placement.ts) */
  hasPlacement?: boolean;
  eventId: string;
  eventTitle: string;
  /** Für die Warnung "Abschluss vor Start/Ende" (ISO) */
  eventStartAt: string;
  eventEndAt: string | null;
  seriesId: string | null;
  seriesName: string | null;
  seriesIcon?: string | null;
  registeredUsers: User[];
  spectatorUsers: User[];
  /** Alle User der Plattform — für Umfragen mit voterEligibility "all" im Live-Umfragen-Panel */
  allUsers: User[];
  tournamentStatFields: string[];
  /** Auswahloptionen für den Gewinner-Stat-Dropdown — wie tournamentStatFields, plus "Eventpunkte"
   *  (berechnete Gesamtpunktzahl dieses Events aus Stats × Punkte-pro-Stat + Platzierungspunkte),
   *  wenn dafür eine Punkte-Konfiguration existiert. KEINE Tabellenpunkte — nur zur Sieger-Ermittlung
   *  dieses einzelnen Events. Fällt ohne Prop auf tournamentStatFields zurück. */
  winnerStatFieldOptions?: string[];
  /** Vorbelegter Gewinner-Stat (Event → Reihe → Altfeld), siehe page.tsx */
  defaultWinnerStatField?: string;
  /** Woher die Vorbelegung stammt: Event-Einstellung, Reihe oder automatisch gewählt */
  winnerStatSource?: "event" | "series" | "auto";
  /** Gewinner-Stat der Eventreihe — Vergleich im Gewinner-Stat-Kasten, falls abweichend */
  seriesWinnerStatField?: string | null;
  userStats: Record<string, Record<string, number>>;
  format: string | null;
  /** Kombinierter Ø-Wert pro Runde (über alle Stat-Felder) je Spieler — nur bei format "avg_stats" */
  userAvgScore: Record<string, number>;
  /** Vorbelegung der Ø-Richtung aus den Turnier-Einstellungen des Events (statConfigJson.avgDirection) */
  defaultAvgDirection?: AvgDirection;
  /** Aktueller Dominion-Streak je User VOR diesem Event (aus der Reihen-Rohtabelle) — nur User mit
   *  Streak > 0 sind enthalten. Zeigt Moderatoren beim Ausfüllen, wer bereits auf den Bonus zusteuert. */
  currentDominionStreaks: Record<string, number>;
  seriesStatConfig: SeriesStatConfig | null;
  rewardsConfig: RewardsConfig;
  pollConfig: PollConfig;
  pollsConfig: MultiPollConfig[];
  pendingEventPolls: { label: string; endAt: string }[];
  spectatorRewardJson: { coins: number; rankPoints: number } | null;
  isAdmin: boolean;
  /** Moderator oder Admin (Squad-Captains ohne Moderator-Rolle: false) */
  isMod: boolean;
  isReEdit: boolean;
  /** Event-Status aus der DB — bestimmt maßgeblich den Anzeigemodus (aktiv/umfrage/finished),
   * unabhängig davon ob completionData konsistent gepflegt wurde (z.B. nach manueller Statusänderung). */
  status: string;
  initialData: Record<string, unknown> | null;
  initialFinalRanking: string[] | null;
  initialRankingGroups: string[][] | null;
  initialFinalRankingNote: string | null;
  /** Screenshot-/Ergebnis-Meldungen, die noch auf Prüfung warten */
  pendingSubmissions?: number;
  /** Spiele ohne Ergebnis (open) bzw. nur vorläufig eingetragen (provisional) */
  matchCheck?: { open: number; provisional: number } | null;
  /** Sieger-Tipps zu diesem Event: Anzahl, Pott, schon einmal ausgewertet? */
  predictionInfo?: { count: number; pot: number; resolved: boolean } | null;
  /** Zuschauer: Aktivität beim Event (z.B. ["Absprachen", "abgestimmt"]) — Hinweis bei der Anwesenheit */
  spectatorActivity?: Record<string, string[]>;
  /** Protokoll der Belohnungs-Buchungen dieses Events (neueste zuerst) */
  rewardHistory?: RewardHistoryEntry[] | null;
  /** Mitglied: angezeigte Beträge sind auf die Obergrenzen gekürzt (so wird auch ausgezahlt) */
  rewardsCapped?: boolean;
  /** Beim ersten Abschluss vorbelegt als "nicht da": bei aktivem Check-in nicht eingecheckt und nicht ausgelost */
  defaultAbsentIds?: string[];
}
export const inputCls = "w-full rounded-control px-3 py-2 text-sm text-fg outline-none bg-gray-800 border border-gray-700 focus:border-primary/50 transition-colors";
export const MEDALS = [<PlaceMedal key="1" place={1} />, <PlaceMedal key="2" place={2} />, <PlaceMedal key="3" place={3} />];
export function userName(u: User) { return u.username ?? u.name ?? "?"; }
export function Avatar({ u, size = 6 }: { u: User; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full shrink-0`;
  if (u.image) return <img src={u.image} alt="" className={`${cls} object-cover`} />;
  return (
    <div className={`${cls} bg-gray-700 flex items-center justify-center text-xs font-semibold text-muted`}>
      {userName(u)[0]?.toUpperCase()}
    </div>
  );
}
/** Build ranked groups from a flat order + set of users tied with the entry above them */
export function computeGroups(order: string[], tiedAbove: Set<string>): string[][] {
  const groups: string[][] = [];
  for (const uid of order) {
    if (tiedAbove.has(uid) && groups.length > 0) {
      groups[groups.length - 1].push(uid);
    } else {
      groups.push([uid]);
    }
  }
  return groups;
}
/** Gleiche Platzierungsgruppen (Reihenfolge innerhalb eines Gleichstands egal)? */
export function sameGroups(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false;
  return a.every((g, i) => g.length === b[i].length && g.every(uid => b[i].includes(uid)));
}
/** Standard competition ranking: tied users share a placement, next group skips */
export function computePlacementMap(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  let place = 1;
  for (const group of groups) {
    for (const uid of group) map.set(uid, place);
    place += group.length;
  }
  return map;
}

/** Eine Buchung aus dem Abschluss (PointTransaction), für das Protokoll auf der Abschluss-Seite */
export type RewardHistoryEntry = { at: string; name: string; amount: number; reason: string };

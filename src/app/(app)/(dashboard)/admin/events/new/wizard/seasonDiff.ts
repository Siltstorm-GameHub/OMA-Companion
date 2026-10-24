// "Was ändert sich gegenüber der Vorsaison?" — vergleicht die aus der alten Saison übernommenen Werte
// (SeasonPrefill) mit dem aktuellen Stand im Saison-Assistenten. Reine Funktion, siehe seasonDiff.test.ts.
import type { TournamentTemplate } from "@/lib/series-seasons";
import type { PlacementReward, PollConfig, SeasonPrefill, StatRow } from "./shared";

export type SeasonState = {
  name: string;
  category: string;
  eventType: "community" | "tournament";
  variousGames: boolean;
  fixedGame: string;
  seriesFormat: string;
  recurrenceType: string;
  spectatorMode: boolean;
  statParticipationPts: number;
  statSpectatorParticipationPts: number;
  statRows: StatRow[];
  eventStatFields: string[];
  winnerStatField: string;
  participationCoins: number;
  placements: PlacementReward[];
  polls: PollConfig[];
  dominion: { enabled: boolean; triggerStats: string[]; threshold: number; coins: number; seriesPoints: number };
  seriesHidden: boolean;
  seriesRegistrationLocked: boolean;
  seriesSquadId: string;
  tournamentTemplate: TournamentTemplate;
};

const yesNo = (b: boolean) => (b ? "an" : "aus");

function templateLabel(t: TournamentTemplate): string[] {
  const out: string[] = [];
  if (t.groupStage) {
    const gs = t.groupStage;
    out.push(`Gruppenphase ${gs.groupCount} Gruppen, ${gs.advancePerGroup} weiter`
      + (gs.groupLegs === 2 ? ", Hin & Rück" : "")
      + (gs.knockoutLegs === 2 ? `, K.O. Hin & Rück${gs.singleLegFinal !== false ? " (Finale einfach)" : ""}` : "")
      + (gs.thirdPlaceMatch ? ", Spiel um Platz 3" : ""));
  }
  if (t.checkInEnabled) out.push(`Check-in ${t.checkInMinutes ?? 30} Min.`);
  if (t.matchResultPoints) out.push(`Liga ${t.matchResultPoints.win}/${t.matchResultPoints.draw} Münzen je Sieg/Remis`);
  return out;
}

/** Liste lesbarer Änderungen, leer = alles wie in der Vorsaison. */
export function seasonChanges(prev: SeasonPrefill, cur: SeasonState): string[] {
  const out: string[] = [];
  const changed = (label: string, a: string | number, b: string | number) => {
    if (a !== b) out.push(`${label}: ${a === "" ? "–" : a} → ${b === "" ? "–" : b}`);
  };

  changed("Kategorie", prev.category, cur.category);
  if (prev.eventType !== cur.eventType) out.push(`Reihentyp: ${prev.eventType === "tournament" ? "Turnier" : "Community"} → ${cur.eventType === "tournament" ? "Turnier" : "Community"}`);
  changed("Spiel", prev.variousGames ? "verschiedene" : prev.fixedGame, cur.variousGames ? "verschiedene" : cur.fixedGame);
  if (cur.eventType === "tournament") changed("Format", prev.seriesFormat, cur.seriesFormat);
  changed("Wiederholung", prev.recurrenceType, cur.recurrenceType);
  if (prev.spectatorMode !== cur.spectatorMode) out.push(`Zuschauer-Modus: ${yesNo(prev.spectatorMode)} → ${yesNo(cur.spectatorMode)}`);

  // Punkte der Gesamttabelle
  changed("Ligapunkte je Teilnahme", prev.statParticipationPts, cur.statParticipationPts);
  if (cur.spectatorMode) changed("Ligapunkte je Zuschauer-Teilnahme", prev.statSpectatorParticipationPts, cur.statSpectatorParticipationPts);
  const prevStats = new Map(prev.statRows.filter(r => r.field).map(r => [r.field, r]));
  const curStats = new Map(cur.statRows.filter(r => r.field).map(r => [r.field, r]));
  for (const [field, r] of curStats) {
    const p = prevStats.get(field);
    if (!p) out.push(`+ Stat „${field}“ (${r.pointsPer} Pkt.)`);
    else if (p.pointsPer !== r.pointsPer) out.push(`Stat „${field}“: ${p.pointsPer} → ${r.pointsPer} Pkt.`);
    else if (!!p.isWinnerStat !== !!r.isWinnerStat || !!p.isMatchWinStat !== !!r.isMatchWinStat) out.push(`Stat „${field}“: Sieger-/Match-Win-Zuordnung geändert`);
  }
  for (const field of prevStats.keys()) if (!curStats.has(field)) out.push(`− Stat „${field}“`);
  const prevEv = new Set(prev.eventStatFields);
  const curEv = new Set(cur.eventStatFields);
  for (const fld of curEv) if (!prevEv.has(fld)) out.push(`+ erfasster Wert „${fld}“`);
  for (const fld of prevEv) if (!curEv.has(fld)) out.push(`− erfasster Wert „${fld}“`);
  changed("Sieger über", prev.winnerStatField, cur.winnerStatField);

  // Belohnungen
  changed("Teilnahme-Münzen", prev.participationCoins, cur.participationCoins);
  const places = [...new Set([...prev.placements, ...cur.placements].map(p => p.place))].sort((a, b) => a - b);
  for (const place of places) {
    const p = prev.placements.find(x => x.place === place);
    const c = cur.placements.find(x => x.place === place);
    const fmt = (r?: PlacementReward) => (r ? `${r.coins} Münzen${r.rankPoints > 0 ? ` + ${r.rankPoints} RP` : ""}` : "–");
    if (fmt(p) !== fmt(c)) out.push(`Endplatzierung ${place}.: ${fmt(p)} → ${fmt(c)}`);
  }
  const prevPolls = new Set(prev.polls.map(p => p.label));
  const curPolls = new Set(cur.polls.map(p => p.label));
  for (const l of curPolls) if (!prevPolls.has(l)) out.push(`+ Umfrage „${l}“`);
  for (const l of prevPolls) if (!curPolls.has(l)) out.push(`− Umfrage „${l}“`);

  // Dominion
  if (prev.dominion.enabled !== cur.dominion.enabled) out.push(`Dominion Bonus: ${yesNo(prev.dominion.enabled)} → ${yesNo(cur.dominion.enabled)}`);
  else if (cur.dominion.enabled) {
    changed("Dominion-Schwelle", prev.dominion.threshold, cur.dominion.threshold);
    changed("Dominion-Ligapunkte", prev.dominion.seriesPoints, cur.dominion.seriesPoints);
    changed("Dominion-Münzen", prev.dominion.coins, cur.dominion.coins);
  }

  // Turniervorlage
  if (cur.eventType === "tournament") {
    const a = templateLabel(prev.tournamentTemplate).join(" · ");
    const b = templateLabel(cur.tournamentTemplate).join(" · ");
    if (a !== b) out.push(`Turniervorlage: ${a || "keine"} → ${b || "keine"}`);
  }

  // Sichtbarkeit & Anmeldung
  if (prev.seriesHidden !== cur.seriesHidden) out.push(`Sichtbarkeit: ${prev.seriesHidden ? "unsichtbar" : "sichtbar"} → ${cur.seriesHidden ? "unsichtbar" : "sichtbar"}`);
  if (prev.seriesRegistrationLocked !== cur.seriesRegistrationLocked) out.push(`Selbst-Anmeldung: ${prev.seriesRegistrationLocked ? "gesperrt" : "offen"} → ${cur.seriesRegistrationLocked ? "gesperrt" : "offen"}`);
  if (prev.seriesSquadId !== cur.seriesSquadId) out.push("Squad-Beschränkung geändert");

  return out;
}

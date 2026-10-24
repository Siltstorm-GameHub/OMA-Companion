import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { seasonChanges, type SeasonState } from "./seasonDiff";
import type { SeasonPrefill } from "./shared";

const prev: SeasonPrefill = {
  oldSeriesId: "s1", oldSeriesName: "Cup – Saison 1", groupId: "g", seasonNumber: 2, name: "Cup – Saison 2",
  description: "", category: "competitive", eventType: "tournament", fixedGenre: null, platforms: [],
  variousGames: false, fixedGame: "Rocket League", seriesFormat: "group_knockout", seriesDiscordId: "",
  recurrenceType: "weekly", recurrenceMonthlyMode: "dayOfMonth", seriesHidden: false, seriesRegistrationLocked: false,
  seriesSquadId: "", spectatorMode: false, spectatorCoins: 5, spectatorRankPts: 0, statParticipationPts: 5,
  statSpectatorParticipationPts: 3, statPtsToGlobalRanking: false,
  statRows: [{ field: "Sieg", pointsPer: 25, isWinnerStat: true }, { field: "Tore", pointsPer: 1 }],
  eventStatFields: ["Tore"], winnerStatField: "", participationCoins: 10, participationRankPts: 0,
  placements: [{ place: 1, coins: 500, rankPoints: 3 }], polls: [],
  tournamentTemplate: { checkInEnabled: true, checkInMinutes: 30 },
  dominion: { enabled: false, triggerStats: [], threshold: 3, coins: 0, seriesPoints: 5 },
};
const same = (): SeasonState => ({
  name: prev.name, category: prev.category, eventType: prev.eventType, variousGames: prev.variousGames, fixedGame: prev.fixedGame,
  seriesFormat: prev.seriesFormat, recurrenceType: prev.recurrenceType, spectatorMode: prev.spectatorMode,
  statParticipationPts: prev.statParticipationPts, statSpectatorParticipationPts: prev.statSpectatorParticipationPts,
  statRows: prev.statRows.map(r => ({ ...r })), eventStatFields: [...prev.eventStatFields], winnerStatField: prev.winnerStatField,
  participationCoins: prev.participationCoins, placements: prev.placements.map(p => ({ ...p })), polls: [],
  dominion: { ...prev.dominion }, seriesHidden: false, seriesRegistrationLocked: false, seriesSquadId: "",
  tournamentTemplate: { checkInEnabled: true, checkInMinutes: 30 },
});

describe("seasonChanges", () => {
  test("unverändert übernommen → keine Änderungen", () => {
    assert.deepEqual(seasonChanges(prev, same()), []);
  });
  test("neue Stats, geänderte Punkte und Turniervorlage werden genannt", () => {
    const cur = same();
    cur.statRows = [{ field: "Sieg", pointsPer: 30, isWinnerStat: true }, { field: "Assists", pointsPer: 1 }];
    cur.eventStatFields = ["Tore", "Assists"];
    cur.placements = [{ place: 1, coins: 600, rankPoints: 3 }];
    cur.tournamentTemplate = { checkInEnabled: true, checkInMinutes: 30, groupStage: { groupCount: 4, advancePerGroup: 2 } };
    const changes = seasonChanges(prev, cur);
    assert.ok(changes.includes("Stat „Sieg“: 25 → 30 Pkt."));
    assert.ok(changes.includes("+ Stat „Assists“ (1 Pkt.)"));
    assert.ok(changes.includes("− Stat „Tore“"));
    assert.ok(changes.includes("+ erfasster Wert „Assists“"));
    assert.ok(changes.includes("Endplatzierung 1.: 500 Münzen + 3 RP → 600 Münzen + 3 RP"));
    assert.ok(changes.some(c => c.startsWith("Turniervorlage: Check-in 30 Min. → Gruppenphase 4 Gruppen")));
  });
});

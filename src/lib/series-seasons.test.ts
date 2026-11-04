import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStatAliases, buildAllTimeStandings, isOpenSeasonEvent, parseStatAliases, parseTournamentTemplate,
  previousSeasonBadges, resolveStatAlias, seasonPlacements, seasonStandings, serializeTournamentTemplate,
  templateEventFields,
} from "./series-seasons";
import type { SeriesStandingRow } from "./series-event-points";

const row = (userId: string, totalPoints: number, participations: number, stats: Record<string, number> = {}): SeriesStandingRow => ({
  userId, totalPoints, participations, spectatorParticipations: 0, stats, hasLegacy: false, disqualifiedEventCount: 0,
});

describe("seasonPlacements", () => {
  test("Gleichstand teilt sich den Platz, der nächste rückt entsprechend nach", () => {
    const p = seasonPlacements({ finalRankingGroups: [["a", "b"], ["c"], ["d"]] });
    assert.deepEqual([...p], [["a", 1], ["b", 1], ["c", 3], ["d", 4]]);
  });
  test("ohne Gruppen gilt die einfache Reihenfolge", () => {
    assert.deepEqual([...seasonPlacements({ finalRanking: ["x", "y"] })], [["x", 1], ["y", 2]]);
    assert.equal(seasonPlacements({}).size, 0);
  });
});

describe("seasonStandings", () => {
  const ev = {
    id: "e1", status: "finished", finalRankingJson: null,
    completionData: JSON.stringify({ gamePhaseComplete: true }),
    registrations: [{ userId: "live", role: "player" }],
    matches: [],
  };
  test("abgeschlossene Saison: gespeicherte Endtabelle hat Vorrang", () => {
    const rows = seasonStandings({
      status: "archived", seriesStatConfig: JSON.stringify({ participationPoints: 5, stats: [] }), legacyStandings: null,
      seriesCompletionData: JSON.stringify({ finalStandings: { rows: [row("snap", 99, 3)], capturedAt: "x" } }),
      events: [ev],
    });
    assert.deepEqual(rows.map(r => r.userId), ["snap"]);
  });
  test("aktive Saison oder alter Abschluss ohne Endtabelle: live mit eigener Konfiguration", () => {
    const rows = seasonStandings({
      status: "archived", seriesStatConfig: JSON.stringify({ participationPoints: 5, stats: [] }), legacyStandings: null,
      seriesCompletionData: JSON.stringify({ overallWinnerIds: ["live"] }),
      events: [ev],
    });
    assert.deepEqual(rows.map(r => [r.userId, r.totalPoints]), [["live", 5]]);
  });
});

describe("Stat-Aliase", () => {
  test("Ketten werden aufgelöst, Zyklen brechen ab", () => {
    assert.equal(resolveStatAlias("Elims", { Elims: "Eliminierungen", Eliminierungen: "Kills" }), "Kills");
    assert.equal(resolveStatAlias("A", { A: "B", B: "A" }), "B");
  });
  test("ungültige Einträge werden verworfen", () => {
    assert.deepEqual(parseStatAliases(JSON.stringify({ A: "A", B: "", C: 3, D: "Kills" })), { D: "Kills" });
    assert.deepEqual(parseStatAliases("kaputt"), {});
  });
  test("zusammengeführte Felder werden addiert", () => {
    const [r] = applyStatAliases([row("a", 0, 1, { Kills: 2, Elims: 3, Siege: 1 })], { Elims: "Kills" });
    assert.deepEqual(r.stats, { Kills: 5, Siege: 1 });
  });
});

describe("buildAllTimeStandings", () => {
  test("Saisons, Titel und Ø Platz", () => {
    const rows = buildAllTimeStandings([
      { rows: [row("a", 30, 3), row("b", 20, 2)], placements: new Map([["a", 1], ["b", 2]]) },
      { rows: [row("b", 40, 3), row("a", 10, 1), row("c", 5, 1)], placements: new Map([["b", 1], ["a", 3], ["c", 2]]) },
      // aktive Saison: noch ohne Endplatzierung
      { rows: [row("a", 5, 1)], placements: null },
    ]);
    const by = Object.fromEntries(rows.map(r => [r.userId, r]));
    assert.deepEqual(rows.map(r => r.userId), ["b", "a", "c"]);
    assert.equal(by.a.totalPoints, 45);
    assert.equal(by.a.stats.Saisons, 3);
    assert.equal(by.a.stats.Titel, 1);
    assert.equal(by.a.stats["Ø Platz"], 2);
    assert.equal(by.b.stats.Titel, 1);
    assert.equal(by.b.stats["Ø Platz"], 1.5);
    assert.equal(by.c.stats.Saisons, 1);
  });
  test("reine Zuschauer zählen nicht als gespielte Saison", () => {
    const [r] = buildAllTimeStandings([{ rows: [{ ...row("z", 2, 0), spectatorParticipations: 2 }], placements: null }]);
    assert.equal(r.stats.Saisons, 0);
    assert.equal(r.stats["Ø Platz"], 0);
  });
});

describe("previousSeasonBadges", () => {
  test("Platz 1 = Titelverteidiger, 2/3 mit Platz, Rest ohne", () => {
    assert.deepEqual(previousSeasonBadges(new Map([["a", 1], ["b", 2], ["c", 3], ["d", 4]])), {
      a: "Titelverteidiger", b: "Vorsaison 2.", c: "Vorsaison 3.",
    });
  });
});

describe("isOpenSeasonEvent", () => {
  test("offen bis zur abgeschlossenen Spielphase", () => {
    assert.equal(isOpenSeasonEvent({ status: "open", completionData: null }), true);
    assert.equal(isOpenSeasonEvent({ status: "umfrage", completionData: JSON.stringify({ gamePhaseComplete: true }) }), false);
    assert.equal(isOpenSeasonEvent({ status: "finished", completionData: null }), false);
  });
});

describe("Turniervorlage", () => {
  test("normalisiert und verwirft Unsinn", () => {
    const t = parseTournamentTemplate(JSON.stringify({
      groupStage: { groupCount: 4, advancePerGroup: 2, knockoutLegs: 2 },
      checkInEnabled: true, checkInMinutes: 2,
      matchResultPoints: { win: -5, draw: "10" },
    }));
    assert.equal(t.groupStage?.groupCount, 4);
    assert.equal(t.groupStage?.knockoutLegs, 2);
    assert.equal(t.checkInMinutes, 30, "unter 5 Minuten → Standard");
    assert.deepEqual(t.matchResultPoints, { win: 0, draw: 10 });
    assert.equal(serializeTournamentTemplate({}), null);
    assert.equal(serializeTournamentTemplate({ checkInEnabled: false }), null);
  });
  test("ein Termin übernimmt nur, was zu seinem Format passt", () => {
    const t = parseTournamentTemplate(JSON.stringify({
      groupStage: { groupCount: 2, advancePerGroup: 1 }, checkInEnabled: true, checkInMinutes: 15, matchResultPoints: { win: 20, draw: 5 },
    }));
    const ko = templateEventFields(t, "single_elimination");
    assert.equal(ko.groupStageJson, undefined);
    assert.equal(ko.pointsConfig, undefined);
    assert.equal(ko.checkInMinutes, 15);
    assert.ok(templateEventFields(t, "group_knockout").groupStageJson);
    assert.equal(templateEventFields(t, "liga").pointsConfig, JSON.stringify({ win: 20, draw: 5 }));
  });
  test("Community-Ziel: wird eingelesen, aber nicht in Termine kopiert (Termine erben es)", () => {
    const t = parseTournamentTemplate(JSON.stringify({
      communityGoal: { fields: ["Schritte", "Minuten"], target: 1_000_000, scope: "community", unit: "Schritte" },
    }));
    assert.deepEqual(t.communityGoal?.fields, ["Schritte", "Minuten"]);
    assert.equal("statConfigJson" in templateEventFields(t, "coop_stats", ["Schritte"]), false);
    // Unvollständiges Ziel wird beim Einlesen verworfen
    assert.equal(parseTournamentTemplate(JSON.stringify({ communityGoal: { fields: [], target: 5 } })).communityGoal, undefined);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  rankingWithTies,
  dateBlock, dayBucket, eventPhase, friendsFirst, placementOf, recommendationScore, relevanceTags,
  startsInLabel, urgencyHint,
} from "./event-display";

// So 15.11.2026, 13:00 Berlin (MEZ = UTC+1)
const NOW = new Date("2026-11-15T12:00:00Z");

describe("eventPhase", () => {
  test("Normalfall bekommt kein Signal", () => {
    const p = eventPhase({ status: "open", startAt: "2026-11-20T19:00:00Z", playerCount: 3, maxPlayers: 16 }, NOW);
    assert.equal(p.phase, "open");
    assert.equal(p.label, null);
  });

  test("laufend: Live, aber Zeitraum-Events ruhig mit Restlaufzeit", () => {
    assert.equal(eventPhase({ status: "active", startAt: NOW, playerCount: 2 }, NOW).label, "Live");
    const period = eventPhase({ status: "active", startAt: "2026-11-12T12:00:00Z", endAt: "2026-11-19T12:00:00Z", playerCount: 2 }, NOW);
    assert.equal(period.phase, "period");
    assert.equal(period.label, "Noch 4 Tage");
    assert.ok(period.progress! > 0.4 && period.progress! < 0.5);
  });

  test("voll nur für Nicht-Angemeldete, Umfrage und Spielwahl violett", () => {
    const full = { status: "open", startAt: "2026-11-20T19:00:00Z", playerCount: 16, maxPlayers: 16 };
    assert.equal(eventPhase(full, NOW).phase, "full");
    assert.equal(eventPhase({ ...full, isRegistered: true }, NOW).phase, "open");
    assert.equal(eventPhase({ status: "closed", startAt: NOW, playerCount: 1 }, NOW).phase, "full");
    assert.equal(eventPhase({ status: "umfrage", startAt: NOW, playerCount: 1 }, NOW).tone, "violet");
    assert.equal(eventPhase({ status: "open", startAt: NOW, playerCount: 1, gameVoteOpen: true }, NOW).phase, "gamevote");
  });
});

describe("Datum", () => {
  test("Gruppen nach Berlin-Kalendertag", () => {
    assert.equal(dayBucket("2026-11-15T22:30:00Z", NOW), "today"); // 23:30 Berlin, gleicher Tag
    assert.equal(dayBucket("2026-11-15T23:30:00Z", NOW), "week"); // 00:30 Berlin, schon Montag
    assert.equal(dayBucket("2026-11-21T19:00:00Z", NOW), "week");
    assert.equal(dayBucket("2026-11-22T19:00:00Z", NOW), "later");
    assert.equal(dayBucket("2026-11-30T19:00:00Z", NOW, true), "today");
  });

  test("Kalenderblock und Countdown", () => {
    assert.deepEqual(dateBlock("2026-11-15T19:00:00Z", NOW), { top: "HEUTE", weekday: "SO", day: "15", time: "20:00" });
    assert.deepEqual(dateBlock("2026-11-16T19:00:00Z", NOW), { top: "MORGEN", weekday: "MO", day: "16", time: "20:00" });
    assert.deepEqual(dateBlock("2026-11-21T19:00:00Z", NOW), { top: "SA", weekday: "SA", day: "21", time: "20:00" });
    assert.equal(startsInLabel("2026-11-15T12:45:00Z", NOW), "in 45 Min");
    assert.equal(startsInLabel("2026-11-15T14:14:00Z", NOW), "in 2 Std 14 Min");
    assert.equal(startsInLabel("2026-11-16T19:00:00Z", NOW), "morgen");
    assert.equal(startsInLabel("2026-11-20T19:00:00Z", NOW), "in 5 Tagen");
    assert.equal(startsInLabel("2026-11-15T11:00:00Z", NOW), null);
  });
});

describe("Dringlichkeit, Relevanz, Ergebnisse", () => {
  test("nur echte Knappheit", () => {
    const base = { startAt: "2026-11-20T19:00:00Z", maxPlayers: 10 };
    assert.equal(urgencyHint({ ...base, playerCount: 8 }, NOW), "Noch 2 Plätze");
    assert.equal(urgencyHint({ ...base, playerCount: 9 }, NOW), "Noch 1 Platz");
    assert.equal(urgencyHint({ ...base, playerCount: 5 }, NOW), null);
    assert.equal(urgencyHint({ ...base, playerCount: 9, isRegistered: true }, NOW), null);
    assert.equal(urgencyHint({ startAt: "2026-11-15T12:20:00Z", playerCount: 1 }, NOW), "Startet in 20 Min");
  });

  test("Relevanz-Tags und Empfehlungs-Punkte", () => {
    const ctx = { myGameKeys: new Set(["rocketleague"]), mySquadIds: new Set(["sq1"]) };
    assert.deepEqual(relevanceTags({ game: "Rocket League ", squadId: "sq1" }, ctx), ["Dein Spiel", "Dein Squad"]);
    assert.deepEqual(relevanceTags({ game: "CS2", squadId: null }, ctx), []);
    assert.ok(recommendationScore(["Dein Spiel"], false) > recommendationScore([], true));
  });

  test("Platzierung und Freunde zuerst", () => {
    assert.equal(placementOf('["a","b","c"]', "c"), 3);
    assert.equal(placementOf('["a"]', "x"), null);
    assert.equal(placementOf("kaputt", "a"), null);
    const users = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(friendsFirst(users, new Set(["c"])).map(u => u.id), ["c", "a", "b"]);
  });
});

describe("rankingWithTies", () => {
  test("ohne Gruppen: flache Rangliste", () => {
    assert.deepEqual(rankingWithTies(["a", "b", "c"], null, "c"), { place: 3, winnerIds: ["a"] });
    assert.deepEqual(rankingWithTies([], null, "c"), { place: 0, winnerIds: [] });
  });
  test("Gleichstand: geteilte Plätze, alle Erstplatzierten", () => {
    const groups = [["a", "b"], ["c"], ["d", "e"], ["f"]];
    assert.deepEqual(rankingWithTies(["a", "b", "c", "d", "e", "f"], groups, "b"), { place: 1, winnerIds: ["a", "b"] });
    assert.deepEqual(rankingWithTies([], groups, "c"), { place: 3, winnerIds: ["a", "b"] });
    assert.deepEqual(rankingWithTies([], groups, "e"), { place: 4, winnerIds: ["a", "b"] });
    assert.deepEqual(rankingWithTies([], groups, "x"), { place: 0, winnerIds: ["a", "b"] });
  });
});

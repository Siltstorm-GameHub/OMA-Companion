import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  bracketSeedOrder, drawPreview, groupSizes, isDrawFormat, orderBySeed, potGroups, seededBracketSlots, tooFewPlayersMessage,
} from "./draw-plan";
import { bracketFromSlots } from "./generate";

describe("Setzliste", () => {
  test("Setz-Reihenfolge: 1 und 2 nur im Finale", () => {
    assert.deepEqual(bracketSeedOrder(4), [1, 4, 2, 3]);
    assert.deepEqual(bracketSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  });

  test("Gesetzter Baum: Freilose an die besten Setzplätze, nie zwei in einem Match", () => {
    const ids = ["a", "b", "c", "d", "e"]; // a = stärkster
    const slots = seededBracketSlots(ids);
    assert.equal(slots.length, 8);
    for (let i = 0; i < 8; i += 2) assert.ok(slots[i] || slots[i + 1], "Match ohne Spieler");
    const matches = bracketFromSlots(slots, "ev");
    const byeWinners = matches.filter(m => m.round === 1 && m.winnerId && (!m.player1Id || !m.player2Id)).map(m => m.winnerId);
    assert.deepEqual(byeWinners.sort(), ["a", "b", "c"]);
  });

  test("Nach Punkten sortiert, höchste zuerst", () => {
    const order = orderBySeed(["x", "y", "z"], new Map([["x", 1], ["y", 30], ["z", 10]]));
    assert.deepEqual(order, ["y", "z", "x"]);
  });
});

describe("Lostöpfe", () => {
  test("Die Stärksten landen in verschiedenen Gruppen, Größen gleichmäßig", () => {
    const ids = ["s1", "s2", "s3", "a", "b", "c", "d"];
    const groups = potGroups(ids, 3);
    const tops = groups.map(g => g[0]).sort();
    assert.deepEqual(tops, ["s1", "s2", "s3"]);
    assert.deepEqual(groups.map(g => g.length).sort(), [2, 2, 3]);
    assert.equal(groups.flat().length, 7);
  });
});

describe("Vorschau", () => {
  test("K.O.-Baum", () => {
    assert.equal(drawPreview("single_elimination", 11), "11 Spieler → 16er-Baum, 5 Freilose, 4 Runden, 10 Spiele");
    assert.equal(drawPreview("single_elimination", 8), "8 Spieler → 8er-Baum, 3 Runden, 7 Spiele");
  });
  test("Liga und Jeder gegen jeden", () => {
    assert.equal(drawPreview("round_robin", 4), "4 Spieler → 3 Spieltage, 6 Spiele");
    assert.equal(drawPreview("liga", 5), "5 Spieler → 10 Spieltage, 20 Spiele, je Spieltag ist einer spielfrei");
  });
  test("Gruppen", () => {
    assert.deepEqual(groupSizes(10, 3), [4, 3, 3]);
    assert.equal(drawPreview("group_knockout", 10, { groupCount: 3 }), "10 Spieler → 3 Gruppen (4/3/3), 12 Gruppenspiele");
  });
  test("Zu wenige Spieler", () => {
    assert.equal(tooFewPlayersMessage(1, 0), "Nur 1 Spieler angemeldet, mindestens 2 nötig.");
    assert.equal(tooFewPlayersMessage(1, 3), "Nur 1 Spieler bereit, mindestens 2 nötig. 3 angemeldete Spieler sind noch nicht bereit.");
  });
  test("Formate mit Auslosung", () => {
    assert.ok(isDrawFormat("liga"));
    assert.ok(!isDrawFormat("coop_stats"));
    assert.ok(!isDrawFormat(null));
  });
});

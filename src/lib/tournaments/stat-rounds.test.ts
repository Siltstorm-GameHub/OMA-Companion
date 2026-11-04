import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isStatFormat, nextStatRoundNumber, sortStatRounds, statRoundLabel, supportsMatchWin } from "./stat-rounds";

describe("stat-rounds", () => {
  test("Label: Nummer plus Zusatz, wiederholte Nummer im Titel entfällt", () => {
    assert.equal(statRoundLabel({ position: 3, title: "Server A" }), "Runde 3 · Server A");
    assert.equal(statRoundLabel({ position: 3, title: null }), "Runde 3");
    assert.equal(statRoundLabel({ position: 3, title: " runde 3 " }), "Runde 3");
    assert.equal(statRoundLabel({ position: 3, title: "Runde 4" }), "Runde 3 · Runde 4");
  });

  test("nächste Nummer = höchste + 1, Lücken bleiben frei", () => {
    assert.equal(nextStatRoundNumber([]), 1);
    assert.equal(nextStatRoundNumber([{ position: 1 }, { position: 2 }, { position: 4 }]), 5);
  });

  test("sortiert nach Nummer, nachgetragene Runde landet an ihrer Stelle", () => {
    const sorted = sortStatRounds([{ position: 1, id: "a" }, { position: 4, id: "b" }, { position: 3, id: "c" }]);
    assert.deepEqual(sorted.map(m => m.id), ["a", "c", "b"]);
  });

  test("Stat-Formate", () => {
    assert.ok(isStatFormat("coop_stats") && isStatFormat("avg_stats") && isStatFormat("ffa"));
    assert.ok(!isStatFormat("liga") && !isStatFormat(null));
  });
});

describe("supportsMatchWin", () => {
  test("Punktewertung und Durchschnittswerte erfassen Match Wins, andere Formate nicht", () => {
    assert.equal(supportsMatchWin("coop_stats"), true);
    assert.equal(supportsMatchWin("avg_stats"), true);
    assert.equal(supportsMatchWin("ffa"), false);
    assert.equal(supportsMatchWin("round_robin"), false);
    assert.equal(supportsMatchWin(null), false);
  });
});

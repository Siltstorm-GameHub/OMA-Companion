import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { feederMatches, koStatus, nextOpponents } from "./player-path";

const m = (id: string, round: number, position: number, p1: string | null, p2: string | null, winnerId: string | null = null) =>
  ({ id, round, position, player1Id: p1, player2Id: p2, winnerId });

const bracket = [
  m("q1", 1, 1, "anna", "ben", "anna"),
  m("q2", 1, 2, "carla", "dennis", "dennis"),
  m("q3", 1, 3, "emre", "fritzi"),
  m("q4", 1, 4, "gero", "hanna"),
  m("s1", 2, 1, "anna", "dennis"),
  m("s2", 2, 2, null, null),
  m("f", 3, 1, null, null),
];

describe("Spieler-Weg im K.O.-Baum", () => {
  test("Status: im Turnier, ausgeschieden, nicht dabei, Sieger", () => {
    assert.deepEqual(koStatus(bracket, "anna"), { kind: "alive", roundLabel: "Halbfinale" });
    assert.deepEqual(koStatus(bracket, "ben"), { kind: "eliminated", roundLabel: "Viertelfinale", byUserId: "anna" });
    assert.deepEqual(koStatus(bracket, "zoe"), { kind: "none" });
    const done = [m("s1", 1, 1, "a", "b", "a"), m("s2", 1, 2, "c", "d", "c"), m("f", 2, 1, "a", "c", "a")];
    assert.deepEqual(koStatus(done, "a"), { kind: "champion" });
    assert.deepEqual(koStatus(done, "c"), { kind: "eliminated", roundLabel: "Finale", byUserId: "a" });
  });

  test("Nächster Gegner: offene Nachbar-Paarung, entschiedene, Finale", () => {
    assert.deepEqual(nextOpponents(bracket, bracket[2]), { roundLabel: "Halbfinale", userIds: ["gero", "hanna"] });
    const withWinner = bracket.map(x => x.id === "q4" ? { ...x, winnerId: "hanna" } : x);
    assert.deepEqual(nextOpponents(withWinner, withWinner[2]), { roundLabel: "Halbfinale", userIds: ["hanna"] });
    // Nachbar-Halbfinale noch ganz offen → kein Hinweis
    assert.equal(nextOpponents(bracket, bracket[4]), null);
    assert.equal(nextOpponents(bracket, bracket[6]), null);
  });

  test("Gegner steht im nächsten Match schon fest", () => {
    const b = bracket.map(x => x.id === "s2" ? { ...x, player2Id: "hanna" } : x);
    assert.deepEqual(nextOpponents(b, b[2]), { roundLabel: "Halbfinale", userIds: ["hanna"] });
  });

  test("Vorrunden einer Paarung", () => {
    assert.deepEqual(feederMatches(bracket, bracket[4]).map(x => x.id), ["q1", "q2"]);
    assert.deepEqual(feederMatches(bracket, bracket[0]), []);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bracketColumns } from "./bracket-tree";

type O = Partial<{ p1: string | null; p2: string | null; s1: number; s2: number; winner: string; live: boolean; leg: number; third: boolean; group: number }>;
const m = (id: string, round: number, position: number, o: O = {}) => ({
  id, round, position,
  player1Id: o.p1 === undefined ? `${id}a` : o.p1, player2Id: o.p2 === undefined ? `${id}b` : o.p2,
  score1: o.s1 ?? null, score2: o.s2 ?? null,
  winnerId: o.winner ?? null, playedAt: o.winner ? "2026-11-16T10:00:00Z" : null,
  startedAt: o.live ? "2026-11-16T10:00:00Z" : null,
  leg: o.leg ?? null, isThirdPlace: o.third ?? false, groupIndex: o.group ?? null,
});

describe("K.O.-Baum: Spalten", () => {
  test("Runden links nach rechts mit Bezeichnungen, Positionen sortiert", () => {
    const { columns, thirdPlace } = bracketColumns([
      m("f", 3, 1),
      m("q2", 1, 2, { s1: 1, s2: 3, winner: "q2b" }),
      m("q1", 1, 1, { s1: 2, s2: 0, winner: "q1a" }),
      m("q3", 1, 3), m("q4", 1, 4),
      m("h1", 2, 1, { live: true }), m("h2", 2, 2),
    ]);
    assert.deepEqual(columns.map(c => c.label), ["Viertelfinale", "Halbfinale", "Finale"]);
    assert.deepEqual(columns[0].slots.map(s => s.position), [1, 2, 3, 4]);
    assert.equal(columns[0].slots[1].winnerId, "q2b");
    assert.equal(columns[0].slots[1].total2, 3);
    assert.equal(columns[1].slots[0].live, true);
    assert.equal(columns[2].slots[0].total1, null);
    assert.equal(thirdPlace, null);
  });

  test("Hin- und Rückspiel werden eine Paarung, getauschte Seiten umgerechnet", () => {
    const { columns } = bracketColumns([
      m("a1", 1, 1, { p1: "x", p2: "y", s1: 2, s2: 1, leg: 1, winner: "x" }),
      m("a2", 1, 1, { p1: "y", p2: "x", s1: 3, s2: 0, leg: 2, winner: "y" }),
    ]);
    const s = columns[0].slots[0];
    assert.equal(s.matches.length, 2);
    assert.deepEqual(s.legs, [{ s1: 2, s2: 1 }, { s1: 0, s2: 3 }]);
    assert.equal(s.total1, 2);
    assert.equal(s.total2, 4);
    assert.equal(s.winnerId, "y");
  });

  test("Offenes Rückspiel wird beim Antippen geöffnet", () => {
    const { columns } = bracketColumns([
      m("a1", 1, 1, { p1: "x", p2: "y", s1: 2, s2: 1, leg: 1, winner: "x" }),
      m("a2", 1, 1, { p1: "y", p2: "x", leg: 2 }),
    ]);
    assert.equal(columns[0].slots[0].focus.id, "a2");
    assert.equal(columns[0].slots[0].winnerId, null);
  });

  test("Freilos, Spiel um Platz 3 und Gruppenspiele", () => {
    const { columns, thirdPlace } = bracketColumns([
      m("g", 1, 1, { group: 0 }),
      m("b", 1, 1, { p2: null, winner: "ba" }),
      m("c", 1, 2),
      m("f", 2, 1),
      m("t", 2, 2, { third: true }),
    ]);
    assert.equal(columns.length, 2);
    assert.equal(columns[0].slots[0].bye, true);
    assert.equal(columns[0].slots[0].matches[0].id, "b");
    assert.equal(columns[1].label, "Finale");
    assert.equal(columns[1].slots.length, 1);
    assert.equal(thirdPlace?.matches[0].id, "t");
  });
});

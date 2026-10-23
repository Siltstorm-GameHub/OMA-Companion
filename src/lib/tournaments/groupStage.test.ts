import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGroupStandings, drawGroups, generateGroupMatches, generateKnockoutMatches, seedKnockout,
  validateGroupStageConfig, groupLetter, type GroupMatchLike,
} from "./groupStage";

/** Gruppe, in der der erste Spieler alle schlägt, der zweite alle außer dem ersten usw. */
function playedGroup(groupIndex: number, ids: string[]): GroupMatchLike[] {
  const matches: GroupMatchLike[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({ groupIndex, player1Id: ids[i], player2Id: ids[j], winnerId: ids[i], score1: 2, score2: 0, playedAt: new Date() });
    }
  }
  return matches;
}

describe("Gruppenphase + K.O.", () => {
  test("Auslosung verteilt gleichmäßig und erzeugt jeder-gegen-jeden je Gruppe", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const groups = drawGroups(ids, 3);
    assert.deepEqual(groups.map(g => g.length).sort(), [3, 3, 4]);
    assert.deepEqual(groups.flat().sort(), [...ids].sort());
    const matches = generateGroupMatches(groups, "e");
    assert.equal(matches.length, 3 + 3 + 6);
    for (const m of matches) {
      assert.ok(groups[m.groupIndex!].includes(m.player1Id!) && groups[m.groupIndex!].includes(m.player2Id!));
    }
  });

  test("Tabelle: 3/1/0 Punkte, danach Tordifferenz", () => {
    const [table] = computeGroupStandings([["a", "b", "c"]], [
      { groupIndex: 0, player1Id: "a", player2Id: "b", winnerId: null, score1: 1, score2: 1, playedAt: new Date() },
      { groupIndex: 0, player1Id: "a", player2Id: "c", winnerId: "a", score1: 5, score2: 0, playedAt: new Date() },
      { groupIndex: 0, player1Id: "b", player2Id: "c", winnerId: "b", score1: 1, score2: 0, playedAt: new Date() },
      { groupIndex: 1, player1Id: "a", player2Id: "c", winnerId: "c", score1: 0, score2: 9, playedAt: new Date() },
    ]);
    assert.deepEqual(table.map(s => [s.userId, s.pts]), [["a", 4], ["b", 4], ["c", 0]]);
    assert.equal(table[0].scored - table[0].conceded, 5);
  });

  test("WM-Setzung: 2 Gruppen à 2 → A1–B2 und B1–A2 in verschiedenen Hälften", () => {
    const standings = computeGroupStandings([["a1", "a2", "a3"], ["b1", "b2", "b3"]], [
      ...playedGroup(0, ["a1", "a2", "a3"]), ...playedGroup(1, ["b1", "b2", "b3"]),
    ]);
    const slots = seedKnockout(standings, 2);
    const pairs = [[slots[0], slots[1]], [slots[2], slots[3]]].map(p => [...p].sort().join("-")).sort();
    assert.deepEqual(pairs, ["a1-b2", "a2-b1"]);
  });

  test("4 Gruppen à 2: Spieler derselben Gruppe treffen sich frühestens im Finale", () => {
    const groups = ["a", "b", "c", "d"].map(g => [1, 2, 3, 4].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const slots = seedKnockout(standings, 2);
    assert.equal(slots.length, 8);
    for (const g of ["a", "b", "c", "d"]) {
      const s1 = slots.indexOf(`${g}1`);
      const s2 = slots.indexOf(`${g}2`);
      assert.notEqual(s1 < 4, s2 < 4, `${g}1 und ${g}2 müssen in verschiedenen Hälften stehen`);
    }
  });

  test("Nicht-Zweierpotenz: Freilose für die besten Gruppensieger, bereits aufgerückt", () => {
    const groups = ["a", "b", "c"].map(g => [1, 2, 3].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const matches = generateKnockoutMatches(standings, 2, "e");
    const round1 = matches.filter(m => m.round === 1);
    assert.equal(round1.length, 4);
    const byes = round1.filter(m => !m.player1Id || !m.player2Id);
    assert.equal(byes.length, 2);
    for (const bye of byes) {
      assert.ok(bye.winnerId?.endsWith("1"), "Freilos geht an einen Gruppensieger");
      const next = matches.find(m => m.round === 2 && m.position === Math.ceil(bye.position / 2))!;
      assert.ok([next.player1Id, next.player2Id].includes(bye.winnerId));
    }
    for (const m of round1.filter(m => m.player1Id && m.player2Id)) {
      assert.notEqual(m.player1Id![0], m.player2Id![0], "keine Gruppen-Revanche in Runde 1");
    }
    assert.ok(matches.every(m => m.groupIndex === null));
  });

  test("Konfigurationsprüfung", () => {
    assert.equal(validateGroupStageConfig(16, { groupCount: 4, advancePerGroup: 2 }), null);
    assert.match(validateGroupStageConfig(5, { groupCount: 3, advancePerGroup: 1 })!, /höchstens 2 Gruppen/);
    assert.match(validateGroupStageConfig(8, { groupCount: 2, advancePerGroup: 4 })!, /höchstens 3/);
    assert.equal(groupLetter(0), "A");
    assert.equal(groupLetter(27), "AB");
  });
});

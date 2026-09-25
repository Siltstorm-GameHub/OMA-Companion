import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeSeasonResults, type MemberSeasonInput } from "./season-engine";

const member = (i: number, over: Partial<MemberSeasonInput> = {}): MemberSeasonInput => ({
  userId: `u${i}`, discordId: `d${i}`, currentTier: null, eventCount: 0, questCount: 0, ...over,
});

describe("Saison-Engine (nur Aktivitäts-Stufe)", () => {
  test("null Aktivität → Ghost, höchste Aktivität → höchste Stufe", () => {
    const members = Array.from({ length: 20 }, (_, i) => member(i, { eventCount: i, questCount: i }));
    const r = computeSeasonResults(members);
    assert.equal(r[0].activityTier, "GHOST");
    assert.equal(r[19].activityTier, "OLD_MASTER");
  });

  test("Stufensprung ist auf ±1 pro Lauf begrenzt (außer bei null Aktivität)", () => {
    const members = [member(0, { eventCount: 50, currentTier: "GHOST" }), member(1, { eventCount: 1, currentTier: "OLD_MASTER" }), member(2, { eventCount: 0 })];
    const r = computeSeasonResults(members);
    assert.equal(r[0].activityTier, "NPC"); // Ghost → maximal eine Stufe hoch
    assert.equal(r[1].activityTier, "LEGENDE"); // Old Master → maximal eine Stufe runter
  });

  test("das Ergebnis enthält keine Klasse und keine Stat-Multiplikatoren mehr", () => {
    const [r] = computeSeasonResults([member(0, { eventCount: 3 })]);
    assert.deepEqual(Object.keys(r).sort(), ["activityTier", "userId"]);
  });
});

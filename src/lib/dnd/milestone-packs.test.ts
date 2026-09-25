import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MILESTONE_PACKS, milestonePackAt, packsBetween } from "./milestone-packs";
import { MAX_LEVEL } from "../te-map/rpg";

describe("Meilenstein-Packs", () => {
  test("nur echte Stufen bekommen ein Pack", () => {
    for (const l of Object.keys(MILESTONE_PACKS).map(Number)) assert.ok(l >= 2 && l <= MAX_LEVEL);
    assert.equal(milestonePackAt(5), "STANDARD");
    assert.equal(milestonePackAt(10), "PREMIUM");
    assert.equal(milestonePackAt(6), null);
  });

  test("Etappen und rückwirkendes Einlösen ergeben dasselbe", () => {
    assert.deepEqual(packsBetween(1, 4), []);
    assert.deepEqual(packsBetween(1, 5), ["STANDARD"]);
    assert.deepEqual(packsBetween(1, 20), ["STANDARD", "PREMIUM", "STANDARD", "PREMIUM"]);
    assert.deepEqual([...packsBetween(1, 9), ...packsBetween(9, 20)], packsBetween(1, 20));
  });

  test("Stufe wird nie doppelt bezahlt (from ausgeschlossen)", () => {
    assert.deepEqual(packsBetween(5, 5), []);
    assert.deepEqual(packsBetween(5, 10), ["PREMIUM"]);
  });
});

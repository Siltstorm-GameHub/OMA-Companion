import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { eventHasPlacement, eventKindOf, parseEventKind, participationRewardOf, rewardLabel } from "./event-placement";

describe("eventHasPlacement", () => {
  test("Community-Events haben keine Platzierung", () => {
    assert.equal(eventHasPlacement({ type: "tournament" }), true);
    assert.equal(eventHasPlacement({ type: "community" }), false);
    assert.equal(eventHasPlacement({ type: null }), true);
    assert.equal(eventKindOf({ type: "community" }), "community");
    assert.equal(eventKindOf({ type: "tournament" }), "tournament");
  });
  test("parseEventKind lässt nur die zwei Typen durch", () => {
    assert.equal(parseEventKind("community"), "community");
    assert.equal(parseEventKind("tournament"), "tournament");
    assert.equal(parseEventKind("bracket"), null);
    assert.equal(parseEventKind(undefined), null);
  });
});

describe("participationRewardOf", () => {
  const cd = JSON.stringify({
    rewardLedger: {
      participationCoins: { a: 20, b: 20 },
      participationRankPoints: { a: 2 },
      spectatorRewards: { s: { coins: 5, rankPoints: 0 } },
    },
  });
  test("liest Münzen und Rang-Punkte aus dem Ledger", () => {
    assert.deepEqual(participationRewardOf(cd, "a"), { coins: 20, rankPoints: 2 });
    assert.deepEqual(participationRewardOf(cd, "b"), { coins: 20, rankPoints: 0 });
    assert.deepEqual(participationRewardOf(cd, "s"), { coins: 5, rankPoints: 0 });
  });
  test("nichts bekommen / kaputte Daten → null", () => {
    assert.equal(participationRewardOf(cd, "x"), null);
    assert.equal(participationRewardOf("{kaputt", "a"), null);
    assert.equal(participationRewardOf(null, "a"), null);
    assert.equal(participationRewardOf(cd, null), null);
  });
  test("rewardLabel", () => {
    assert.equal(rewardLabel({ coins: 20, rankPoints: 2 }), "+20 Münzen · +2 RP");
    assert.equal(rewardLabel({ coins: 0, rankPoints: 2 }), "+2 RP");
    assert.equal(rewardLabel(null), "");
  });
});

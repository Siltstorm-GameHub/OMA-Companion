import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SCORE_CAPS, scoreStreams, starsToPoints, finalizeBreakdown, type VoteEvent } from "./score-engine";

const t0 = new Date("2026-10-05T10:00:00Z").getTime();
const vote = (voterId: string, itemKey: string, points = 1, i = 0): VoteEvent =>
  ({ voterId, itemKey, points, createdAt: new Date(t0 + i * 1000) });

describe("starsToPoints", () => {
  test("4–5 Sterne +1, 3 Sterne 0, 1–2 Sterne −1", () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(starsToPoints), [-1, -1, 0, 1, 1]);
  });
});

describe("scoreStreams", () => {
  test("pro Bewerter zählen nur die ersten N Stimmen", () => {
    const events = Array.from({ length: SCORE_CAPS.maxVotesPerVoter + 3 }, (_, i) => vote("v1", `item${i % 2}`, 1, i));
    const r = scoreStreams([{ key: "a", label: "A", unit: "thumb", events }]);
    assert.equal(r.rawBase, events.length);
    assert.equal(r.trimmedByVoter, 3);
    assert.equal(r.base, SCORE_CAPS.maxVotesPerVoter);
  });

  test("nur die besten N positiven Beiträge zählen, negative immer", () => {
    const events: VoteEvent[] = [];
    let i = 0;
    for (let item = 0; item < SCORE_CAPS.maxItems + 2; item++) events.push(vote(`v${item}`, `item${item}`, 1, i++));
    events.push(vote("vx", "item0", 1, i++)); // item0 = 2 Punkte
    events.push(vote("vy", "bad", -1, i++));
    const r = scoreStreams([{ key: "a", label: "A", unit: "stars", events }]);
    assert.equal(r.trimmedByItems, 2);
    assert.equal(r.base, 2 + (SCORE_CAPS.maxItems - 1) - 1);
  });

  test("Ergebnis nie negativ", () => {
    const r = scoreStreams([{ key: "a", label: "A", unit: "stars", events: [vote("v1", "x", -1), vote("v2", "y", -1, 1)] }]);
    assert.equal(r.base, 0);
  });

  test("finalizeBreakdown addiert Boni", () => {
    const scored = scoreStreams([{ key: "a", label: "A", unit: "thumb", events: [vote("v1", "x")] }]);
    const b = finalizeBreakdown("journalist", new Date(t0), new Date(t0), scored, [{ key: "collab", label: "Collab", points: 2 }]);
    assert.equal(b.total, 3);
  });
});

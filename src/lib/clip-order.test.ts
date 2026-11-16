import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { clipYearOf, seededShuffle } from "./clip-order";

const items = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}` }));

describe("Clip-Reihenfolge", () => {
  test("gleicher Seed → gleiche Reihenfolge, alle Clips bleiben drin", () => {
    const a = seededShuffle(items, "u1:c1").map(x => x.id);
    const b = seededShuffle(items, "u1:c1").map(x => x.id);
    assert.deepEqual(a, b);
    assert.deepEqual([...a].sort(), items.map(x => x.id).sort());
  });

  test("andere Person → (fast sicher) andere Reihenfolge", () => {
    const a = seededShuffle(items, "u1:c1").map(x => x.id).join();
    const b = seededShuffle(items, "u2:c1").map(x => x.id).join();
    assert.notEqual(a, b);
  });

  test("Clip-Jahr: Dezember zählt zum Folgejahr", () => {
    assert.equal(clipYearOf(12, 2025), 2026);
    assert.equal(clipYearOf(11, 2026), 2026);
    assert.equal(clipYearOf(1, 2026), 2026);
  });
});

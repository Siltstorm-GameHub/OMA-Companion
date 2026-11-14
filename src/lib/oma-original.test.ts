import { test } from "node:test";
import assert from "node:assert/strict";
import { isOmaOriginal } from "./oma-original";

test("Event selbst markiert", () => {
  assert.equal(isOmaOriginal({ omaOriginal: true, series: null }), true);
});

test("Termin einer Original-Reihe erbt das Siegel", () => {
  assert.equal(isOmaOriginal({ omaOriginal: false, series: { omaOriginal: true } }), true);
});

test("Normales Event und normale Reihe", () => {
  assert.equal(isOmaOriginal({ omaOriginal: false, series: { omaOriginal: false } }), false);
  assert.equal(isOmaOriginal({}), false);
  assert.equal(isOmaOriginal(null), false);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { isOmaOriginal, isOmaOriginalSeries } from "./oma-original";

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

test("OMA Blocks ist immer ein Original", () => {
  assert.equal(isOmaOriginal({ omaOriginal: false, game: "OMA Blocks" }), true);
  assert.equal(isOmaOriginal({ game: "Rocket League", series: { fixedGame: "OMA Blocks" } }), true);
  assert.equal(isOmaOriginalSeries({ omaOriginal: false, fixedGame: "OMA Blocks" }), true);
  assert.equal(isOmaOriginalSeries({ omaOriginal: false, fixedGame: "Rocket League" }), false);
});

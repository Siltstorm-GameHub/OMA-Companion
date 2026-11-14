import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MATCH_MIN, effectiveStatus, interleaveDeck, isSwipeStatus, matchRecipients, shouldReask } from "./swipe";

describe("GameSwipe", () => {
  test("alte Markierungen gelten als Am Start, neue Entscheidungen gehen vor", () => {
    assert.equal(effectiveStatus(null), null);
    assert.equal(effectiveStatus({ status: null, owns: true }), "in");
    assert.equal(effectiveStatus({ status: null, wantPlay: true }), "in");
    assert.equal(effectiveStatus({ status: null, owns: false, wantPlay: false }), null);
    assert.equal(effectiveStatus({ status: "out", owns: true }), "out");
    assert.equal(effectiveStatus({ status: "kaputt", wantPlay: true }), "in");
    assert.ok(isSwipeStatus("wish") && !isSwipeStatus("yes"));
  });

  test("wann eine Karte wiederkommt", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    const old = new Date("2026-04-01T00:00:00Z");
    const recent = new Date("2026-10-01T00:00:00Z");
    assert.equal(shouldReask(null, null, now), true);
    assert.equal(shouldReask("out", old, now), false); // Nicht meins: nie wieder
    assert.equal(shouldReask("in", old, now), true); // nach 6 Monaten erneut
    assert.equal(shouldReask("wish", recent, now), false);
    assert.equal(shouldReask("in", null, now), false); // übernommene Alt-Markierung
  });

  test("Match: erst ab MATCH_MIN, danach nur Neue", () => {
    const three = ["a", "b", "c"].slice(0, MATCH_MIN);
    assert.deepEqual(matchRecipients(three.slice(0, MATCH_MIN - 1), null, "a"), []);
    assert.deepEqual(matchRecipients(three, null, "c"), three);
    assert.deepEqual(matchRecipients([...three, "d"], MATCH_MIN, "d"), ["d"]);
    assert.deepEqual(matchRecipients([...three, "d"], MATCH_MIN, "x"), []);
    // Rückgängig und erneut "Am Start": Match ist nicht gewachsen → keine zweite Benachrichtigung
    assert.deepEqual(matchRecipients(three, MATCH_MIN, "c"), []);
  });

  test("Stapel: jede 4. Karte ein Steam-Trend, Rest hinten an", () => {
    assert.deepEqual(interleaveDeck([1, 2, 3, 4, 5, 6, 7], ["s1", "s2"]), [1, 2, 3, "s1", 4, 5, 6, "s2", 7]);
    assert.deepEqual(interleaveDeck([1], ["s1", "s2", "s3"]), [1, "s1", "s2", "s3"]);
    assert.deepEqual(interleaveDeck([], ["s1"]), ["s1"]);
    assert.deepEqual(interleaveDeck([1, 2], []), [1, 2]);
  });
});

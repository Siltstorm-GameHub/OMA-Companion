import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MATCH_MIN, effectiveStatus, interleaveDeck, isSwipeStatus, matchRecipients, othersLabel, shouldReask } from "./swipe";

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

  test("Match zwischen Usern: ab zwei, danach nur Neue", () => {
    assert.equal(MATCH_MIN, 2);
    assert.deepEqual(matchRecipients(["a"], new Set()), []); // allein am Start
    assert.deepEqual(matchRecipients(["a", "b"], new Set()), ["a", "b"]); // erstes Match: beide
    assert.deepEqual(matchRecipients(["a", "b", "c"], new Set(["a", "b"])), ["c"]); // nur wer dazukommt
    // Rückgängig und erneut "Am Start": schon benachrichtigt → keine zweite Benachrichtigung
    assert.deepEqual(matchRecipients(["a", "b", "c"], new Set(["a", "b", "c"])), []);
  });

  test("Mitspieler als Text", () => {
    const o = (...names: string[]) => names.map(name => ({ name }));
    assert.equal(othersLabel({ count: 2, others: o("Anna") }), "Anna");
    assert.equal(othersLabel({ count: 3, others: o("Anna", "Ben") }), "Anna und Ben");
    assert.equal(othersLabel({ count: 4, others: o("Anna", "Ben", "Cem") }), "Anna, Ben und Cem");
    assert.equal(othersLabel({ count: 7, others: o("Anna", "Ben", "Cem", "Dana") }), "Anna, Ben, Cem und 3 weitere");
  });

  test("Stapel: jede 4. Karte ein Steam-Trend, Rest hinten an", () => {
    assert.deepEqual(interleaveDeck([1, 2, 3, 4, 5, 6, 7], ["s1", "s2"]), [1, 2, 3, "s1", 4, 5, 6, "s2", 7]);
    assert.deepEqual(interleaveDeck([1], ["s1", "s2", "s3"]), [1, "s1", "s2", "s3"]);
    assert.deepEqual(interleaveDeck([], ["s1"]), ["s1"]);
    assert.deepEqual(interleaveDeck([1, 2], []), [1, 2]);
  });
});

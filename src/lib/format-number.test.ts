import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { formatDecimal, formatFixed } from "./format-number";

describe("Zahlen im deutschen Format", () => {
  test("Komma als Dezimaltrenner, Punkt als Tausendertrenner", () => {
    assert.equal(formatFixed(3.5, 2), "3,50");
    assert.equal(formatFixed(1234.5, 1), "1.234,5");
    assert.equal(formatDecimal(12.5), "12,5");
    assert.equal(formatDecimal(4), "4");
    assert.equal(formatDecimal(0.125, 2), "0,13");
    assert.equal(formatDecimal(Number.NaN), "–");
  });
});

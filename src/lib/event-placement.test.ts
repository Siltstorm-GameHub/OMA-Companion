import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { eventHasPlacement } from "./event-placement";

describe("eventHasPlacement", () => {
  test("Community-Events haben keine eine Platzierung", () => {
    assert.equal(eventHasPlacement({ type: "tournament" }), true);
    assert.equal(eventHasPlacement({ type: "community" }), false);
    assert.equal(eventHasPlacement({ type: null }), true);
  });
});

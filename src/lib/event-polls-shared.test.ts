import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ineligibleCandidates, voterAllowed } from "./event-polls-shared";

describe("Umfragen: wer darf abstimmen", () => {
  test("je nach Einstellung", () => {
    assert.equal(voterAllowed("all", null), true);
    assert.equal(voterAllowed("players", "player"), true);
    assert.equal(voterAllowed("players", "spectator"), false);
    assert.equal(voterAllowed("spectators", "spectator"), true);
    assert.equal(voterAllowed("participants", "spectator"), true);
    assert.equal(voterAllowed("participants", null), false);
  });
});

describe("Umfragen: Kandidaten", () => {
  test("nicht da und ausgeschlossen stehen nicht zur Wahl", () => {
    const s = ineligibleCandidates(JSON.stringify({ absentPlayerIds: ["a"], excludedUserIds: ["b"] }));
    assert.ok(s.has("a") && s.has("b") && !s.has("c"));
    assert.equal(ineligibleCandidates(null).size, 0);
    assert.equal(ineligibleCandidates("kaputt").size, 0);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { timelineStates } from "./series-timeline";

describe("Saison-Verlauf", () => {
  test("erster offener Termin ist der nächste", () => {
    assert.deepEqual(
      timelineStates([
        { status: "finished", gamePhaseDone: true },
        { status: "open", gamePhaseDone: false },
        { status: "open", gamePhaseDone: false },
      ]),
      ["done", "next", "upcoming"],
    );
  });

  test("läuft etwas, gibt es keinen extra 'nächsten'", () => {
    assert.deepEqual(
      timelineStates([
        { status: "finished", gamePhaseDone: false },
        { status: "active", gamePhaseDone: false },
        { status: "open", gamePhaseDone: false },
      ]),
      ["done", "live", "upcoming"],
    );
  });

  test("Spielphase fertig zählt als gespielt, auch in der Umfragephase", () => {
    assert.deepEqual(timelineStates([{ status: "umfrage", gamePhaseDone: true }, { status: "closed", gamePhaseDone: false }]), ["done", "next"]);
  });
});

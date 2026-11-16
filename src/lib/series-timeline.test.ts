import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { timelineStates } from "./series-timeline";
import { timelineWindow } from "./series-context";

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

describe("Zeitstrahl-Ausschnitt", () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  test("kurze Reihen komplett", () => {
    assert.deepEqual(timelineWindow([1, 2, 3], 1).items, [1, 2, 3]);
  });
  test("lange Reihen um den aktuellen Termin, an den Rändern begrenzt", () => {
    const mid = timelineWindow(items, 10, 9);
    assert.deepEqual([mid.start, mid.hiddenBefore, mid.hiddenAfter], [6, 6, 5]);
    assert.deepEqual(timelineWindow(items, 0, 9).start, 0);
    const end = timelineWindow(items, 19, 9);
    assert.deepEqual([end.start, end.hiddenAfter], [11, 0]);
  });
});

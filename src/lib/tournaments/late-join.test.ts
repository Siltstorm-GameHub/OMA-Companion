import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { pickCurrentRound } from "./late-join";

describe("Nachmeldung: laufende Runde", () => {
  const d = new Date();
  test("bevorzugt die neueste als 'läuft gerade' markierte Runde", () => {
    const r = pickCurrentRound([
      { id: "a", position: 1, startedAt: d }, { id: "b", position: 3, startedAt: null }, { id: "c", position: 2, startedAt: d },
    ]);
    assert.equal(r?.id, "c");
  });
  test("sonst die Runde mit der höchsten Nummer, ohne Runden keine", () => {
    assert.equal(pickCurrentRound([{ id: "a", position: 1, startedAt: null }, { id: "b", position: 4, startedAt: null }])?.id, "b");
    assert.equal(pickCurrentRound([]), null);
  });
});

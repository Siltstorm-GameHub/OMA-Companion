import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { rankWaveSeason } from "./wave-season";

const at = (iso: string) => new Date(iso);

describe("Last-Stand-Saison", () => {
  test("mehr Wellen zuerst, bei Gleichstand wer den Bestwert früher erreicht hat", () => {
    const ranking = rankWaveSeason([
      { userId: "a", bestWaves: 7, reachedAt: at("2026-10-12T10:00:00Z") },
      { userId: "b", bestWaves: 9, reachedAt: at("2026-10-20T10:00:00Z") },
      { userId: "c", bestWaves: 7, reachedAt: at("2026-10-05T10:00:00Z") },
    ]);
    assert.deepEqual(ranking.map((r) => r.userId), ["b", "c", "a"]);
  });

  test("Spieler ohne besiegte Welle stehen nicht in der Rangliste", () => {
    assert.deepEqual(rankWaveSeason([{ userId: "a", bestWaves: 0, reachedAt: at("2026-10-01T00:00:00Z") }]), []);
  });
});

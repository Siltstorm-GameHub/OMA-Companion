import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { planSchedule, type SchedulableMatch } from "./schedule";

const start = new Date("2026-11-01T18:00:00Z");
const at = (min: number) => new Date(start.getTime() + min * 60_000).toISOString();
const mk = (id: string, round: number, extra: Partial<SchedulableMatch> = {}): SchedulableMatch => ({
  id, round, groupIndex: null, leg: null, player1Id: "a", player2Id: "b", winnerId: null, ...extra,
});

describe("Terminplanung", () => {
  test("Gruppen spielen je Spieltag gleichzeitig, danach die K.O.-Runden mit Hin vor Rück", () => {
    const plan = planSchedule([
      mk("gA1", 1, { groupIndex: 0 }), mk("gB1", 1, { groupIndex: 1 }), mk("gA2", 2, { groupIndex: 0 }),
      mk("k1h", 1, { leg: 1 }), mk("k1r", 1, { leg: 2 }), mk("fin", 2),
    ], start, 30, true);
    const time = Object.fromEntries(plan.map(p => [p.id, p.scheduledAt.toISOString()]));
    assert.equal(time.gA1, at(0));
    assert.equal(time.gB1, at(0));
    assert.equal(time.gA2, at(30));
    assert.equal(time.k1h, at(60));
    assert.equal(time.k1r, at(90));
    assert.equal(time.fin, at(120));
  });

  test("Freilose ohne Termin, vorhandene Termine bleiben ohne Überschreiben", () => {
    const plan = planSchedule([
      mk("bye", 1, { player2Id: null, winnerId: "a" }),
      mk("r1", 1, { scheduledAt: "2026-10-01T10:00:00Z" }),
      mk("r2", 2),
    ], start, 45, false);
    assert.deepEqual(plan.map(p => p.id), ["r2"]);
    assert.equal(plan[0].scheduledAt.toISOString(), at(45), "Fenster-Zählung bleibt gleich (Runde 2 = zweites Fenster)");
  });
});

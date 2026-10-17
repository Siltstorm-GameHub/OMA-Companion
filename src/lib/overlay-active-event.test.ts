import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { pickActiveEvent, runningEventWhere, ENDED_EVENT_STATUSES, type ActiveEventCandidate } from "./overlay-active-event";

const NOW = Date.parse("2026-10-17T20:00:00Z");
const h = (hours: number) => new Date(NOW + hours * 3600_000);
const ev = (id: string, status: string, tournamentStatus: string | null, startAt: Date): ActiveEventCandidate => ({ id, status, tournamentStatus, startAt });

/** Gleiche Logik wie der Prisma-Filter, hier gegen ein einzelnes Event ausgewertet. */
function matchesWhere(e: ActiveEventCandidate): boolean {
  const w = runningEventWhere(NOW);
  if (w.status.notIn.includes(e.status)) return false;
  return w.OR.some(c => {
    if ("tournamentStatus" in c && c.tournamentStatus !== e.tournamentStatus) return false;
    if ("status" in c && c.status !== e.status) return false;
    const r = c.startAt as { gte?: Date; lte?: Date };
    return (!r.gte || e.startAt >= r.gte) && (!r.lte || e.startAt <= r.lte);
  });
}

describe("Overlay: läuft gerade ein Turnier?", () => {
  test("gestartetes Turnier zählt, auch wenn der Event-Status noch \"open\" ist und der Start lange her", () => {
    assert.ok(matchesWhere(ev("a", "open", "active", h(-9))));
    assert.ok(matchesWhere(ev("b", "open", "active", h(-40))));
    assert.ok(!matchesWhere(ev("c", "open", "active", h(-24 * 4))), "nach Tagen vergessen → nicht mehr");
  });

  test("beendete Events zählen nie, auch nicht mit aktivem Turnier", () => {
    for (const status of ENDED_EVENT_STATUSES) assert.ok(!matchesWhere(ev("x", status, "active", h(-1))));
  });

  test("ohne gestartetes Turnier: aktiv (24h) oder Start steht gerade an", () => {
    assert.ok(matchesWhere(ev("a", "active", null, h(-20))));
    assert.ok(matchesWhere(ev("b", "open", null, h(-5))));
    assert.ok(matchesWhere(ev("c", "open", "pending", h(0.4))));
    assert.ok(!matchesWhere(ev("d", "open", null, h(-7))));
    assert.ok(!matchesWhere(ev("e", "open", null, h(2))), "erst in 2h → noch nicht");
  });

  test("Vorrang: laufendes Turnier vor aktivem Event vor anstehendem", () => {
    assert.equal(pickActiveEvent([
      ev("anstehend", "open", null, h(0.2)),
      ev("aktiv", "active", null, h(-1)),
      ev("turnier", "open", "active", h(-8)),
    ], NOW), "turnier");
    assert.equal(pickActiveEvent([ev("anstehend", "open", null, h(0.2)), ev("aktiv", "active", null, h(-3))], NOW), "aktiv");
    assert.equal(pickActiveEvent([], NOW), null);
  });
});

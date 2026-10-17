import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { pickActiveEvent, rankActiveEvents, chooseActiveEvent, NO_EVENT_CHOICE, runningEventWhere, ENDED_EVENT_STATUSES, type ActiveEventCandidate } from "./overlay-active-event";

const NOW = Date.parse("2026-10-17T20:00:00Z");
const h = (hours: number) => new Date(NOW + hours * 3600_000);
type Ev = ActiveEventCandidate & { endAt: Date | null };
const ev = (id: string, status: string, tournamentStatus: string | null, startAt: Date, endAt: Date | null = null): Ev =>
  ({ id, status, tournamentStatus, startAt, endAt });

type Range = { gte?: Date; lte?: Date } | null;
const inRange = (v: Date | null, r: Range | undefined) =>
  r === undefined ? true : r === null ? v === null : v !== null && (!r.gte || v >= r.gte) && (!r.lte || v <= r.lte);

/** Gleiche Logik wie der Prisma-Filter, hier gegen ein einzelnes Event ausgewertet. */
function matchesWhere(e: Ev): boolean {
  const w = runningEventWhere(NOW);
  if (w.status.notIn.includes(e.status)) return false;
  return w.OR.some(c => {
    if ("tournamentStatus" in c && c.tournamentStatus !== e.tournamentStatus) return false;
    if ("status" in c && c.status !== e.status) return false;
    return inRange(e.startAt, (c as { startAt?: Range }).startAt) && inRange(e.endAt, (c as { endAt?: Range }).endAt);
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

  test("eingetragenes Ende zählt: mehrtägige bzw. lange Events bleiben bis dahin aktiv", () => {
    assert.ok(matchesWhere(ev("a", "active", null, h(-30), h(5))), "aktiv seit 30h, Ende in 5h");
    assert.ok(matchesWhere(ev("b", "active", null, h(-30), h(-1))), "kurz nach dem Ende noch dabei");
    assert.ok(!matchesWhere(ev("c", "active", null, h(-30), h(-3))), "3h nach dem Ende nicht mehr");
    assert.ok(matchesWhere(ev("d", "open", null, h(-10), h(2))), "offen, läuft laut Zeitraum gerade");
    assert.ok(!matchesWhere(ev("e", "open", null, h(-10), h(-1))), "Zeitraum vorbei");
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

  test("Auswahl des Streamers bei mehreren laufenden Events", () => {
    const ranked = rankActiveEvents([
      ev("liga", "active", null, h(-1)), ev("cup", "open", "active", h(-2)), ev("liga", "active", null, h(-1)),
    ], NOW).map(e => e.id);
    assert.deepEqual(ranked, ["cup", "liga"], "sortiert, ohne Duplikate");
    assert.equal(chooseActiveEvent(ranked, null), "cup", "automatisch = erstes");
    assert.equal(chooseActiveEvent(ranked, "liga"), "liga", "gewähltes Event gewinnt");
    assert.equal(chooseActiveEvent(ranked, NO_EVENT_CHOICE), null, "kein Turnier");
    assert.equal(chooseActiveEvent(ranked, "vorbei"), "cup", "beendete Wahl → wieder automatisch");
    assert.equal(chooseActiveEvent([], "liga"), null);
  });
});

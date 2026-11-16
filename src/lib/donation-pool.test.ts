import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceDueDate, allocatePool, averageMonthlyDonations, buildLedger, donorStreak, monthsUntil, reserveTarget,
} from "./donation-pool";

// 16. Nov 2026, Mittag Berlin
const NOW = new Date("2026-11-16T12:00:00Z");

const hosting = { id: "h", title: "Hosting", description: null, amount: 20, interval: "monthly", nextDueAt: new Date("2026-12-01T10:00:00Z") };
const domain = { id: "d", title: "Domain", description: null, amount: 24, interval: "yearly", nextDueAt: new Date("2027-02-10T10:00:00Z") };
const goal = (id: string, cost: number | null) => ({ id, title: id, description: null, estimatedCost: cost });

describe("Spendenpool: Rücklagen", () => {
  test("monthsUntil zählt Kalendermonate", () => {
    assert.equal(monthsUntil(new Date("2026-11-30T10:00:00Z"), NOW), 0);
    assert.equal(monthsUntil(new Date("2027-02-10T10:00:00Z"), NOW), 3);
    assert.equal(monthsUntil(new Date("2026-10-01T10:00:00Z"), NOW), -1);
  });

  test("monatlich: nächste Zahlung voll, jährlich: anteilig angespart", () => {
    assert.equal(reserveTarget(hosting, NOW), 20);
    assert.equal(reserveTarget(domain, NOW), 18); // 9/12 von 24
    assert.equal(reserveTarget({ ...domain, nextDueAt: new Date("2027-11-10T10:00:00Z") }, NOW), 0);
    assert.equal(reserveTarget({ ...domain, nextDueAt: new Date("2026-10-10T10:00:00Z") }, NOW), 24); // überfällig
  });
});

describe("Spendenpool: Verteilung", () => {
  test("Fixkosten zuerst, Rest füllt Ziele der Reihe nach", () => {
    const a = allocatePool(60, [domain, hosting], [goal("a", 20), goal("ohne", null), goal("b", 30)], NOW);
    assert.deepEqual(a.fixed.map((f) => [f.id, f.covered]), [["h", 20], ["d", 18]]);
    assert.equal(a.fixedComplete, true);
    assert.equal(a.freeForGoals, 22);
    assert.deepEqual(a.goals.map((g) => g.covered), [20, 0, 2]);
    assert.equal(a.next.kind, "goal");
    if (a.next.kind === "goal") { assert.equal(a.next.goal.id, "b"); assert.equal(a.next.index, 2); }
    assert.equal(a.monthlyRunRate, 22);
  });

  test("reicht das Guthaben nicht für Fixkosten, bekommen Ziele nichts", () => {
    const a = allocatePool(25, [hosting, domain], [goal("a", 20)], NOW);
    assert.equal(a.fixedComplete, false);
    assert.equal(a.fixedCovered, 25);
    assert.equal(a.goals[0].covered, 0);
    assert.deepEqual(a.next, { kind: "fixed", target: 38, covered: 25 });
  });

  test("negatives Guthaben deckt nichts", () => {
    const a = allocatePool(-5, [hosting], [], NOW);
    assert.equal(a.fixedCovered, 0);
    assert.equal(a.next.kind, "fixed");
  });

  test("ohne Fixkosten und alle Ziele gedeckt → kein nächstes Ziel", () => {
    const a = allocatePool(100, [], [goal("a", 20)], NOW);
    assert.equal(a.fixedComplete, true);
    assert.equal(a.next.kind, "none");
  });
});

describe("Spendenpool: Monate und Streak", () => {
  test("Durchschnitt der letzten 3 abgeschlossenen Monate", () => {
    const months = [
      { year: 2026, month: 11, total: 100 }, // laufender Monat zählt nicht
      { year: 2026, month: 10, total: 30 },
      { year: 2026, month: 8, total: 15 },
      { year: 2026, month: 7, total: 999 }, // zu alt
    ];
    assert.equal(averageMonthlyDonations(months, NOW), 15);
  });

  test("Streak läuft ab Vormonat weiter, solange der aktuelle Monat fehlt", () => {
    assert.deepEqual(donorStreak([{ year: 2026, month: 10 }, { year: 2026, month: 9 }], NOW), { streak: 2, thisMonth: false });
    assert.deepEqual(donorStreak([{ year: 2026, month: 11 }, { year: 2026, month: 10 }, { year: 2026, month: 8 }], NOW), { streak: 2, thisMonth: true });
    assert.deepEqual(donorStreak([{ year: 2026, month: 8 }], NOW), { streak: 0, thisMonth: false });
    assert.deepEqual(donorStreak([{ year: 2026, month: 1 }, { year: 2025, month: 12 }], new Date("2026-02-10T12:00:00Z")), { streak: 2, thisMonth: false });
  });
});

describe("Spendenpool: Kassenbuch und Fälligkeit", () => {
  test("neueste zuerst, Spenden über den Ausgaben desselben Monats", () => {
    const ledger = buildLedger(
      [{ year: 2026, month: 10, total: 40, donors: 8 }, { year: 2026, month: 11, total: 10, donors: 2 }],
      [{ id: "e1", title: "Server", description: null, amount: 20, date: "2026-10-05T10:00:00Z", fixedCostId: "h" }],
    );
    assert.deepEqual(ledger.map((e) => e.key), ["in-2026-11", "in-2026-10", "out-e1"]);
    assert.equal(ledger[2].kind === "out" && ledger[2].fixed, true);
  });

  test("advanceDueDate schiebt um ein Intervall, ohne Monatsüberlauf", () => {
    assert.equal(advanceDueDate("2026-12-01T10:00:00Z", "monthly").toISOString(), "2027-01-01T10:00:00.000Z");
    assert.equal(advanceDueDate("2027-01-31T10:00:00Z", "monthly").toISOString(), "2027-02-28T10:00:00.000Z");
    assert.equal(advanceDueDate("2027-02-10T10:00:00Z", "yearly").toISOString(), "2028-02-10T10:00:00.000Z");
  });
});

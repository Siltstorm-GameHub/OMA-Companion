import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bountiesOf, bountySlug, DAILY_TEMPLATES, MONTHLY_TEMPLATES, periodKey } from "./quests-bounty";
import { isObjectiveType } from "./quest-objectives";

describe("Rotierende Aktivitäts-Quests (täglich + monatlich)", () => {
  test("jeder Zeitraum genau 3, deterministisch aus dem Schlüssel, für alle Spieler dieselben", () => {
    for (const cadence of ["daily", "monthly"] as const) {
      const a = bountiesOf(cadence, "202612");
      const b = bountiesOf(cadence, "202612");
      assert.equal(a.length, 3);
      assert.deepEqual(a.map((t) => t.id), b.map((t) => t.id));
      const c = bountiesOf(cadence, "202701");
      assert.notDeepEqual(a.map((t) => t.id), c.map((t) => t.id));
    }
  });

  test("täglich und monatlich wählen aus unterschiedlichen Vorlagen (keine Story-Quests)", () => {
    for (const t of [...DAILY_TEMPLATES, ...MONTHLY_TEMPLATES]) {
      assert.ok(isObjectiveType(t.objectiveType), t.id);
      assert.notEqual(t.objectiveType, "WORLD_STEP", t.id);
      assert.ok(t.targetCount >= 1);
      assert.ok(t.xpReward > 0 && t.coinReward > 0);
    }
    assert.ok(DAILY_TEMPLATES.length >= 3);
    assert.ok(MONTHLY_TEMPLATES.length >= 3);
  });

  test("Slug trägt Rotation + Zeitraum, damit der Fortschritt von selbst neu beginnt", () => {
    assert.equal(bountySlug("daily", "20261225", "kaempfer"), "dnd-bounty-daily-20261225-kaempfer");
    assert.equal(bountySlug("monthly", "202612", "plaudertasche"), "dnd-bounty-monthly-202612-plaudertasche");
    assert.notEqual(bountySlug("daily", "20261225", "kaempfer"), bountySlug("daily", "20261226", "kaempfer"));
  });

  test("periodKey: Tag ist 8-, Monat 6-stellig", () => {
    assert.match(periodKey("daily", new Date("2026-12-25T23:30:00+01:00")), /^\d{8}$/);
    assert.match(periodKey("monthly", new Date("2026-12-25T23:30:00+01:00")), /^\d{6}$/);
  });
});

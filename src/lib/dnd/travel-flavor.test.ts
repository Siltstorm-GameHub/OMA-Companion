import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { travelLogEntries } from "./travel-flavor";
import { LOCATION_HEXES, WORLD_COLS, WORLD_ROWS, terrainAt } from "./hex/world";
import { planTravel } from "./hex/pathfinding";

const locations = Object.values(LOCATION_HEXES);
const from = locations[0];
const to = locations.find((h) => h !== from)!;
const plan = planTravel(from, to, WORLD_COLS, WORLD_ROWS, terrainAt)!;

describe("travelLogEntries", () => {
  test("liefert keine Einträge vor dem ersten Meilenstein (20%)", () => {
    const departed = 0;
    const arrives = 100_000;
    const entries = travelLogEntries(plan.path, departed, arrives, departed + 1000, "seed");
    assert.equal(entries.length, 0);
  });

  test("schaltet Einträge nacheinander frei, je weiter die Reise fortgeschritten ist", () => {
    const departed = 0;
    const arrives = 100_000;
    const at50 = travelLogEntries(plan.path, departed, arrives, departed + 50_000, "seed");
    const at95 = travelLogEntries(plan.path, departed, arrives, departed + 95_000, "seed");
    assert.ok(at50.length > 0);
    assert.ok(at95.length >= at50.length);
  });

  test("ist deterministisch: gleicher Seed + gleicher Fortschritt → gleicher Text", () => {
    const departed = 0;
    const arrives = 100_000;
    const a = travelLogEntries(plan.path, departed, arrives, departed + 95_000, "seed-x");
    const b = travelLogEntries(plan.path, departed, arrives, departed + 95_000, "seed-x");
    assert.deepEqual(a, b);
  });

  test("unterschiedliche Seeds können unterschiedliche Texte liefern", () => {
    const departed = 0;
    const arrives = 100_000;
    const a = travelLogEntries(plan.path, departed, arrives, departed + 95_000, "seed-a");
    const b = travelLogEntries(plan.path, departed, arrives, departed + 95_000, "seed-b");
    // Nicht garantiert unterschiedlich (kleine Pools), aber die Keys müssen es sein.
    assert.notEqual(a[0]?.key, b[0]?.key);
  });

  test("leerer Pfad oder ungültige Zeiten → keine Einträge", () => {
    assert.deepEqual(travelLogEntries([], 0, 1000, 500, "s"), []);
    assert.deepEqual(travelLogEntries(plan.path, 1000, 1000, 1500, "s"), []);
  });
});

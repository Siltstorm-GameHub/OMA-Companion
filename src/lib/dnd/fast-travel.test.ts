import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fastTravelCost, fastTravelCostTo, fastTravelDestinations } from "./fast-travel";
import { LOCATION_HEXES } from "./hex/world";

describe("Schnellreise: Kosten", () => {
  test("Mindestpreis greift auch bei sehr kurzen Strecken", () => {
    assert.equal(fastTravelCost(0), 20);
    assert.equal(fastTravelCost(5), 20);
  });

  test("Preis skaliert mit der Reisezeit (1,5 Gold/Minute)", () => {
    assert.equal(fastTravelCost(100), 150);
    assert.equal(fastTravelCost(33), 50); // gerundet
  });

  test("fastTravelDestinations listet die anderen 9 festen Locations mit Preis, nicht die eigene", () => {
    const from = LOCATION_HEXES.hafenstadt;
    const dests = fastTravelDestinations(from);
    assert.ok(!dests.some((d) => d.slug === "hafenstadt"), "aktuelle Location fehlt");
    assert.equal(dests.length, Object.keys(LOCATION_HEXES).length - 1);
    for (const d of dests) {
      assert.ok(d.cost >= 20);
      assert.equal(d.cost, fastTravelCostTo(from, LOCATION_HEXES[d.slug]));
    }
  });

  test("fastTravelCostTo: unerreichbares Ziel (außerhalb des Rasters) gibt null", () => {
    assert.equal(fastTravelCostTo(LOCATION_HEXES.hafenstadt, { col: -1, row: -1 }), null);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { hexCenter, hexDistance, hexNeighbors, pointToHex } from "./grid";
import { planTravel, positionAlongPath } from "./pathfinding";
import { LOCATION_HEXES, WORLD_COLS, WORLD_LAYOUT, WORLD_ROWS, terrainAt } from "./world";
import { isPassable, MINUTES_PER_HEX } from "./terrain";

describe("Hex-Raster", () => {
  test("jedes Feld hat 6 Nachbarn (im Inneren), alle im Abstand 1", () => {
    for (const h of [{ col: 5, row: 4 }, { col: 5, row: 5 }]) {
      const n = hexNeighbors(h, 20, 20);
      assert.equal(n.length, 6);
      for (const m of n) assert.equal(hexDistance(h, m), 1);
    }
  });

  test("pointToHex trifft den Mittelpunkt jedes Feldes und liegt am Rand der Karte richtig", () => {
    for (const h of [{ col: 0, row: 0 }, { col: 7, row: 3 }, { col: 8, row: 3 }, { col: WORLD_COLS - 1, row: WORLD_ROWS - 1 }]) {
      const c = hexCenter(h, WORLD_LAYOUT);
      assert.deepEqual(pointToHex(c.x, c.y, WORLD_LAYOUT, WORLD_COLS, WORLD_ROWS), h);
    }
  });

  test("pointToHex: Punkt knapp rechts vom Mittelpunkt bleibt im selben Feld", () => {
    const h = { col: 10, row: 11 };
    const c = hexCenter(h, WORLD_LAYOUT);
    assert.deepEqual(pointToHex(c.x + WORLD_LAYOUT.hexW * 0.4, c.y, WORLD_LAYOUT, WORLD_COLS, WORLD_ROWS), h);
  });
});

describe("Wegfindung", () => {
  const flat = () => "p" as const;

  test("gerade Strecke über Ebene: Feldanzahl × Basisdauer", () => {
    const plan = planTravel({ col: 0, row: 0 }, { col: 4, row: 0 }, 10, 10, flat)!;
    assert.equal(plan.path.length, 5);
    assert.equal(plan.totalMinutes, 4 * MINUTES_PER_HEX);
  });

  test("umgeht Ozean und liefert null, wenn das Ziel gesperrt ist", () => {
    const terr = (h: { col: number; row: number }) => (h.col === 2 ? "o" : "p") as "o" | "p";
    assert.equal(planTravel({ col: 0, row: 0 }, { col: 2, row: 0 }, 5, 5, terr), null);
    const around = planTravel({ col: 0, row: 0 }, { col: 4, row: 0 }, 5, 1, terr);
    assert.equal(around, null); // eine Zeile: kein Weg um die Wasserlinie
    const open = planTravel({ col: 0, row: 2 }, { col: 4, row: 2 }, 5, 5, (h) => (h.col === 2 && h.row === 2 ? "o" : "p"))!;
    assert.ok(open.path.every((h) => !(h.col === 2 && h.row === 2)));
  });

  test("Gelände kostet: Gebirge (2×) ist teurer als Ebene", () => {
    const plan = planTravel({ col: 0, row: 0 }, { col: 1, row: 0 }, 5, 1, () => "m")!;
    assert.equal(plan.totalMinutes, 2 * MINUTES_PER_HEX);
  });

  test("positionAlongPath interpoliert nach Zeit", () => {
    const steps = [0, 10, 20];
    assert.deepEqual(positionAlongPath(steps, 5), { index: 0, t: 0.5 });
    assert.deepEqual(positionAlongPath(steps, 15), { index: 1, t: 0.25 });
    assert.equal(positionAlongPath(steps, 99).index, 2);
  });
});

describe("feste Weltkarte", () => {
  test("alle 10 Locations liegen auf betretbaren Feldern und sind untereinander erreichbar", () => {
    const entries = Object.entries(LOCATION_HEXES);
    assert.equal(entries.length, 10);
    for (const [, h] of entries) {
      const t = terrainAt(h);
      assert.ok(t && isPassable(t));
    }
    const start = LOCATION_HEXES["hafenstadt"];
    for (const [slug, h] of entries) {
      if (slug === "hafenstadt") continue;
      assert.ok(planTravel(start, h, WORLD_COLS, WORLD_ROWS, terrainAt), `${slug} von der Hafenstadt aus erreichbar`);
    }
  });
});

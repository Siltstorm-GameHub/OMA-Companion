import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { planStarterLineup, type StarterPoolCard } from "./auto-starter";

const POOL: StarterPoolCard[] = [
  { id: "t1", class: "TANK" },
  { id: "t2", class: "TANK" },
  { id: "d1", class: "DAMAGE_DEALER" },
  { id: "d2", class: "DAMAGE_DEALER" },
  { id: "s1", class: "SUPPORT" },
  { id: "s2", class: "SUPPORT" },
];
const classOf = (id: string) => [...POOL, { id: "own", class: "SUPPORT" as const }].find((c) => c.id === id)!.class;

describe("Auto-Startpaket", () => {
  test("ohne Besitz: 5 neue Standardkarten, jede Klasse vertreten, keine Doppelten", () => {
    const plan = planStarterLineup([], null, POOL);
    assert.equal(plan.lineupCardIds.length, 5);
    assert.deepEqual(new Set(plan.grantCardIds), new Set(plan.lineupCardIds));
    assert.equal(new Set(plan.lineupCardIds).size, 5);
    assert.deepEqual(new Set(plan.lineupCardIds.map(classOf)), new Set(["TANK", "DAMAGE_DEALER", "SUPPORT"]));
  });

  test("ohne Besitz: 1 Tank, 2 Damage Dealer, 2 Supports", () => {
    const plan = planStarterLineup([], null, POOL);
    const count = (cls: string) => plan.lineupCardIds.filter((id) => classOf(id) === cls).length;
    assert.deepEqual([count("TANK"), count("DAMAGE_DEALER"), count("SUPPORT")], [1, 2, 2]);
  });

  test("eigene Community-Karte steht im Lineup und wird nicht neu vergeben", () => {
    const plan = planStarterLineup([{ cardId: "own", class: "SUPPORT", rarity: "COMMUNITY" }], "own", POOL);
    assert.equal(plan.lineupCardIds[0], "own");
    assert.ok(!plan.grantCardIds.includes("own"));
    assert.equal(plan.lineupCardIds.length, 5);
    assert.deepEqual(new Set(plan.lineupCardIds.map(classOf)), new Set(["TANK", "DAMAGE_DEALER", "SUPPORT"]));
  });

  test("vorhandene Karten werden genutzt statt neue zu vergeben", () => {
    const owned = ["t1", "t2", "d1", "d2", "s1", "s2"].map((id) => ({ cardId: id, class: classOf(id), rarity: "STANDARD" as const }));
    const plan = planStarterLineup(owned, null, POOL);
    assert.equal(plan.lineupCardIds.length, 5);
    assert.equal(plan.grantCardIds.length, 0);
  });

  test("zu kleiner Pool: Lineup so groß wie möglich", () => {
    const plan = planStarterLineup([], null, POOL.slice(0, 2));
    assert.deepEqual(plan.lineupCardIds.sort(), ["t1", "t2"]);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { companionTravelBonus, isMount, MAX_TRAVEL_BONUS, totalTravelBonus, travelBonusLabel } from "./travel-speed";
import { getItem } from "./items";
import { getPerk, effectsOf } from "./perks";

describe("Reisetempo-Bonus", () => {
  test("Reittier-Begleiter geben einen Bonus, andere Monster nicht", () => {
    assert.ok(companionTravelBonus("wolf") > 0);
    assert.ok(companionTravelBonus("rentier") > 0);
    assert.ok(companionTravelBonus("schattenwolf") > companionTravelBonus("wolf"));
    assert.equal(companionTravelBonus("ratte"), 0);
    assert.equal(companionTravelBonus(null), 0);
    assert.ok(isMount("wolf") && !isMount("ratte"));
  });

  test("Wanderstiefel und Siebenmeilenstiefel tragen einen Reise-Bonus", () => {
    assert.ok((getItem("wanderstiefel")?.travelSpeed ?? 0) > 0);
    assert.ok((getItem("siebenmeilenstiefel")?.travelSpeed ?? 0) > (getItem("wanderstiefel")?.travelSpeed ?? 0));
  });

  test("Talent Wegkundig gibt 10 % über effectsOf", () => {
    assert.equal(getPerk("wegkundig")?.travelSpeed, 0.1);
    assert.equal(effectsOf(["wegkundig"]).travelSpeed, 0.1);
    assert.equal(effectsOf([]).travelSpeed, 0);
  });

  test("Quellen stapeln sich, sind aber gemeinsam gedeckelt", () => {
    const items = [{ travelSpeed: 0.18 }];
    const uncapped = totalTravelBonus({ equippedItems: items, companionId: "schattenwolf", perkBonus: 0.1 });
    assert.ok(uncapped <= MAX_TRAVEL_BONUS);
    assert.ok(uncapped > 0.3);
    const capped = totalTravelBonus({ equippedItems: [{ travelSpeed: 0.5 }], companionId: "schattenwolf", perkBonus: 0.5 });
    assert.equal(capped, MAX_TRAVEL_BONUS);
    assert.equal(totalTravelBonus({ equippedItems: [], companionId: null, perkBonus: 0 }), 0);
  });

  test("Hinweistext", () => {
    assert.equal(travelBonusLabel(0), null);
    assert.equal(travelBonusLabel(0.18), "−18 % Reisezeit");
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MONSTERS, RAID_BOSSES, buildFighter, getMonster, startCombat } from "./combat";
import { bonusOf, companionFx, performTame, tameCheck, isTameable } from "./companions";
import { getItem } from "./items";

const mods = { str: 3, dex: 2, con: 2, int: 2, wis: 2, cha: 2 };
const hero = () => buildFighter({ name: "T", classId: "krieger", level: 5, mods, critMin: 20, rerollFumble: false });
const src = { slug: "waldpfad", actor: "wolf1" };

describe("Begleiter", () => {
  test("jedes normale Monster hat einen Bonus, Raid-Bosse nicht", () => {
    for (const m of MONSTERS.filter((x) => !x.raid)) assert.ok(bonusOf(m.id), m.id);
    for (const b of RAID_BOSSES) { assert.equal(bonusOf(b.id), null); assert.equal(isTameable(b), false); }
    assert.deepEqual(companionFx("wolf"), { hit: 1 });
    assert.deepEqual(companionFx("drache"), { hp: 15 });
    assert.deepEqual(companionFx(null), {});
  });

  test("Zähmen geht nur wild, unter 25 % LP, einmal je Monster", () => {
    const w = getMonster("wolf")!;
    assert.ok(tameCheck("wolf", w.hp, w.hp, [], true));
    assert.equal(tameCheck("wolf", Math.floor(w.hp * 0.25), w.hp, [], true), null);
    assert.ok(tameCheck("wolf", 1, w.hp, ["wolf"], true));
    assert.ok(tameCheck("wolf", 1, w.hp, [], false));
    assert.ok(tameCheck("hydra", 1, 100, [], true));
  });

  test("Zähm-Versuch: Erfolg beendet den Kampf, Misserfolg kostet AP und Köder", () => {
    const w = getMonster("wolf")!;
    let s = { ...startCombat(w, hero(), src), monsterHp: 3 };
    assert.ok(performTame({ ...s, monsterHp: w.hp }, 0.5, [], () => 0).error);
    const ok = performTame(s, 0.55, [], () => 0.1);
    assert.equal(ok.state.status, "tamed");
    const fail = performTame(s, 0.3, [], () => 0.9);
    assert.equal(fail.state.status, "active");
    assert.equal(fail.state.ap, 2);
    s = { ...s, ap: 1 };
    const last = performTame(s, 0.3, [], () => 0.99);
    assert.equal(last.state.round, 2); // letzte AP weg → Monster war dran
  });

  test("Köder-Items existieren mit steigender Qualität", () => {
    assert.ok(getItem("koeder-einfach") && getItem("koeder-gut") && getItem("koeder-meister"));
  });
});

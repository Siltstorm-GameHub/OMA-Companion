import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PERKS, buyPriceFor, effectsOf, levelReward, milestones, rewardsBetween, sellPriceFor, titleOf } from "./perks";
import { resolveCheck } from "../te-map/rpg";

describe("Stufenaufstieg", () => {
  test("Belohnung je Stufe: ab Stufe 2 ein Attributspunkt, alle 3 Stufen zusätzlich eine Fähigkeit", () => {
    assert.deepEqual(levelReward(1), { attrPoints: 0, perkPick: false });
    assert.deepEqual(levelReward(2), { attrPoints: 1, perkPick: false });
    assert.deepEqual(levelReward(3), { attrPoints: 1, perkPick: true });
    assert.deepEqual(levelReward(21), { attrPoints: 0, perkPick: false });
    assert.deepEqual(rewardsBetween(1, 1), { attrPoints: 0, perkPicks: 0 });
    assert.deepEqual(rewardsBetween(1, 4), { attrPoints: 3, perkPicks: 1 });
    assert.deepEqual(rewardsBetween(1, 20), { attrPoints: 19, perkPicks: 6 });
    // rückwirkend und in Etappen ergibt dasselbe
    const a = rewardsBetween(1, 7), b = rewardsBetween(7, 20);
    assert.deepEqual({ attrPoints: a.attrPoints + b.attrPoints, perkPicks: a.perkPicks + b.perkPicks }, rewardsBetween(1, 20));
  });

  test("Titel folgen den Meilensteinen, Meilensteinliste deckt Stufen 2–20 ab", () => {
    assert.equal(titleOf(1), "Neuling");
    assert.equal(titleOf(4), "Wanderer");
    assert.equal(titleOf(10), "Held");
    assert.equal(titleOf(20), "Mythos");
    const ms = milestones();
    assert.equal(ms.length, 19);
    assert.equal(ms[0].level, 2);
    assert.equal(ms.filter((m) => m.perkPick).length, 6);
    assert.ok(ms.find((m) => m.level === 10)?.title === "Held");
  });

  test("Fähigkeiten: Proben-Boni, Feilscher, Lernbegierig, Adlerauge", () => {
    const ids = PERKS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    const fx = effectsOf(["scharfsinn", "redegewandt", "feilscher", "lernbegierig", "adlerauge"]);
    assert.equal(fx.checkBonus("int"), 1);
    assert.equal(fx.checkBonus("cha"), 2);
    assert.equal(fx.checkBonus("str"), 0);
    assert.equal(fx.trader, true);
    assert.equal(fx.critMin, 19);
    assert.ok(Math.abs(fx.xpMultiplier - 1.1) < 1e-9);
    assert.equal(buyPriceFor(100, true), 90);
    assert.equal(buyPriceFor(100, false), 100);
    assert.equal(sellPriceFor(10, true), 13);
    assert.deepEqual([effectsOf([]).critMin, effectsOf([]).xpMultiplier, effectsOf(["gibtsnicht"]).trader], [20, 1, false]);
  });

  test("Würfelregeln der Fähigkeiten: Adlerauge (19 gelingt) und Glücksrabe (1 wird neu gewürfelt)", () => {
    const base = { ability: "cha" as const, score: 10, level: 1, dc: 25 };
    assert.equal(resolveCheck({ ...base, roll: 19 }).success, false);
    assert.equal(resolveCheck({ ...base, roll: 19, critMin: 19 }).success, true);
    const seq = [0.5]; // zweiter Wurf: 1 + floor(0.5 * 20) = 11
    const r = resolveCheck({ ...base, dc: 10, roll: 1, rerollFumble: true, rng: () => seq[0] });
    assert.equal(r.roll, 11);
    assert.equal(r.rerolledFrom, 1);
    assert.equal(r.success, true);
    // ohne Fähigkeit bleibt die 1 ein Patzer
    assert.equal(resolveCheck({ ...base, dc: 1, roll: 1 }).success, false);
  });
});

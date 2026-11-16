import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dailyRate, questCoins, questRatio, sortOpenQuests } from "./quest-view";

const q = (id: string, current: number, target: number, reward = 50, completed = false) => ({ id, current, target, reward, completed });

describe("Quests-Seite", () => {
  test("offen zuerst nach Fortschritt, erledigte raus", () => {
    const list = [q("a", 1, 10), q("b", 9, 10), q("c", 5, 5, 50, true), q("d", 5, 10, 100), q("e", 5, 10, 20)];
    assert.deepEqual(sortOpenQuests(list).map(x => x.id), ["b", "d", "e", "a"]);
  });

  test("Tagesrate aufgerundet, mindestens ein Tag", () => {
    assert.equal(dailyRate(q("v", 390, 600), 14), 15);
    assert.equal(dailyRate(q("v", 590, 600), 0), 10);
    assert.equal(dailyRate(q("v", 600, 600), 5), null);
  });

  test("Münzen: verdient und insgesamt", () => {
    assert.deepEqual(questCoins([q("a", 1, 1, 100, true), q("b", 0, 5, 200)]), { earned: 100, total: 300 });
  });

  test("Fortschritt gekappt", () => {
    assert.equal(questRatio(q("x", 12, 10)), 1);
    assert.equal(questRatio(q("x", 3, 0)), 0);
  });
});

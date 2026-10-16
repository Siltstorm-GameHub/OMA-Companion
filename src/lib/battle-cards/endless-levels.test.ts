import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ENDLESS_FIRST_STAGE, generateEndlessLevel, parseEndlessStage } from "./endless-levels";
import { getCampaignLevel } from "./campaign-levels";
import { endlessStagesToShow, highestEndlessStage, isLevelUnlocked } from "./campaign";

describe("Endlos-Turm: Stufen-Generator", () => {
  test("gleiche Stufe → exakt gleiche Gegner", () => {
    assert.deepEqual(generateEndlessLevel(21), generateEndlessLevel(21));
  });

  test("Teamgröße 4, ab Stufe 16 dann 5, jede 5. Stufe ist ein Boss", () => {
    assert.equal(generateEndlessLevel(13).monsters.length, 4);
    assert.equal(generateEndlessLevel(15).monsters.length, 4);
    assert.equal(generateEndlessLevel(16).monsters.length, 5);
    assert.equal(generateEndlessLevel(40).monsters.length, 5);
    assert.equal(generateEndlessLevel(15).isBoss, true);
    assert.equal(generateEndlessLevel(16).isBoss, false);
  });

  test("feste Rollen-Aufteilung, Boss ersetzt den ersten Tank", () => {
    assert.deepEqual(generateEndlessLevel(14).monsters.map((m) => m.class), ["TANK", "DAMAGE_DEALER", "DAMAGE_DEALER", "SUPPORT"]);
    assert.deepEqual(generateEndlessLevel(21).monsters.map((m) => m.class), ["TANK", "DAMAGE_DEALER", "DAMAGE_DEALER", "SUPPORT", "TANK"]);
    const boss = generateEndlessLevel(20).monsters[0];
    assert.ok(["Serverabsturz-Kraken", "Season-Pass-Drache"].includes(boss.name));
  });

  test("Gegner werden mit jeder Stufe stärker", () => {
    for (let stage = ENDLESS_FIRST_STAGE; stage < 40; stage++) {
      assert.ok(generateEndlessLevel(stage + 1).statMultiplier > generateEndlessLevel(stage).statMultiplier);
    }
  });

  test("IDs: nur ab Stufe 13 gültig, Lookup über getCampaignLevel", () => {
    assert.equal(parseEndlessStage("endless-13"), 13);
    assert.equal(parseEndlessStage("endless-12"), null);
    assert.equal(parseEndlessStage("endless-abc"), null);
    assert.equal(getCampaignLevel("endless-20")?.order, 20);
    assert.equal(getCampaignLevel("lvl-05")?.order, 5);
  });
});

describe("Endlos-Turm: Freischaltung und Kartenausschnitt", () => {
  test("erste Endlos-Stufe braucht Level 12, danach jeweils die Vorgängerin", () => {
    assert.equal(isLevelUnlocked("lvl-01", new Set()), true);
    assert.equal(isLevelUnlocked("lvl-02", new Set()), false);
    assert.equal(isLevelUnlocked("endless-13", new Set(["lvl-11"])), false);
    assert.equal(isLevelUnlocked("endless-13", new Set(["lvl-12"])), true);
    assert.equal(isLevelUnlocked("endless-15", new Set(["lvl-12", "endless-13"])), false);
    assert.equal(isLevelUnlocked("endless-15", new Set(["endless-14"])), true);
  });

  test("Karte zeigt die letzten geschafften, die nächste und zwei Vorschau-Stufen", () => {
    assert.deepEqual(endlessStagesToShow(false, null), []);
    assert.deepEqual(endlessStagesToShow(true, null), [13, 14, 15]);
    assert.deepEqual(endlessStagesToShow(true, 20), [18, 19, 20, 21, 22, 23]);
    assert.equal(highestEndlessStage(["lvl-12", "endless-13", "endless-17"]), 17);
  });
});

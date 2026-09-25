import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { abilityMod, darkness, isNight, levelBonus, levelOf, resolveCheck, xpForLevel } from "./rpg";
import { applyChoiceResult, chooseOption, createGame, pickTalks, pressAction } from "./engine";
import { getWorld } from "./worlds";
import { defaultCustomWorldDoc, sanitizeCustomWorldDoc } from "./custom-world";

describe("Regelwerk", () => {
  test("Modifikatoren wie im Pen&Paper", () => {
    assert.equal(abilityMod(10), 0);
    assert.equal(abilityMod(14), 2);
    assert.equal(abilityMod(8), -1);
    assert.equal(abilityMod(20), 5);
  });

  test("Stufen aus XP, Stufen-Bonus alle 3 Stufen", () => {
    assert.equal(levelOf(0), 1);
    assert.equal(levelOf(xpForLevel(2)), 2);
    assert.equal(levelOf(xpForLevel(2) - 1), 1);
    assert.equal(levelOf(1_000_000), 20);
    assert.equal(levelBonus(1), 0);
    assert.equal(levelBonus(4), 1);
    assert.equal(levelBonus(20), 6);
  });

  test("Probe: natürliche 20 gelingt immer, natürliche 1 misslingt immer, sonst Summe gegen SG", () => {
    const base = { ability: "cha" as const, score: 10, level: 1 };
    assert.equal(resolveCheck({ ...base, dc: 25, roll: 20 }).success, true);
    assert.equal(resolveCheck({ ...base, dc: 5, roll: 1, equipmentBonus: 10 }).success, false);
    assert.equal(resolveCheck({ ...base, dc: 12, roll: 11 }).success, false);
    assert.equal(resolveCheck({ ...base, dc: 12, roll: 11, equipmentBonus: 1 }).success, true);
    const r = resolveCheck({ ability: "str", score: 16, level: 4, dc: 15, roll: 10 });
    assert.equal(r.modifier, 3 + 1);
    assert.equal(r.total, 14);
    assert.equal(r.success, false);
  });

  test("Tageszeit: Nacht 21–6, Dunkelheit weich zwischen 0 und 1", () => {
    assert.equal(isNight(22), true);
    assert.equal(isNight(3), true);
    assert.equal(isNight(12), false);
    for (let h = 0; h < 24; h++) { const d = darkness(h); assert.ok(d >= 0 && d <= 1, `${h}: ${d}`); }
    assert.equal(darkness(12), 0);
    assert.equal(darkness(23), 1);
  });
});

describe("Dialoge mit Antworten, Bedingungen und Tageszeit", () => {
  const world = getWorld("hafenstadt")!;
  const knut = world.map.actors.find((a) => a.id === "knut")!;

  test("Knut: tagsüber Antworten, nachts der Nachtdialog, mit Ereignis der Erinnerungs-Dialog", () => {
    const day = pickTalks(knut, {}, world, { flags: new Set(), night: false });
    assert.equal(day.length, 1);
    assert.ok(day[0].choices?.length);
    const night = pickTalks(knut, {}, world, { flags: new Set(), night: true });
    assert.equal(night[0].time, "night");
    const remembered = pickTalks(knut, {}, world, { flags: new Set(["knut-garn"]), night: false });
    assert.equal(remembered[0].requires?.[0], "knut-garn");
  });

  test("Antwort wählen: Dialog wartet, Ergebnis kommt als neuer Dialog mit Wurf, Ereignis wird gemerkt", () => {
    const g = createGame(world);
    g.px = knut.x; g.py = knut.y + 1; g.dir = "up";
    pressAction(g);
    while (g.dialog && !g.dialog.awaitingChoices) pressAction(g);
    assert.ok(g.dialog?.awaitingChoices);
    const req = chooseOption(g, 0);
    assert.deepEqual(req, { actor: "knut", talk: knut.talk.findIndex((t) => t.choices?.length), choice: 0 });
    assert.ok(g.dialog?.pending);
    const roll = { roll: 15, modifier: 0, total: 15, dc: 10, ability: "cha" as const, success: true, crit: false, fumble: false };
    applyChoiceResult(g, { lines: ["Gelungen!"], roll, flags: ["knut-garn"] });
    assert.equal(g.dialog?.lines[0], "Gelungen!");
    assert.equal(g.dialog?.roll?.total, 15);
    assert.ok(g.flags.has("knut-garn"));
  });

  test("Fehler bei der Auswertung nimmt die Wahl zurück", () => {
    const g = createGame(world);
    g.px = knut.x; g.py = knut.y + 1; g.dir = "up";
    pressAction(g);
    while (g.dialog && !g.dialog.awaitingChoices) pressAction(g);
    chooseOption(g, 0);
    applyChoiceResult(g, null);
    assert.equal(g.dialog?.awaitingChoices, true);
    assert.equal(g.dialog?.pending, false);
  });
});

describe("Editor-Dokument: Antworten und Händler", () => {
  test("Belohnungen werden begrenzt, unbekannte Gegenstände und Flags entfernt, Händler-Angebot gefiltert", () => {
    const d = JSON.parse(JSON.stringify(defaultCustomWorldDoc())) as ReturnType<typeof defaultCustomWorldDoc>;
    d.actors[0].talk = [{
      step: "*", lines: ["Hi"],
      choices: [{ text: "Nimm!", success: { lines: ["ok"], xp: 9999, gold: 500, items: ["gibt-es-nicht", "edelstein"], flags: ["gut-flag", "BÖSE FLAG"] } }],
      requires: ["a b", "ok-flag"],
    }];
    d.actors.push({ id: "haendler1", kind: "merchant", name: "H", x: 5, y: 5, dir: "down", config: d.actors[0].config, talk: [{ step: "*", lines: ["Kauf!"] }], shop: ["edelstein", "quatsch"] });
    const s = sanitizeCustomWorldDoc(d);
    assert.ok(s.ok);
    if (!s.ok) return;
    const c = s.doc.actors[0].talk[0].choices![0];
    assert.equal(c.success.xp, undefined, "zu viel XP wird verworfen");
    assert.equal(c.success.gold, undefined, "zu viel Gold wird verworfen");
    assert.deepEqual(c.success.items, ["edelstein"]);
    assert.deepEqual(c.success.flags, ["gut-flag"]);
    assert.deepEqual(s.doc.actors[0].talk[0].requires, ["ok-flag"]);
    assert.deepEqual(s.doc.actors[1].shop, ["edelstein"]);
  });
});

describe("Wetter", () => {
  test("deterministisch je Ort und Zeitfenster, Höhlen ohne Wetter, Schnee nur in kalten Zonen", async () => {
    const { weatherFor, weatherMatches, weatherModifier, biomeOfTerrain, WEATHER_WINDOW_MS } = await import("./rpg");
    const t = new Date(Date.UTC(2026, 8, 25, 12));
    assert.equal(weatherFor("hafenstadt", "temperate", t), weatherFor("hafenstadt", "temperate", new Date(t.getTime() + 60_000)));
    assert.equal(weatherFor("x", "cave", t), "clear");
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(weatherFor(`ort${i}`, "temperate", new Date(t.getTime() + i * WEATHER_WINDOW_MS)));
    assert.ok(seen.has("rain") && seen.has("storm") && seen.has("clear") && !seen.has("snow"));
    const cold = new Set<string>();
    for (let i = 0; i < 400; i++) cold.add(weatherFor(`ort${i}`, "cold", new Date(t.getTime() + i * WEATHER_WINDOW_MS)));
    assert.ok(cold.has("snow") && !cold.has("rain"));
    assert.equal(weatherMatches("rain", "storm"), true);
    assert.equal(weatherMatches("storm", "rain"), false);
    assert.equal(weatherModifier("fog", "wis"), -2);
    assert.equal(weatherModifier("clear", "wis"), 0);
    assert.equal(biomeOfTerrain("s"), "cold");
    assert.equal(biomeOfTerrain("d"), "dry");
    assert.equal(biomeOfTerrain("f"), "temperate");
  });
});

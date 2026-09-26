import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyTier, TIER_META, TIER_TITLE, tierOf } from "./monster-tier";
import { buildFighter, getMonster, rewardFor, startCombat, performAction } from "./combat";
import { startGroupCombat, performGroupAction } from "./group-combat";
import { tameCheck } from "./companions";
import { slainOf } from "./combat-server";
import { getWorld, WORLD_SLUGS } from "../te-map/worlds";
import { defaultCustomWorldDoc, sanitizeCustomWorldDoc, type CustomWorldDoc } from "../te-map/custom-world";
import { placeActor, tierCounts, updateActor } from "../te-map/custom-world-edit";

const mods = { str: 3, dex: 2, con: 2, int: 2, wis: 2, cha: 2 };
const hero = () => buildFighter({ name: "T", classId: "krieger", level: 6, mods, critMin: 20, rerollFumble: false });
const seq = (...v: number[]) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

describe("Monster-Stufen", () => {
  test("Elite und Boss sind größer und stärker, Normal und Raid bleiben unverändert", () => {
    const w = getMonster("wolf")!;
    assert.equal(applyTier(w, "normal"), w);
    assert.equal(applyTier(w, undefined), w);
    const e = applyTier(w, "elite"), b = applyTier(w, "boss");
    assert.equal(e.hp, Math.round(w.hp * 1.5)); assert.equal(b.hp, Math.round(w.hp * 2.5));
    assert.equal(e.attack, w.attack + 1); assert.equal(b.attack, w.attack + 2);
    assert.equal(b.attacks, w.attacks + 1); assert.equal(e.attacks, w.attacks);
    assert.ok(b.dmg[2] >= e.dmg[2] && e.dmg[2] >= w.dmg[2]);
    const hydra = getMonster("hydra")!;
    assert.equal(applyTier(hydra, "raid"), hydra);
    assert.equal(tierOf(hydra), "raid"); assert.equal(tierOf(w, "boss"), "boss"); assert.equal(tierOf(w, "quatsch"), "normal");
  });

  test("Kampf mit Stufe startet mit angehobenen Lebenspunkten", () => {
    const w = getMonster("wolf")!;
    const s = startCombat(w, hero(), undefined, "boss");
    assert.equal(s.monsterHp, Math.round(w.hp * 2.5)); assert.equal(s.monsterMaxHp, s.monsterHp); assert.equal(s.tier, "boss");
    assert.equal(startCombat(w, hero()).tier, undefined);
    const g = startGroupCombat(w, [{ cardId: "a", name: "a", fighter: hero() }], 0, undefined, "elite");
    assert.equal(g.monsterMaxHp, Math.round(w.hp * 1.5));
  });

  test("Bosse sind gegen Betäubt immun, Elite nicht", () => {
    const mage = buildFighter({ name: "M", classId: "magier", level: 9, mods, critMin: 20, rerollFumble: false, fx: { hit: 0, dmg: 0, hp: 0, ac: 0, critMinus: 0, regen: 0, cooldownMinus: 0, power: 0, apMinus: 0, slots: 3, mastery: false, auraHit: 0, auraAc: 0, auraRegen: 0 } });
    const cast = (tier: "elite" | "boss") => performGroupAction(startGroupCombat(getMonster("wolf")!, [{ cardId: "a", name: "a", fighter: mage }], 0, undefined, tier), "a", "ability3", undefined, 0, seq(0.5)).state;
    assert.ok(cast("elite").log.some((l) => l.includes("betäubt und setzt aus")));
    assert.ok(cast("boss").log.some((l) => l.includes("immun")));
  });

  test("Belohnung wächst mit der Stufe, ab Boss ist Beute sicher, Raid gibt Meister-Köder", () => {
    const m = getMonster("hauptmann")!;
    const none = () => 0.999;
    const n = rewardFor(m, m.level, none, "normal"), e = rewardFor(m, m.level, none, "elite"), b = rewardFor(m, m.level, none, "boss");
    assert.equal(e.xp, n.xp * 2); assert.equal(b.xp, n.xp * 4);
    assert.equal(n.items.length, 0); assert.equal(e.items.length, 0); assert.equal(b.items.length, 1);
    assert.ok(rewardFor(getMonster("hydra")!, 10, none, "raid").items.includes("koeder-meister"));
  });

  test("Zähmbar ist nur Normal", () => {
    assert.equal(tameCheck("wolf", 1, 100, [], true, "normal"), null);
    for (const t of ["elite", "boss", "raid"] as const) assert.ok(tameCheck("wolf", 1, 100, [], true, t), t);
  });

  test("Wiederkehr je Stufe: 15 Min, 1 Std, 3 Std, 24 Std", () => {
    assert.deepEqual(["normal", "elite", "boss", "raid"].map((t) => TIER_META[t as keyof typeof TIER_META].respawnMs / 60000), [15, 60, 180, 1440]);
    const t0 = Date.now() - 30 * 60_000;
    const card = { dndFlags: [`slain:hafenstadt:mon1@${t0}`, `slain:hafenstadt:mon2@${t0}~${60 * 60_000}`] };
    assert.deepEqual(slainOf(card), ["hafenstadt:mon2"]);
  });

  test("Titel für den ersten Sieg und Gruppengröße des Raids", () => {
    assert.deepEqual([TIER_TITLE.elite, TIER_TITLE.boss, TIER_TITLE.raid], ["Kronenjäger", "Schädelbrecher", "Raid-Legende"]);
    for (const id of ["hydra", "drachenfuerst"]) assert.equal(getMonster(id)!.raid!.min, 4);
    assert.equal(TIER_META.raid.mapScale, 2); assert.equal(TIER_META.elite.mapScale, 1.5); assert.equal(TIER_META.boss.mapScale, 1.5);
  });

  test("Editor: Stufe wird gespeichert, Höchstzahl je Location (2 Elite, 1 Boss)", () => {
    let d = JSON.parse(JSON.stringify(defaultCustomWorldDoc())) as CustomWorldDoc;
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) { const r = placeActor(d, "monster", 6 + i * 2, 6); d = r.doc; if (r.id) ids.push(r.id); }
    d = updateActor(d, ids[0], { tier: "elite" }); d = updateActor(d, ids[1], { tier: "elite" }); d = updateActor(d, ids[2], { tier: "boss" });
    assert.deepEqual(tierCounts(d), { elite: 2, boss: 1 });
    const ok = sanitizeCustomWorldDoc(d);
    assert.ok(ok.ok);
    if (ok.ok) assert.equal(ok.doc.actors.find((a) => a.id === ids[2])?.tier, "boss");
    d = updateActor(d, ids[3], { tier: "boss" });
    const bad = sanitizeCustomWorldDoc(d);
    assert.ok(!bad.ok || bad.warnings.length > 0);
  });

  test("Feste Welten setzen Stufen (Hauptmann Boss, Golem/Eisbär Elite)", () => {
    const tiers = WORLD_SLUGS.flatMap((s) => getWorld(s)!.map.actors.filter((a) => a.kind === "monster" && a.tier).map((a) => `${a.monster}:${a.tier}`));
    assert.ok(tiers.includes("hauptmann:boss")); assert.ok(tiers.includes("golem:elite")); assert.ok(tiers.includes("eisbaer:elite"));
  });
});

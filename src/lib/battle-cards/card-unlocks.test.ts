import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Card } from "@prisma/client";
import { checkUnlocked, itemStatesOf, bgStatesOf } from "./card-unlocks";
import { defaultTeConfig, TE_CATALOG, type TeCharacterConfig } from "../te-character";

const variant = (cat: string, id: string) => TE_CATALOG.categories.find((c) => c.id === cat)!.items.find((i) => i.id === id)!.variants[0];
const cfg = (layers: Record<string, string>, extra: Partial<TeCharacterConfig> = {}): TeCharacterConfig => ({ ...defaultTeConfig(), layers: { ...defaultTeConfig().layers, ...layers }, ...extra });
const card = (o: Partial<Card> = {}) => ({ cardUnlocks: null, dndCreatedAt: new Date(), dndXp: 0, teCharacter: null, dndClass: "krieger", ...o }) as unknown as Card;

describe("Karten-Freischaltungen", () => {
  test("freie Teile gehen, gesperrte nicht", () => {
    const c = card();
    assert.equal(checkUnlocked(c, cfg({ weapon: variant("weapon", "sword1") }), null), null);
    assert.ok(checkUnlocked(c, cfg({ weapon: variant("weapon", "gun1") }), null));
    assert.ok(checkUnlocked(c, cfg({ backextra: variant("backextra", "backpack2") }), null));
    assert.ok(checkUnlocked(c, cfg({}, { bg: "night3" }), null));
    assert.equal(checkUnlocked(c, cfg({}, { bg: "plains" }), null), null);
  });

  test("Stufe und Kauf schalten frei, getragene Teile bleiben erlaubt", () => {
    assert.equal(itemStatesOf(card({ dndXp: 0 }))["weapon:axe1"].ok, false);
    assert.equal(bgStatesOf(card())["night3"].ok, false);
    assert.equal(bgStatesOf(card({ cardUnlocks: ["bg:night3"] } as Partial<Card>))["night3"].ok, true);
    assert.equal(itemStatesOf(card({ cardUnlocks: ["item:weapon:gun1"] } as Partial<Card>))["weapon:gun1"].ok, true);
    const worn = cfg({ weapon: variant("weapon", "gun1") });
    assert.equal(itemStatesOf(card({ teCharacter: worn } as unknown as Partial<Card>))["weapon:gun1"].ok, true);
    assert.equal(checkUnlocked(card({ teCharacter: worn } as unknown as Partial<Card>), worn, worn), null);
  });

  test("jede Klasse hat mindestens eine freie Waffe", async () => {
    const { CLASS_WEAPONS } = await import("../te-character/class-weapons");
    const { ITEM_SOURCE } = await import("../te-character/card-catalog");
    for (const [cls, ws] of Object.entries(CLASS_WEAPONS)) assert.ok(ws.some((w) => ITEM_SOURCE[`weapon:${w}`]?.kind === "free"), cls);
  });
});

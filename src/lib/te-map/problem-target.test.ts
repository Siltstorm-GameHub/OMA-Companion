import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkPlayable } from "./custom-world";
import { problemTarget } from "./problem-target";
import { starterDoc } from "./starters";

describe("problemTarget", () => {
  const d = starterDoc("dorf");
  it("findet Gebäude und Figuren über ihren Namen", () => {
    assert.deepEqual(problemTarget("Vor der Tür von „Taverne“ ist kein erreichbarer Platz.", d), { tab: "map", select: { type: "building", index: 0 } });
    assert.deepEqual(problemTarget(`„${d.actors[0].name}“ ist vom Startpunkt aus nicht erreichbar.`, d), { tab: "map", select: { type: "actor", id: d.actors[0].id } });
  });
  it("Quest-Meldungen führen zur Quest, Standort zu den Details", () => {
    assert.deepEqual(problemTarget("Quest „Erste Aufgabe“, Schritt 1: xyz", d), { tab: "quest" });
    assert.deepEqual(problemTarget("Wähle ein leeres Feld auf der Weltkarte für deine Location.", d), { tab: "details" });
  });
  it("echte Prüfmeldungen sind zuordenbar", () => {
    const bad = { ...d, buildings: d.buildings.map((b) => ({ ...b, doorDx: 0 })), stamps: [...d.stamps, { id: "rockBig" as const, x: 4, y: 11 }, { id: "rockBig" as const, x: 5, y: 11 }, { id: "rockBig" as const, x: 6, y: 11 }] };
    for (const p of checkPlayable(bad)) assert.ok(problemTarget(p, bad).tab);
  });
});

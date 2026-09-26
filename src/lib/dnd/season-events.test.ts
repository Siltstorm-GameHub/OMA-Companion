import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SEASON_TEMPLATES, defaultRange, seasonOfMonster, seasonOfQuest, withEvents } from "./season-events";
import { DND_QUESTS } from "./quests-catalog";
import { MONSTERS, encountersFor, getMonster } from "./combat";
import { isTameable } from "./companions";
import { getWorld, WORLD_SLUGS } from "../te-map/worlds";
import { BG_SOURCE } from "../te-character/card-catalog";
import { STAMPS } from "../te-map/stamps";

describe("Saison-Events", () => {
  test("Vorlagen sind vollständig: Monster, Quests, Objekte, Belohnungen existieren", () => {
    for (const t of Object.values(SEASON_TEMPLATES)) {
      for (const id of t.monsters) { const m = getMonster(id); assert.ok(m, id); assert.ok(!m!.event || m!.event === t.key); assert.ok(isTameable(m)); }
      for (const q of t.quests) { const d = DND_QUESTS.find((x) => x.slug === q); assert.ok(d, q); assert.equal(d!.event, t.key); assert.equal(seasonOfQuest(q), t.key); assert.ok(d!.targetRef && (t.monsters.includes(d!.targetRef) || t.raid === d!.targetRef)); }
      for (const s of t.stamps) assert.ok(STAMPS[s], s);
      const boss = getMonster(t.raid);
      assert.ok(boss?.raid && boss.raid.min === 4 && boss.event === t.key, t.raid);
    }
    for (const d of DND_QUESTS.filter((x) => x.grant)) {
      if (d.grant!.bg) assert.ok(BG_SOURCE[d.grant!.bg as keyof typeof BG_SOURCE], d.grant!.bg);
      if (d.grant!.companion) assert.ok(isTameable(getMonster(d.grant!.companion)));
    }
  });

  test("Event-Monster tauchen nie als Zufallsbegegnung auf", () => {
    for (const lvl of [1, 3, 5, 8]) for (const b of ["temperate", "cold", "dry"] as const) assert.ok(encountersFor(lvl, b).every((m) => !m.event));
    assert.ok(MONSTERS.filter((m) => m.event).length >= 5);
  });

  test("withEvents legt Objekte und Monster über feste Welten — deterministisch, Original unverändert", () => {
    const w = getWorld(WORLD_SLUGS[0])!;
    const before = JSON.stringify(w.map);
    const a = withEvents(w, ["halloween"]);
    const b = withEvents(w, ["halloween"]);
    assert.equal(JSON.stringify(w.map), before);
    assert.equal(JSON.stringify(a.map), JSON.stringify(b.map));
    assert.ok(a.map.stamps.length > w.map.stamps.length);
    assert.ok(a.map.actors.some((x) => x.kind === "monster" && x.monster === "geist"));
    const both = withEvents(w, ["halloween", "christmas"]);
    assert.ok(both.map.actors.some((x) => x.monster === "wichtel"));
    assert.equal(withEvents(w, ["quatsch"]).map.stamps.length, w.map.stamps.length);
  });

  test("Zeitfenster-Vorschläge liegen in richtiger Reihenfolge", () => {
    for (const k of ["halloween", "christmas"] as const) { const r = defaultRange(k, 2026); assert.ok(r.endsAt > r.startsAt); }
  });
});

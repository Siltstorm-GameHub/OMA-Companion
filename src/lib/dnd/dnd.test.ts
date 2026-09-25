// ============================================
// Unit-Tests — OMA-Quest-Würfellogik & Reise-Resolve (reine Funktionen)
// ============================================
// Läuft über Node's eingebauten Test-Runner + tsx (siehe package.json
// "test"-Script), gleiche Konvention wie board-match3.test.ts.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { roll4d6DropLowest, rollAbilityScores, deriveBaseStats, ABILITY_KEYS } from "./ability-scores";
import { resolveCharacterPosition } from "./travel";
import { rollNewCharacterSheet, buildCharacterSheet } from "./character-creation";
import { getRace } from "./races";
import { getDndClass } from "./classes";
import { weightedPick } from "./story-content";

describe("roll4d6DropLowest", () => {
  test("liegt immer zwischen 3 und 18", () => {
    for (let i = 0; i < 500; i++) {
      const v = roll4d6DropLowest();
      assert.ok(v >= 3 && v <= 18, `Wert ${v} außerhalb 3-18`);
    }
  });

  test("ist mit fixem RNG deterministisch (verwirft den niedrigsten von 4)", () => {
    // Würfe: 1,2,3,4 (der Reihe nach) → niedrigster (1) wird verworfen → 2+3+4=9
    const sequence = [0.0, 1 / 6, 2 / 6, 3 / 6];
    let i = 0;
    const rng = () => sequence[i++];
    assert.equal(roll4d6DropLowest(rng), 9);
  });
});

describe("rollAbilityScores", () => {
  test("wendet Rassen-Boni additiv an", () => {
    const rng = () => 0.5; // konstanter Wurf
    const withoutBonus = rollAbilityScores({}, rng);
    const withBonus = rollAbilityScores({ str: 2, con: 1 }, rng);
    assert.equal(withBonus.str, withoutBonus.str + 2);
    assert.equal(withBonus.con, withoutBonus.con + 1);
    assert.equal(withBonus.dex, withoutBonus.dex);
  });

  test("liefert alle 6 Attribute", () => {
    const scores = rollAbilityScores({});
    for (const key of ABILITY_KEYS) {
      assert.ok(typeof scores[key] === "number");
    }
  });
});

describe("deriveBaseStats", () => {
  test("clamped auf ±20% um die Klassen-Baseline", () => {
    const extreme = { str: 24, dex: 10, con: 24, int: 10, wis: 10, cha: 10 };
    const stats = deriveBaseStats("TANK", "str", extreme);
    // Baseline TANK: hp 1150, attack 91 — Clamp erlaubt max +20%
    assert.ok(stats.baseHp <= 1150 * 1.2 + 1);
    assert.ok(stats.baseAttack <= 91 * 1.2 + 1);
  });

  test("niedrige Werte werden nach unten geclamped, nicht unbegrenzt reduziert", () => {
    const low = { str: 3, dex: 10, con: 3, int: 10, wis: 10, cha: 10 };
    const stats = deriveBaseStats("TANK", "str", low);
    assert.ok(stats.baseHp >= 1150 * 0.8 - 1);
  });

  test("speed ist fix pro Klasse (Klassen-Mittelwert)", () => {
    const stats = deriveBaseStats("SUPPORT", "wis", { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 });
    assert.equal(stats.speed, 62);
  });
});

describe("rollNewCharacterSheet", () => {
  test("liefert konsistente cardClass-Zuordnung zur dndClass", () => {
    const sheet = rollNewCharacterSheet("Testheld");
    assert.ok(["TANK", "DAMAGE_DEALER", "SUPPORT"].includes(sheet.cardClass));
    assert.ok(sheet.backstory.length > 0);
  });
});

describe("buildCharacterSheet", () => {
  test("übernimmt gewählte Rasse/Klasse unverändert, würfelt nur Attribute", () => {
    const race = getRace("zwerg")!;
    const dndClass = getDndClass("krieger")!;
    const sheet = buildCharacterSheet("Testheld", race, dndClass);
    assert.equal(sheet.race.id, "zwerg");
    assert.equal(sheet.dndClass.id, "krieger");
    assert.equal(sheet.cardClass, "TANK");
    for (const key of ABILITY_KEYS) {
      assert.ok(typeof sheet.abilityScores[key] === "number");
    }
  });
});

describe("resolveCharacterPosition", () => {
  const still = {
    currentHexCol: 5,
    currentHexRow: 5,
    travelToCol: null,
    travelToRow: null,
    travelPath: null,
    travelDepartedAt: null,
    travelArrivesAt: null,
  };
  // Zwei Ebenen-/Geländefelder in einer Zeile; die Dauer je Feld kommt aus world.json,
  // getestet wird nur die Zeit-Interpolation (Gesamtdauer = Ankunft − Abreise).
  const travelling = (departedAt: Date, arrivesAt: Date) => ({
    ...still,
    travelToCol: 7,
    travelToRow: 5,
    travelPath: [[5, 5], [6, 5], [7, 5]],
    travelDepartedAt: departedAt,
    travelArrivesAt: arrivesAt,
  });

  test("stehende Karte: inTransit=false, Feld gesetzt", () => {
    const resolved = resolveCharacterPosition(still);
    assert.equal(resolved.inTransit, false);
    assert.deepEqual(resolved.hex, { col: 5, row: 5 });
  });

  test("Karte ohne Hex-Position (Alt-Charakter): hex=null, Backfill macht der Aufrufer", () => {
    const resolved = resolveCharacterPosition({ ...still, currentHexCol: null, currentHexRow: null });
    assert.equal(resolved.hex, null);
  });

  test("reisende Karte vor Ankunft: inTransit=true, progress zwischen 0 und 1, Pfad wird mitgegeben", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const resolved = resolveCharacterPosition(
      travelling(new Date("2026-01-01T11:00:00Z"), new Date("2026-01-01T13:00:00Z")),
      now,
    );
    assert.equal(resolved.inTransit, true);
    assert.equal(resolved.progress, 0.5);
    assert.equal(resolved.path?.length, 3);
    assert.deepEqual(resolved.to, { col: 7, row: 5 });
  });

  test("Ankunftszeit erreicht: gilt als angekommen (inTransit=false) für Lesezwecke", () => {
    const resolved = resolveCharacterPosition(
      travelling(new Date("2026-01-01T11:00:00Z"), new Date("2026-01-01T13:00:00Z")),
      new Date("2026-01-01T14:00:00Z"),
    );
    assert.equal(resolved.inTransit, false);
  });
});

describe("weightedPick", () => {
  test("gibt null für leere Pools zurück", () => {
    assert.equal(weightedPick([]), null);
  });

  test("wählt deterministisch mit fixem RNG entsprechend der Gewichtung", () => {
    const pool = [
      { id: "a", weight: 1 },
      { id: "b", weight: 9 },
    ];
    // rng() nahe 0 -> trifft "a" (Gewicht 1 zuerst im Bereich); rng() nahe 1 -> "b"
    assert.equal(weightedPick(pool, () => 0.05)?.id, "a");
    assert.equal(weightedPick(pool, () => 0.99)?.id, "b");
  });
});

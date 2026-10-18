import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applyDailyCap,
  battleScore,
  berlinDateKey,
  daysBetween,
  displayStreak,
  endlessStageCoins,
  firstWinBonusCoins,
  GEMS_DAILY_COIN_CAP,
  nextStreak,
  weekIndex,
  weekStartKey,
} from "./daily-rules";

describe("OMA Gems: Tage und Wochen", () => {
  test("Berliner Kalendertag, auch kurz nach Mitternacht", () => {
    // 22:30 UTC im Sommer ist in Berlin schon 00:30 am nächsten Tag
    assert.equal(berlinDateKey(new Date("2026-07-14T22:30:00Z")), "2026-07-15");
    assert.equal(berlinDateKey(new Date("2026-01-14T22:30:00Z")), "2026-01-14");
  });

  test("Woche beginnt am Montag, Wochen-Nummer steigt jeden Montag um 1", () => {
    assert.equal(weekStartKey("2026-10-17"), "2026-10-12"); // Samstag → Montag
    assert.equal(weekStartKey("2026-10-12"), "2026-10-12");
    assert.equal(weekStartKey("2026-10-18"), "2026-10-12"); // Sonntag gehört noch dazu
    assert.equal(weekIndex("2026-10-18") + 1, weekIndex("2026-10-19"));
    assert.equal(weekIndex("2026-10-12"), weekIndex("2026-10-18"));
  });

  test("Tage zwischen zwei Daten, auch über Monatsgrenzen", () => {
    assert.equal(daysBetween("2026-10-31", "2026-11-01"), 1);
    assert.equal(daysBetween("2026-10-17", "2026-10-17"), 0);
  });
});

describe("OMA Gems: Serie", () => {
  test("erster Sieg startet die Serie, jeder weitere Tag zählt eins hoch, höchstens 7", () => {
    assert.equal(nextStreak(null, "2026-10-17"), 1);
    assert.equal(nextStreak({ streakDays: 3, lastWinDate: "2026-10-16" }, "2026-10-17"), 4);
    assert.equal(nextStreak({ streakDays: 7, lastWinDate: "2026-10-16" }, "2026-10-17"), 7);
  });

  test("ein verpasster Tag zieht einen Serientag ab, statt auf null zu setzen", () => {
    assert.equal(nextStreak({ streakDays: 5, lastWinDate: "2026-10-15" }, "2026-10-17"), 5); // 5 − 1 + 1
    assert.equal(nextStreak({ streakDays: 2, lastWinDate: "2026-10-10" }, "2026-10-17"), 1);
  });

  test("Anzeige: heute noch nicht gespielt zählt nicht als verpasst", () => {
    assert.equal(displayStreak({ streakDays: 4, lastWinDate: "2026-10-16" }, "2026-10-17"), 4);
    assert.equal(displayStreak({ streakDays: 4, lastWinDate: "2026-10-14" }, "2026-10-17"), 2);
    assert.equal(displayStreak(null, "2026-10-17"), 0);
  });
});

describe("OMA Gems: Münzen", () => {
  test("Tagesbonus wächst mit der Serie", () => {
    assert.equal(firstWinBonusCoins(1), 25);
    assert.equal(firstWinBonusCoins(7), 55);
    assert.equal(firstWinBonusCoins(12), 55);
  });

  test("Aufstiegs-Stufen bringen je 10 Stufen etwas mehr", () => {
    assert.equal(endlessStageCoins(13), 10);
    assert.equal(endlessStageCoins(22), 10);
    assert.equal(endlessStageCoins(23), 12);
    assert.equal(endlessStageCoins(53), 18);
  });

  test("Tageslimit verteilt der Reihe nach und kappt den Rest", () => {
    const result = applyDailyCap(
      [
        { label: "Bonus", coins: 40 },
        { label: "Stufe", coins: 30 },
      ],
      GEMS_DAILY_COIN_CAP - 50
    );
    assert.deepEqual(result.lines.map((l) => l.coins), [40, 10]);
    assert.equal(result.total, 50);
    assert.equal(result.capReached, true);
    assert.equal(applyDailyCap([{ label: "x", coins: 10 }], GEMS_DAILY_COIN_CAP).total, 0);
  });

  test("Kapitel-Sterne liegen außerhalb des Limits und belasten es nicht", () => {
    const result = applyDailyCap(
      [
        { label: "Sterne", coins: 60, uncapped: true },
        { label: "Bonus", coins: 40 },
      ],
      GEMS_DAILY_COIN_CAP - 10
    );
    assert.deepEqual(result.lines.map((l) => l.coins), [60, 10]);
    assert.equal(result.total, 70);
    assert.equal(result.cappedTotal, 10);
  });

  test("eine volle Woche liegt beim Budget von rund 1000 Münzen", () => {
    assert.ok(GEMS_DAILY_COIN_CAP * 7 >= 1000 && GEMS_DAILY_COIN_CAP * 7 <= 1100);
  });

  test("Punktzahl: Sieg zählt am meisten, dann Leben, Runden kosten", () => {
    assert.equal(battleScore(true, 1, 10), 1400);
    assert.ok(battleScore(true, 0.1, 30) > battleScore(false, 1, 1));
    assert.equal(battleScore(false, 0, 99), 0);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { POINT_RULES, DAILY_CAPS, COIN_PREFIX, RANK_PREFIX, computeAward, reasonVariants, sumByCurrency, type PointRule } from "./points";

describe("Punkte-Regeln", () => {
  test("nur Turnierplatzierungen geben Rang-Punkte", () => {
    for (const rule of Object.keys(POINT_RULES) as PointRule[]) {
      const { givesRankPoints } = computeAward(rule);
      assert.equal(givesRankPoints, POINT_RULES[rule].category === "turnier", rule);
    }
    assert.equal(computeAward("TOURNAMENT_WIN").givesRankPoints, true);
    assert.equal(computeAward("TOURNAMENT_PARTICIPATE").givesRankPoints, false);
    assert.equal(computeAward("EVENT_ATTEND").givesRankPoints, false);
  });

  test("alle Beträge positiv, alle Begründungen eindeutig", () => {
    const reasons = new Set<string>();
    for (const [rule, { amount, reason }] of Object.entries(POINT_RULES)) {
      assert.ok(amount > 0, rule);
      assert.ok(!reasons.has(reason), `doppelte Begründung: ${reason}`);
      reasons.add(reason);
    }
  });

  test("Tages-Caps sind ein Vielfaches des Regelbetrags (sonst wird der Cap überschritten)", () => {
    for (const [rule, cap] of Object.entries(DAILY_CAPS) as [PointRule, number][]) {
      assert.equal(cap % POINT_RULES[rule].amount, 0, `${rule}: Cap ${cap} / Betrag ${POINT_RULES[rule].amount}`);
    }
  });
});

describe("computeAward", () => {
  test("normale Vergabe: Betrag und Münz-Begründung, keine Rang-Punkte", () => {
    const a = computeAward("EVENT_ATTEND");
    assert.equal(a.amount, 80);
    assert.equal(a.coinReason, `${COIN_PREFIX} Event besucht 📅`);
    assert.equal(a.rankReason, null);
  });

  test("Turniersieg schreibt Münzen und Rang-Punkte mit gleicher Begründung", () => {
    const a = computeAward("TOURNAMENT_WIN", { customReason: "Turniersieg: Cup #3" });
    assert.equal(a.amount, 1000);
    assert.equal(a.coinReason, `${COIN_PREFIX} Turniersieg: Cup #3`);
    assert.equal(a.rankReason, `${RANK_PREFIX} Turniersieg: Cup #3`);
  });

  test("Geburtstags-Boost verdoppelt und hängt das Suffix an", () => {
    const a = computeAward("VOICE_HOUR", { birthdayBoost: true });
    assert.equal(a.amount, 30);
    assert.match(a.coinReason, /🎂×2$/);
  });

  test("gespeicherte Begründungen werden von reasonVariants wiedergefunden (Caps, Dedupe, Rückbuchung)", () => {
    for (const birthdayBoost of [false, true]) {
      const a = computeAward("TOURNAMENT_TOP3", { birthdayBoost, customReason: "Top 3: Liga" });
      assert.ok(reasonVariants(COIN_PREFIX, "Top 3: Liga").includes(a.coinReason));
      assert.ok(reasonVariants(RANK_PREFIX, "Top 3: Liga").includes(a.rankReason!));
    }
  });
});

describe("sumByCurrency", () => {
  test("trennt Münzen und Rang-Punkte, ignoriert fremde Präfixe", () => {
    const res = sumByCurrency([
      { amount: 1000, reason: `${COIN_PREFIX} Sieg` },
      { amount: 1000, reason: `${RANK_PREFIX} Sieg` },
      { amount: 2000, reason: `${COIN_PREFIX} Sieg 🎂×2` },
      { amount: 50, reason: "[Korrektur] Sieg" },
    ]);
    assert.deepEqual(res, { coins: 3000, rankPoints: 1000 });
  });
});

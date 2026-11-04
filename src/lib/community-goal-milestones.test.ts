import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { computeCommunityGoalProgress, type CommunityGoal } from "./community-goal";
import { evaluateGoal, parseGoalState, userTeams } from "./community-goal-milestones";

const entry = (userId: string, stats: Record<string, unknown>) => ({ userId, statsJson: JSON.stringify(stats) });
const goal = (scope: CommunityGoal["scope"]): CommunityGoal => ({ fields: ["Schritte"], target: 1000, scope, rewardCoins: 20 });
const empty = parseGoalState(null);

describe("Community-Ziel: Meilensteine und Belohnung", () => {
  test("meldet nur die höchste neue Stufe, merkt sich alle erreichten", () => {
    const matches = [{ entries: [entry("a", { Schritte: 400 }), entry("b", { Schritte: 200 })] }];
    const r = evaluateGoal(computeCommunityGoalProgress(matches, goal("community")), empty, {});
    assert.equal(r.newMilestone, 50);
    assert.deepEqual(r.milestones, [25, 50]);
    assert.deepEqual(r.rewardUserIds, [], "noch nicht erreicht → keine Belohnung");
    const again = evaluateGoal(computeCommunityGoalProgress(matches, goal("community")), { ...empty, milestones: r.milestones }, {});
    assert.equal(again.newMilestone, null);
  });

  test("Gemeinschaftsziel erreicht: alle Mitwirkenden, jede Person nur einmal", () => {
    const matches = [{ entries: [entry("a", { Schritte: 800 }), entry("b", { Schritte: 300 }), entry("c", { Schritte: 0 })] }];
    const progress = computeCommunityGoalProgress(matches, goal("community"));
    const r = evaluateGoal(progress, empty, {});
    assert.equal(r.newMilestone, 100);
    assert.deepEqual(r.rewardUserIds.sort(), ["a", "b"]);
    const later = evaluateGoal(progress, { milestones: r.milestones, rewardedUserIds: ["a", "b"] }, {});
    assert.deepEqual(later.rewardUserIds, []);
  });

  test("Team-Ziel: nur Mitwirkende des Teams, das die Marke erreicht", () => {
    const matches = [{ entries: [
      entry("a", { Schritte: 700, _team: "A" }), entry("b", { Schritte: 400, _team: "A" }), entry("c", { Schritte: 900, _team: "B" }),
    ] }];
    const r = evaluateGoal(computeCommunityGoalProgress(matches, goal("team")), empty, userTeams(matches));
    assert.deepEqual(r.rewardUserIds.sort(), ["a", "b"]);
  });

  test("Einzel-Ziel: nur wer die Marke selbst erreicht", () => {
    const matches = [{ entries: [entry("a", { Schritte: 1200 }), entry("b", { Schritte: 900 })] }];
    const r = evaluateGoal(computeCommunityGoalProgress(matches, goal("solo")), empty, {});
    assert.deepEqual(r.rewardUserIds, ["a"]);
  });

  test("kaputter Zustand wird leer gelesen", () => {
    assert.deepEqual(parseGoalState("{kaputt"), { milestones: [], rewardedUserIds: [] });
  });
});

describe("Tempo-Anzeige", () => {
  test("Fortschritt im Vergleich zur verstrichenen Zeit", async () => {
    const { goalPace } = await import("./community-goal");
    assert.equal(goalPace(60, 0.4)?.status, "ahead");
    assert.equal(goalPace(42, 0.4)?.status, "on_track");
    assert.equal(goalPace(20, 0.4)?.status, "behind");
    assert.equal(goalPace(100, 0.4), null);
    assert.equal(goalPace(10, 0), null);
  });
});

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildHomeTasks, closestQuests, endsIn, homeTaskCoins, type HomeTaskInput } from "./home-tasks";

const base: HomeTaskInput = {
  loggedIn: true, spunToday: true, swipe: null, clipVotingOpen: false, clipVoted: false, recentResults: [], quests: [],
};

describe("Aufgabenleiste der Startseite", () => {
  test("nichts offen → keine Chips, Gäste nie", () => {
    assert.deepEqual(buildHomeTasks(base), []);
    assert.deepEqual(buildHomeTasks({ ...base, loggedIn: false, spunToday: false }), []);
  });

  test("offene Dinge werden zu Kacheln mit Unterzeile", () => {
    const now = new Date("2026-11-16T12:00:00Z").getTime();
    const tasks = buildHomeTasks({
      ...base, now, spunToday: false, spinMaxCoins: 200, clipVotingOpen: true, clipVotingEndsAt: "2026-11-18T12:00:00Z",
      swipe: { open: 4, drop: null },
      recentResults: [{ title: "Valorant Clash", href: "/tournament/x" }, { title: "B", href: "/b" }],
      quests: [{ title: "Voice 3 Std", current: 2, target: 3, completed: false, reward: 50 }],
    });
    assert.deepEqual(tasks.map(t => [t.key, t.label, t.sub]), [
      ["spin", "Glücksrad drehen", "Täglich gratis · bis 200 Münzen"],
      ["clip", "Clip des Monats wählen", "Voting endet in 2 Tagen"],
      ["swipe", "GameSwipe", "4 Spiele bewerten"],
      ["results", "Ergebnisse sind da", "Valorant Clash +1 weitere"],
      ["quest", "Quest fast geschafft", "Voice 3 Std 2/3 · +50"],
    ]);
    assert.equal(homeTaskCoins(tasks), 250);
    assert.ok(Math.abs(tasks[4].progress! - 2 / 3) < 1e-9);
  });

  test("Drop schlägt normale GameSwipe-Karten, abgestimmt = keine Clip-Kachel", () => {
    const t = buildHomeTasks({ ...base, swipe: { open: 9, drop: { open: 1 } }, clipVotingOpen: true, clipVoted: true });
    assert.deepEqual(t.map(x => [x.label, x.sub]), [["Drop der Woche", "1 neues Spiel swipen"]]);
  });

  test("Fristen", () => {
    const now = new Date("2026-11-16T12:00:00Z").getTime();
    assert.equal(endsIn("2026-11-16T17:00:00Z", now), "endet in 5 Std");
    assert.equal(endsIn("2026-11-17T12:00:00Z", now), "endet morgen");
    assert.equal(endsIn("2026-11-16T11:00:00Z", now), "endet jetzt");
  });

  test("Quest erst ab der Hälfte, erledigte nie", () => {
    assert.equal(buildHomeTasks({ ...base, quests: [{ title: "a", current: 1, target: 3, completed: false }] }).length, 0);
    assert.equal(buildHomeTasks({ ...base, quests: [{ title: "a", current: 3, target: 3, completed: true }] }).length, 0);
  });

  test("nächste Quests nach Fortschritt", () => {
    const q = [
      { id: "a", current: 1, target: 10, completed: false },
      { id: "b", current: 3, target: 4, completed: false },
      { id: "c", current: 5, target: 5, completed: true },
      { id: "d", current: 1, target: 2, completed: false },
    ];
    assert.deepEqual(closestQuests(q).map(x => x.id), ["b", "d"]);
  });
});

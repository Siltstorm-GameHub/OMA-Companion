import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildHomeTasks, closestQuests, type HomeTaskInput } from "./home-tasks";

const base: HomeTaskInput = {
  loggedIn: true, spunToday: true, swipe: null, clipVotingOpen: false, clipVoted: false, recentResults: [], quests: [],
};

describe("Aufgabenleiste der Startseite", () => {
  test("nichts offen → keine Chips, Gäste nie", () => {
    assert.deepEqual(buildHomeTasks(base), []);
    assert.deepEqual(buildHomeTasks({ ...base, loggedIn: false, spunToday: false }), []);
  });

  test("offene Dinge werden zu Chips", () => {
    const keys = buildHomeTasks({
      ...base, spunToday: false, clipVotingOpen: true, swipe: { open: 4, drop: null },
      recentResults: [{ title: "Valorant Clash", href: "/tournament/x" }, { title: "B", href: "/b" }],
      quests: [{ title: "Voice 3 Std", current: 2, target: 3, completed: false }],
    }).map(t => [t.key, t.label]);
    assert.deepEqual(keys, [
      ["spin", "Glücksrad drehen"],
      ["clip", "Clip des Monats wählen"],
      ["swipe", "4 Spiele in GameSwipe"],
      ["results", "Ergebnisse: Valorant Clash +1"],
      ["quest", "Quest: Voice 3 Std 2/3"],
    ]);
  });

  test("Drop schlägt normale GameSwipe-Karten, abgestimmt = kein Clip-Chip", () => {
    const t = buildHomeTasks({ ...base, swipe: { open: 9, drop: { open: 1 } }, clipVotingOpen: true, clipVoted: true });
    assert.deepEqual(t.map(x => x.label), ["Drop der Woche: 1 Spiel"]);
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

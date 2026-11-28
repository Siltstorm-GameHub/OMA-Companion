import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { addHiddenResults, buildHomeTasks, closestQuests, endsIn, HOME_TASKS_MAX, homeTaskCoins, parseHiddenResults, type HomeTaskInput } from "./home-tasks";

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
      recentResults: [{ id: "x", title: "Valorant Clash", href: "/tournament/x" }, { id: "b", title: "B", href: "/b" }],
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

  test("Ergebnisse wegklicken: ausgeblendete Events fallen raus, ✕ deckt alle gezeigten ab", () => {
    const recentResults = [
      { id: "a", title: "A", href: "/tournament/a" },
      { id: "b", title: "B", href: "/tournament/b" },
      { id: "c", title: "C", href: "/tournament/c" },
    ];
    const t = buildHomeTasks({ ...base, recentResults, hiddenResultIds: ["a"] });
    assert.deepEqual(t.map(x => [x.sub, x.href, x.dismissIds]), [["B +1 weitere", "/tournament/b", ["b", "c"]]]);
    assert.deepEqual(buildHomeTasks({ ...base, recentResults, hiddenResultIds: ["a", "b", "c"] }), []);
  });

  test("Cookie-Liste der ausgeblendeten Ergebnisse", () => {
    assert.deepEqual(parseHiddenResults(undefined), []);
    assert.deepEqual(parseHiddenResults(encodeURIComponent("a,b, ,c")), ["a", "b", "c"]);
    assert.deepEqual(addHiddenResults(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
    const many = Array.from({ length: 40 }, (_, i) => `e${i}`);
    assert.equal(addHiddenResults(many, ["neu"]).length, 30);
    assert.equal(addHiddenResults(many, ["neu"]).at(-1), "neu");
  });

  test("Community-Events: \"Danke fürs Mitmachen\" mit Belohnung, wegklickbar", () => {
    const communityThanks = [
      { id: "c1", title: "Spieleabend", href: "/tournament/c1", coins: 20, rankPoints: 2 },
      { id: "c2", title: "Quiz", href: "/tournament/c2", coins: 0, rankPoints: 0 },
    ];
    const t = buildHomeTasks({ ...base, communityThanks });
    assert.deepEqual(t.map(x => [x.key, x.label, x.sub, x.dismissIds]), [
      ["thanks", "Danke fürs Mitmachen", "Spieleabend · +20 Münzen · +2 RP +1 weitere", ["c1", "c2"]],
    ]);
    assert.deepEqual(buildHomeTasks({ ...base, communityThanks, hiddenResultIds: ["c1"] }).map(x => x.sub), ["Quiz"]);
    assert.deepEqual(buildHomeTasks({ ...base, communityThanks, hiddenResultIds: ["c1", "c2"] }), []);
  });
test("Community: Blocks-Monatsende, Event-Vorschlag, Ideen kurz vor dem Ziel, Neu umgesetzt (wegklickbar)", () => {
    const input: HomeTaskInput = {
      ...base,
      blocks: { place: 4, daysLeft: 2 },
      proposalOpen: { id: "p1", title: "Mario Kart", interested: 3 },
      ideasNearGoal: { count: 2, href: "/community-board?ansicht=ziel" },
      roadmapNew: { key: "rm-item-r1", title: "Event-Vorschläge", href: "/community-board/roadmap#item-r1" },
    };
    assert.deepEqual(buildHomeTasks(input).map(t => [t.key, t.label, t.sub]), [
      ["blocks", "Blocks: Platz 4", "Monatswertung endet in 2 Tagen"],
      ["proposal", "Sucht Organisator", "Mario Kart · 3 wären dabei"],
      ["idea", "2 Ideen kurz vor dem Ziel", "Deine Unterstützung bringt sie ans Team"],
      ["roadmap", "Neu umgesetzt", "Event-Vorschläge"],
    ]);
    assert.equal(buildHomeTasks({ ...input, hiddenResultIds: ["rm-item-r1"] }).some(t => t.key === "roadmap"), false);
  });

  test("höchstens HOME_TASKS_MAX Kacheln", () => {
    const tasks = buildHomeTasks({
      ...base, spunToday: false, clipVotingOpen: true, swipe: { open: 3, drop: null },
      recentResults: [{ id: "x", title: "X", href: "/x" }],
      quests: [{ title: "Q", current: 9, target: 10, completed: false }],
      blocks: { place: 1, daysLeft: 1 }, proposalOpen: { id: "p", title: "P", interested: 2 },
      ideasNearGoal: { count: 1, href: "/i" }, roadmapNew: { key: "rm", title: "R", href: "/r" },
    });
    assert.equal(tasks.length, HOME_TASKS_MAX);
  });
});

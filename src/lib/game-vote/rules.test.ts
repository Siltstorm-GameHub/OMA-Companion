import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buyHint, costRankOf, fitLabel, fitScore, fitsSeries, parseGameVoteConfig, rankCandidates, sanitizeGameVoteConfig,
  seriesPlatformKeys, voteWindow, DEFAULT_GAME_VOTE_CONFIG, type TallyCandidate,
} from "./rules";

const H = 3_600_000;
const NOW = new Date("2026-11-14T12:00:00Z");

describe("Spielwahl: Einstellungen", () => {
  test("Standardwerte, Grenzen und kaputtes JSON", () => {
    assert.deepEqual(parseGameVoteConfig(null), DEFAULT_GAME_VOTE_CONFIG);
    assert.deepEqual(parseGameVoteConfig("{kaputt"), DEFAULT_GAME_VOTE_CONFIG);
    const c = sanitizeGameVoteConfig({ enabled: true, opensMode: "days_before", opensDaysBefore: 99, closesHoursBefore: 0, candidateCount: 1, voteCoins: -5, excludeLastN: "3" });
    assert.equal(c.enabled, true);
    assert.equal(c.opensMode, "days_before");
    assert.equal(c.opensDaysBefore, 30);
    assert.equal(c.closesHoursBefore, 1);
    assert.equal(c.candidateCount, 2);
    assert.equal(c.voteCoins, 0);
    assert.equal(c.excludeLastN, 3);
    assert.equal(sanitizeGameVoteConfig({ enabled: "yes" }).enabled, false);
  });
});

describe("Spielwahl: Zeitfenster", () => {
  const start = new Date(NOW.getTime() + 7 * 24 * H);
  test("sofort beim Anlegen bzw. X Tage vor Start, Ende X Stunden vor Start", () => {
    const a = voteWindow(start, NOW, { ...DEFAULT_GAME_VOTE_CONFIG, opensMode: "on_create", closesHoursBefore: 24 });
    assert.equal(a.opensAt.getTime(), NOW.getTime());
    assert.equal(a.closesAt.getTime(), start.getTime() - 24 * H);
    assert.equal(a.shortened, false);
    const b = voteWindow(start, NOW, { ...DEFAULT_GAME_VOTE_CONFIG, opensMode: "days_before", opensDaysBefore: 3, closesHoursBefore: 12 });
    assert.equal(b.opensAt.getTime(), start.getTime() - 72 * H);
    assert.equal(b.closesAt.getTime(), start.getTime() - 12 * H);
  });
  test("Beginn in der Vergangenheit → sofort; zu knapp → Ende auf halbem Weg", () => {
    const soon = new Date(NOW.getTime() + 10 * H);
    const w = voteWindow(soon, NOW, { ...DEFAULT_GAME_VOTE_CONFIG, opensMode: "days_before", opensDaysBefore: 5, closesHoursBefore: 24 });
    assert.equal(w.opensAt.getTime(), NOW.getTime());
    assert.equal(w.closesAt.getTime(), NOW.getTime() + 5 * H);
    assert.equal(w.shortened, true);
  });
});

describe("Spielwahl: passt das Spiel zur Reihe?", () => {
  const g = (over: object = {}) => ({ modes: ["coop", "pvp"], platforms: ["pc"], minPlayers: 1, maxPlayers: 4, ...over });
  test("Einzelspieler nie, PvP bei Duell-Formaten, Plattform muss passen, Unbekanntes schließt nicht aus", () => {
    assert.equal(fitsSeries(g({ modes: ["solo"] }), { format: null, platform: null }), false);
    assert.equal(fitsSeries(g({ modes: [], maxPlayers: 1 }), { format: null, platform: null }), false);
    assert.equal(fitsSeries(g({ modes: ["coop"] }), { format: "single_elimination", platform: null }), false);
    assert.equal(fitsSeries(g({ modes: ["coop"] }), { format: "coop_stats", platform: null }), true);
    assert.equal(fitsSeries(g({ modes: [] }), { format: "round_robin", platform: null }), true);
    assert.equal(fitsSeries(g({ platforms: ["playstation"] }), { format: null, platform: "PC, Xbox" }), false);
    assert.equal(fitsSeries(g({ platforms: ["xbox", "playstation"] }), { format: null, platform: "PC, Xbox" }), true);
    assert.equal(fitsSeries(g({ platforms: [] }), { format: null, platform: "Switch" }), true);
  });
  test("Plattform-Angaben der Reihe", () => {
    assert.deepEqual(seriesPlatformKeys("PC, PS5 / Xbox Series X"), ["pc", "playstation", "xbox"]);
    assert.deepEqual(seriesPlatformKeys("Nintendo Switch; Handy"), ["switch", "mobile"]);
    assert.deepEqual(seriesPlatformKeys(null), []);
  });
});

describe("Spielwahl: Passt-Wert und Kauf-Hinweis", () => {
  const base = { regularsIn: 0, regularsWish: 0, regularsTotal: 0, inCount: 0, wishCount: 0, isFree: null, discountPercent: 0, subscriptions: [] as string[] };
  test("Stammspieler zählen, ohne Stammspieler die Community, gratis/Abo gibt Bonus", () => {
    assert.equal(fitScore({ ...base, regularsTotal: 8, regularsIn: 5, regularsWish: 1 }), 17);
    assert.equal(fitScore({ ...base, inCount: 4, wishCount: 2 }), 10);
    assert.equal(fitScore({ ...base, regularsTotal: 8, subscriptions: ["gamepass_pc"] }), 3);
    assert.equal(fitLabel({ ...base, regularsTotal: 8, regularsIn: 5, isFree: true }), "5 von 8 Stammspielern sind am Start");
    assert.equal(fitLabel({ ...base, regularsTotal: 8, regularsWish: 2 }), "2 Stammspieler würden es holen");
    assert.equal(fitLabel({ ...base, inCount: 3, discountPercent: 40 }), "3 in der Community am Start");
    assert.equal(costRankOf({ isFree: null, subscriptions: [], discountPercent: 30 }), 1);
  });
  test("Kauf-Hinweis", () => {
    const b = { isFree: null, subscriptions: [], subscriptionLabels: [], priceLabel: "7,99 €", initialPriceLabel: "19,99 €", discountPercent: 60 };
    assert.equal(buyHint(b), "Gerade −60 % auf Steam: 7,99 € statt 19,99 €.");
    assert.equal(buyHint({ ...b, discountPercent: 0 }), "Kostet 7,99 € auf Steam.");
    assert.equal(buyHint({ ...b, subscriptions: ["gamepass_pc"], subscriptionLabels: ["Game Pass"] }), "Im Game Pass enthalten.");
    assert.equal(buyHint({ ...b, isFree: true }), "Das Spiel ist kostenlos — einfach installieren.");
    assert.equal(buyHint({ ...b, priceLabel: null }), "Schau rechtzeitig, wo du es bekommst.");
  });
});

describe("Spielwahl: Auswertung", () => {
  const c = (id: string, over: Partial<TallyCandidate> = {}): TallyCandidate =>
    ({ id, approvals: 0, votersIn: 0, costRank: 2, fitScore: 0, eligible: true, ...over });
  test("meiste Stimmen gewinnen; Gleichstand: wer es hat → günstiger → Passt-Wert → Los", () => {
    assert.deepEqual(rankCandidates([c("a", { approvals: 2 }), c("b", { approvals: 5 })]).map(r => r.id), ["b", "a"]);
    assert.deepEqual(rankCandidates([c("a", { approvals: 3, votersIn: 1 }), c("b", { approvals: 3, votersIn: 2 })])[0].id, "b");
    assert.deepEqual(rankCandidates([c("a", { approvals: 3, costRank: 2 }), c("b", { approvals: 3, costRank: 0 })])[0].id, "b");
    assert.deepEqual(rankCandidates([c("a", { approvals: 3, fitScore: 9 }), c("b", { approvals: 3, fitScore: 4 })])[0].id, "a");
    let n = 0;
    const rng = () => [0.9, 0.1][n++ % 2];
    assert.deepEqual(rankCandidates([c("a", { approvals: 1 }), c("b", { approvals: 1 })], rng)[0].id, "b");
  });
  test("nicht mehr wählbare Spiele bekommen keinen Platz", () => {
    const r = rankCandidates([c("weg", { approvals: 9, eligible: false }), c("a", { approvals: 1 }), c("b")]);
    assert.deepEqual(r, [{ id: "a", place: 1 }, { id: "b", place: 2 }, { id: "weg", place: null }]);
  });
});

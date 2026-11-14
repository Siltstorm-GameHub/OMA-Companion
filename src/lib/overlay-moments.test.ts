import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMyStatus, buildResultView, currentKnockoutStage, detectMoments, isMatchDone,
  type MomentMatch, type MomentState,
} from "./overlay-moments";

const duel = (id: string, round: number, p1: string | null, p2: string | null, extra: Partial<MomentMatch> = {}): MomentMatch => ({
  id, round, position: 1, title: null, player1Id: p1, player2Id: p2, winnerId: null, score1: null, score2: null, playedAt: null, entries: [], ...extra,
});
const round = (id: string, r: number, entries: { userId: string; stats?: Record<string, unknown>; placement?: number; score?: number }[], extra: Partial<MomentMatch> = {}): MomentMatch => ({
  id, round: r, position: 1, title: null, player1Id: null, player2Id: null, winnerId: null, score1: null, score2: null, playedAt: null,
  entries: entries.map((e, i) => ({ id: `${id}-${i}`, userId: e.userId, placement: e.placement ?? null, score: e.score ?? null, statsJson: e.stats ? JSON.stringify(e.stats) : null })),
  ...extra,
});
const st = (format: string | null, matches: MomentMatch[], statFields: string[] | null = null): MomentState =>
  ({ format, statFields: statFields ? JSON.stringify(statFields) : null, matches });
const played = "2026-11-14T20:00:00.000Z";
const names = (id: string | null) => (id ? id.toUpperCase() : "?");

describe("Overlay-Momente: Ergebnis erkannt", () => {
  test("erster Stand erzeugt nichts (kein Banner für alte Ergebnisse)", () => {
    const s = st("round_robin", [duel("m1", 1, "a", "b", { winnerId: "a", playedAt: played, score1: 2, score2: 0 })]);
    assert.deepEqual(detectMoments(null, s), []);
  });

  test("Liga/Jeder gegen jeden: Sieg und Unentschieden", () => {
    const before = st("liga", [duel("m1", 1, "a", "b"), duel("m2", 1, "c", "d")]);
    const after = st("liga", [
      duel("m1", 1, "a", "b", { winnerId: "a", playedAt: played, score1: 3, score2: 1 }),
      duel("m2", 1, "c", "d", { playedAt: played, score1: 1, score2: 1 }),
    ]);
    const moments = detectMoments(before, after);
    assert.deepEqual(moments.map(m => m.kind), ["result", "result"]);
    const draw = buildResultView(after.matches[1], after);
    assert.equal(draw?.kind, "duel");
    assert.equal(draw?.kind === "duel" && draw.winnerId, null);
    assert.equal(draw?.label, "Runde 1");
  });

  test("Freilos erzeugt kein Banner", () => {
    const before = st("single_elimination", [duel("m1", 1, "a", null)]);
    const after = st("single_elimination", [duel("m1", 1, "a", null, { winnerId: "a" })]);
    assert.deepEqual(detectMoments(before, after), []);
  });

  test("K.O. mit Hin- und Rückspiel: Rückspiel zeigt Gesamtergebnis", () => {
    const first = duel("h", 1, "a", "b", { leg: 1, playedAt: played, score1: 2, score2: 1, winnerId: "a" });
    const second = duel("r", 1, "b", "a", { leg: 2, playedAt: played, score1: 3, score2: 0, winnerId: "b" });
    const s = st("single_elimination", [first, second]);
    const view = buildResultView(second, s);
    assert.ok(view && view.kind === "duel");
    assert.equal(view.label, "Finale · Rückspiel");
    assert.deepEqual(view.aggregate, { score1: 4, score2: 2 });
  });

  test("Gruppenphase: Gruppenspiel heißt nach der Gruppe, K.O.-Spiel nach der Runde", () => {
    const s = st("group_knockout", [
      duel("g", 1, "a", "b", { groupIndex: 1 }),
      duel("k1", 1, "a", "c", { groupIndex: null }), duel("k2", 2, null, null, { groupIndex: null }),
    ]);
    assert.equal(buildResultView({ ...s.matches[0], winnerId: "a" }, s)?.label, "Gruppe B");
    assert.equal(buildResultView({ ...s.matches[1], winnerId: "a" }, s)?.label, "Halbfinale");
  });

  test("FFA: Platzierungen bestimmen die Reihenfolge", () => {
    const m = round("f", 2, [{ userId: "a", placement: 3 }, { userId: "b", placement: 1 }, { userId: "c", placement: 2 }, { userId: "d", placement: 4 }], { playedAt: played });
    const view = buildResultView(m, st("ffa", [m]));
    assert.ok(view && view.kind === "field");
    assert.deepEqual(view.rows.map(r => [r.userId, r.place]), [["b", 1], ["c", 2], ["a", 3]]);
    assert.equal(view.label, "Runde 2");
  });

  test("FFA ohne Platzierung: nach erstem Stat-Feld, Gleichstand teilt den Platz", () => {
    const m = round("f", 1, [{ userId: "a", stats: { Kills: 5 } }, { userId: "b", stats: { Kills: 9 } }, { userId: "c", stats: { Kills: 5 } }], { playedAt: played });
    const view = buildResultView(m, st("ffa", [m], ["Kills"]));
    assert.ok(view && view.kind === "field");
    assert.deepEqual(view.rows.map(r => [r.userId, r.place, r.text]), [["b", 1, "9 Kills"], ["a", 2, "5 Kills"], ["c", 2, "5 Kills"]]);
  });

  test("Coop: gemeinsamer Sieg bzw. Team-Sieger", () => {
    const solo = round("c", 1, [{ userId: "a", stats: { "Match Win": 1, Punkte: 10 } }, { userId: "b", stats: { "Match Win": 1, Punkte: 4 } }], { playedAt: played });
    const v1 = buildResultView(solo, st("coop_stats", [solo], ["Match Win", "Punkte"]));
    assert.equal(v1?.kind === "field" && v1.headline, "Sieg!");
    const teams = round("t", 1, [
      { userId: "a", stats: { "Match Win": 0, _team: "A" } }, { userId: "b", stats: { "Match Win": 1, _team: "B" } },
    ], { playedAt: played });
    const v2 = buildResultView(teams, st("coop_stats", [teams], ["Match Win"]));
    assert.equal(v2?.kind === "field" && v2.headline, "Team B gewinnt");
  });

  test("Ø-Stats: Richtung \"low\" stellt den kleinsten Schnitt nach vorn", () => {
    const m = round("a", 1, [{ userId: "a", stats: { Zeit: 30 } }, { userId: "b", stats: { Zeit: 20 } }], { playedAt: played });
    const s: MomentState = { ...st("avg_stats", [m], ["Zeit"]), avgDirection: "low" };
    const view = buildResultView(m, s);
    assert.ok(view && view.kind === "field");
    assert.deepEqual(view.rows.map(r => [r.userId, r.text]), [["b", "Ø 20"], ["a", "Ø 30"]]);
  });

  test("Runde ohne Ergebnis gilt nicht als fertig", () => {
    assert.equal(isMatchDone(round("x", 1, [{ userId: "a" }])), false);
    assert.equal(isMatchDone(duel("y", 1, "a", "b", { score1: 1, score2: 0 })), false, "Zwischenstand ist kein Ergebnis");
  });
});

describe("Overlay-Momente: Phasenwechsel", () => {
  test("Gruppenphase → K.O.-Runde", () => {
    const before = st("group_knockout", [duel("g", 1, "a", "b", { groupIndex: 0, winnerId: "a" })]);
    const after = st("group_knockout", [...before.matches, duel("k1", 1, "a", "c", { groupIndex: null }), duel("k2", 2, null, null, { groupIndex: null })]);
    const phase = detectMoments(before, after).find(m => m.kind === "phase");
    assert.ok(phase && phase.kind === "phase");
    assert.equal(phase.title, "Die K.O.-Runde beginnt");
    assert.match(phase.detail ?? "", /Halbfinale/);
  });

  test("K.O.: nächste Runde und Finale", () => {
    const semi = [duel("s1", 1, "a", "b"), { ...duel("s2", 1, "c", "d"), position: 2 }];
    const before = st("single_elimination", [...semi, duel("f", 2, null, null)]);
    assert.equal(currentKnockoutStage(before)?.label, "Halbfinale");
    const after = st("single_elimination", [
      { ...semi[0], winnerId: "a" }, { ...semi[1], winnerId: "c" }, duel("f", 2, "a", "c"),
    ]);
    const phase = detectMoments(before, after).find(m => m.kind === "phase");
    assert.equal(phase?.kind === "phase" && phase.title, "Das Finale steht!");
  });

  test("Liga kennt keine Phasen-Banner", () => {
    const before = st("liga", [duel("m1", 1, "a", "b"), duel("m2", 2, "a", "c")]);
    const after = st("liga", [duel("m1", 1, "a", "b", { winnerId: "a" }), duel("m2", 2, "a", "c")]);
    assert.ok(detectMoments(before, after).every(m => m.kind === "result"));
  });
});

describe("Overlay-Momente: Mein Turnier", () => {
  test("Tabellenformat: Platz und nächster Gegner, laufendes Match zuerst", () => {
    const s = st("round_robin", [duel("m1", 1, "me", "b"), duel("m2", 2, "c", "me", { startedAt: played })]);
    const status = buildMyStatus(s, "me", names, { position: 2, of: 4, group: null });
    assert.equal(status.headline, "Platz 2 von 4");
    assert.equal(status.detail, "Läuft gerade: gegen C");
    assert.equal(status.live, true);
  });

  test("Gruppe: Gruppenname im Platz", () => {
    const s = st("group_knockout", [duel("g", 1, "me", "b", { groupIndex: 0, winnerId: "me" })]);
    assert.equal(buildMyStatus(s, "me", names, { position: 1, of: 3, group: 0 }).headline, "Gruppe A · Platz 1 von 3");
  });

  test("K.O.: ausgeschieden bzw. Turniersieg", () => {
    const lost = st("single_elimination", [duel("s", 1, "me", "b", { winnerId: "b" }), duel("f", 2, "b", "c")]);
    assert.deepEqual(buildMyStatus(lost, "me", names, null), { headline: "Ausgeschieden", detail: "Halbfinale", live: false });
    const won = st("single_elimination", [duel("s", 1, "me", "b", { winnerId: "me" }), duel("f", 2, "me", "c", { winnerId: "me" })]);
    assert.equal(buildMyStatus(won, "me", names, null).headline, "Turniersieg!");
  });

  test("K.O.: aktuelle Runde, auch wenn der Gegner noch fehlt", () => {
    const s = st("single_elimination", [
      duel("s1", 1, "me", "b", { winnerId: "me" }), { ...duel("s2", 1, "c", "d"), position: 2 }, duel("f", 2, "me", null),
    ]);
    assert.deepEqual(buildMyStatus(s, "me", names, null), { headline: "Im Finale", detail: "Gegner steht noch aus", live: false });
    const semi = st("single_elimination", [duel("s1", 1, "me", "b"), duel("f", 2, null, null)]);
    assert.deepEqual(buildMyStatus(semi, "me", names, null), { headline: "Im Halbfinale", detail: "Als Nächstes: gegen B", live: false });
  });

  test("K.O.: verlorenes Hinspiel ist kein Ausscheiden", () => {
    const s = st("single_elimination", [
      duel("h", 1, "me", "b", { leg: 1, winnerId: "b", playedAt: played }), duel("r", 1, "b", "me", { leg: 2 }),
    ]);
    assert.notEqual(buildMyStatus(s, "me", names, null).headline, "Ausgeschieden");
  });

  test("FFA: nächste Runde statt Gegner", () => {
    const s = st("ffa", [round("r3", 3, [{ userId: "me" }, { userId: "b" }])]);
    assert.equal(buildMyStatus(s, "me", names, { position: 1, of: 2, group: null }).detail, "Als Nächstes: Runde 3");
  });
});

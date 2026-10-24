import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGroupStandings, drawGroups, generateGroupMatches, generateKnockoutMatches, seedKnockout,
  validateGroupStageConfig, groupLetter, groupKnockoutRanking, groupMatchCount, aggregateKnockoutTies,
  computeLeagueStandings, leagueMemberIds, type GroupMatchLike,
} from "./groupStage";

/** Gruppe, in der der erste Spieler alle schlägt, der zweite alle außer dem ersten usw. */
function playedGroup(groupIndex: number, ids: string[]): GroupMatchLike[] {
  const matches: GroupMatchLike[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({ groupIndex, player1Id: ids[i], player2Id: ids[j], winnerId: ids[i], score1: 2, score2: 0, playedAt: new Date() });
    }
  }
  return matches;
}

describe("Gruppenphase + K.O.", () => {
  test("Auslosung verteilt gleichmäßig und erzeugt jeder-gegen-jeden je Gruppe", () => {
    const ids = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const groups = drawGroups(ids, 3);
    assert.deepEqual(groups.map(g => g.length).sort(), [3, 3, 4]);
    assert.deepEqual(groups.flat().sort(), [...ids].sort());
    const matches = generateGroupMatches(groups, "e");
    assert.equal(matches.length, 3 + 3 + 6);
    for (const m of matches) {
      assert.ok(groups[m.groupIndex!].includes(m.player1Id!) && groups[m.groupIndex!].includes(m.player2Id!));
    }
  });

  test("Tabelle: 3/1/0 Punkte, danach Tordifferenz", () => {
    const [table] = computeGroupStandings([["a", "b", "c"]], [
      { groupIndex: 0, player1Id: "a", player2Id: "b", winnerId: null, score1: 1, score2: 1, playedAt: new Date() },
      { groupIndex: 0, player1Id: "a", player2Id: "c", winnerId: "a", score1: 5, score2: 0, playedAt: new Date() },
      { groupIndex: 0, player1Id: "b", player2Id: "c", winnerId: "b", score1: 1, score2: 0, playedAt: new Date() },
      { groupIndex: 1, player1Id: "a", player2Id: "c", winnerId: "c", score1: 0, score2: 9, playedAt: new Date() },
    ]);
    assert.deepEqual(table.map(s => [s.userId, s.pts]), [["a", 4], ["b", 4], ["c", 0]]);
    assert.equal(table[0].scored - table[0].conceded, 5);
  });

  test("WM-Setzung: 2 Gruppen à 2 → A1–B2 und B1–A2 in verschiedenen Hälften", () => {
    const standings = computeGroupStandings([["a1", "a2", "a3"], ["b1", "b2", "b3"]], [
      ...playedGroup(0, ["a1", "a2", "a3"]), ...playedGroup(1, ["b1", "b2", "b3"]),
    ]);
    const slots = seedKnockout(standings, 2);
    const pairs = [[slots[0], slots[1]], [slots[2], slots[3]]].map(p => [...p].sort().join("-")).sort();
    assert.deepEqual(pairs, ["a1-b2", "a2-b1"]);
  });

  test("4 Gruppen à 2: Spieler derselben Gruppe treffen sich frühestens im Finale", () => {
    const groups = ["a", "b", "c", "d"].map(g => [1, 2, 3, 4].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const slots = seedKnockout(standings, 2);
    assert.equal(slots.length, 8);
    for (const g of ["a", "b", "c", "d"]) {
      const s1 = slots.indexOf(`${g}1`);
      const s2 = slots.indexOf(`${g}2`);
      assert.notEqual(s1 < 4, s2 < 4, `${g}1 und ${g}2 müssen in verschiedenen Hälften stehen`);
    }
  });

  test("Nicht-Zweierpotenz: Freilose für die besten Gruppensieger, bereits aufgerückt", () => {
    const groups = ["a", "b", "c"].map(g => [1, 2, 3].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const matches = generateKnockoutMatches(standings, 2, "e");
    const round1 = matches.filter(m => m.round === 1);
    assert.equal(round1.length, 4);
    const byes = round1.filter(m => !m.player1Id || !m.player2Id);
    assert.equal(byes.length, 2);
    for (const bye of byes) {
      assert.ok(bye.winnerId?.endsWith("1"), "Freilos geht an einen Gruppensieger");
      const next = matches.find(m => m.round === 2 && m.position === Math.ceil(bye.position / 2))!;
      assert.ok([next.player1Id, next.player2Id].includes(bye.winnerId));
    }
    for (const m of round1.filter(m => m.player1Id && m.player2Id)) {
      assert.notEqual(m.player1Id![0], m.player2Id![0], "keine Gruppen-Revanche in Runde 1");
    }
    assert.ok(matches.every(m => m.groupIndex === null));
  });

  test("Direkter Vergleich entscheidet bei Gleichstand nach Punkten, Tordifferenz und Toren", () => {
    const now = new Date();
    // b und c: je 3 Punkte, Tordifferenz 0, je 2 Tore — b hat c direkt geschlagen; a hat nur 1 Tor
    const [table] = computeGroupStandings([["c", "b", "a"]], [
      { groupIndex: 0, player1Id: "a", player2Id: "b", winnerId: "a", score1: 1, score2: 0, playedAt: now },
      { groupIndex: 0, player1Id: "b", player2Id: "c", winnerId: "b", score1: 2, score2: 1, playedAt: now },
      { groupIndex: 0, player1Id: "c", player2Id: "a", winnerId: "c", score1: 1, score2: 0, playedAt: now },
    ]);
    assert.deepEqual(table.map(s => s.userId), ["b", "c", "a"]);

    // a und b: je 3 Punkte, 2:2 Tore (x hat mehr Tore und steht vorn) — a hat b direkt geschlagen,
    // obwohl b in der Auslosung vor a steht
    const [table2] = computeGroupStandings([["b", "a", "x"]], [
      { groupIndex: 0, player1Id: "a", player2Id: "b", winnerId: "a", score1: 1, score2: 0, playedAt: now },
      { groupIndex: 0, player1Id: "x", player2Id: "a", winnerId: "x", score1: 2, score2: 1, playedAt: now },
      { groupIndex: 0, player1Id: "b", player2Id: "x", winnerId: "b", score1: 2, score2: 1, playedAt: now },
    ]);
    assert.deepEqual(table2.map(s => s.userId), ["x", "a", "b"]);
  });

  test("Spiel um Platz 3: wird in der Final-Runde angelegt und zählt im Ranking zwischen Finale und Halbfinale", () => {
    const groups = ["a", "b"].map(g => [1, 2, 3].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const ko = generateKnockoutMatches(standings, 2, "e", true);
    const third = ko.filter(m => m.isThirdPlace);
    assert.equal(third.length, 1);
    assert.equal(third[0].round, 2);
    assert.equal(third[0].position, 2);
    assert.equal(ko.filter(m => m.round === 2 && !m.isThirdPlace).length, 1);

    // Ranking: Finale a1 schlägt b1, Platz 3: a2 schlägt b2
    const now = new Date();
    const played = [
      ...groups.flatMap((g, i) => playedGroup(i, g)).map(m => ({ ...m, round: 1 })),
      { groupIndex: null, round: 1, player1Id: "a1", player2Id: "b2", winnerId: "a1", score1: 1, score2: 0, playedAt: now },
      { groupIndex: null, round: 1, player1Id: "b1", player2Id: "a2", winnerId: "b1", score1: 1, score2: 0, playedAt: now },
      { groupIndex: null, round: 2, player1Id: "a1", player2Id: "b1", winnerId: "a1", score1: 2, score2: 1, playedAt: now },
      { groupIndex: null, round: 2, isThirdPlace: true, player1Id: "b2", player2Id: "a2", winnerId: "a2", score1: 0, score2: 3, playedAt: now },
    ];
    const participants = groups.flatMap((g, gi) => g.map(userId => ({ userId, groupIndex: gi })));
    const ranking = groupKnockoutRanking(participants, played, JSON.stringify({ groupCount: 2, advancePerGroup: 2 }));
    assert.deepEqual(ranking.slice(0, 4).map(r => r.userId), ["a1", "b1", "a2", "b2"]);
    assert.match(ranking[0].label, /^Sieger/);
    assert.match(ranking[2].label, /^Platz 3/);
  });

  test("Gruppenphase mit Hin- und Rückspiel: jede Paarung zweimal, Heimrecht getauscht, Spieltage fortlaufend", () => {
    const matches = generateGroupMatches([["a", "b", "c", "d"]], "e", 2);
    assert.equal(matches.length, 12);
    const firstLegRounds = Math.max(...matches.slice(0, 6).map(m => m.round));
    for (const m of matches.slice(0, 6)) {
      const back = matches.find(x => x.player1Id === m.player2Id && x.player2Id === m.player1Id);
      assert.ok(back, "Rückspiel mit getauschtem Heimrecht existiert");
      assert.ok(back!.round > firstLegRounds);
    }
    assert.equal(groupMatchCount([4, 3], 2), (6 + 3) * 2);
  });

  test("K.O. mit Hin- und Rückspiel: zwei Spiele je Paarung, Finale einfach, Freilose einfach", () => {
    const groups = ["a", "b", "c"].map(g => [1, 2, 3].map(n => `${g}${n}`));
    const standings = computeGroupStandings(groups, groups.flatMap((g, i) => playedGroup(i, g)));
    const ko = generateKnockoutMatches(standings, 2, "e", true, { legs: 2, singleLegFinal: true });
    const totalRounds = Math.max(...ko.map(m => m.round));
    // Freilose (Runde 1, nur ein Spieler) bleiben Einzelspiele
    assert.ok(ko.filter(m => m.round === 1 && m.winnerId).every(m => !m.leg));
    // Echte Paarungen der ersten Runde: Hinspiel + Rückspiel mit getauschtem Heimrecht
    const realR1 = ko.filter(m => m.round === 1 && !m.winnerId);
    assert.equal(realR1.length, 4);
    const leg1 = realR1.find(m => m.leg === 1)!;
    const leg2 = realR1.find(m => m.leg === 2 && m.position === leg1.position)!;
    assert.equal(leg2.player1Id, leg1.player2Id);
    assert.equal(leg2.player2Id, leg1.player1Id);
    // Finale und Spiel um Platz 3 einfach
    assert.ok(ko.filter(m => m.round === totalRounds).every(m => !m.leg));
    const both = generateKnockoutMatches(standings, 2, "e", false, { legs: 2, singleLegFinal: false });
    assert.equal(both.filter(m => m.round === totalRounds).length, 2);
  });

  test("Gesamtergebnis: Hin- und Rückspiel werden zu einer Paarung zusammengefasst", () => {
    const base = { round: 1, position: 1, groupIndex: null, isThirdPlace: false };
    const now = new Date();
    const first = { ...base, id: "h", leg: 1, player1Id: "a", player2Id: "b", winnerId: "a", score1: 2, score2: 1, playedAt: now };
    const second = { ...base, id: "r", leg: 2, player1Id: "b", player2Id: "a", winnerId: "b", score1: 3, score2: 1, playedAt: now };
    const [tie] = aggregateKnockoutTies([first, second]);
    assert.equal(tie.player1Id, "a");
    assert.equal(tie.score1, 3); // a: 2 + 1
    assert.equal(tie.score2, 4); // b: 1 + 3
    assert.equal(tie.winnerId, "b");
    // Nur Hinspiel gespielt: noch nicht entschieden
    const [open] = aggregateKnockoutTies([first, { ...second, winnerId: null, score1: null, score2: null, playedAt: null }]);
    assert.equal(open.playedAt, null);
    assert.equal(open.winnerId, null);
    assert.equal(open.score1, 2);

    // Ranking zählt die Paarung, nicht die einzelnen Spiele (a gewinnt das Hinspiel, scheidet aber aus)
    const ranking = groupKnockoutRanking(
      [{ userId: "a", groupIndex: 0 }, { userId: "b", groupIndex: 1 }],
      [first, second],
      JSON.stringify({ groupCount: 2, advancePerGroup: 1 }),
    );
    assert.equal(ranking[0].userId, "b");
    assert.match(ranking[0].label, /^Sieger/);
  });

  test("Liga-Tabelle: Unentschieden ohne Tore zählt, nur Spieler aus Matches stehen drin", () => {
    const now = new Date();
    const matches = [
      { player1Id: "a", player2Id: "b", winnerId: null, score1: null, score2: null, playedAt: now },
      { player1Id: "a", player2Id: "c", winnerId: "a", score1: 2, score2: 0, playedAt: now },
      { player1Id: "b", player2Id: "c", winnerId: null, score1: null, score2: null, playedAt: null },
    ];
    // "zuschauer" ist angemeldet, steht aber in keinem Match
    const ids = leagueMemberIds(matches, ["zuschauer", "c", "b", "a"]);
    assert.deepEqual(ids, ["c", "b", "a"]);
    const table = computeLeagueStandings(ids, matches);
    assert.deepEqual(table.map(s => [s.userId, s.pts, s.d]), [["a", 4, 1], ["b", 1, 1], ["c", 0, 0]]);
    // ohne Matches: die Kandidaten selbst
    assert.deepEqual(leagueMemberIds([], ["x", "y"]), ["x", "y"]);
  });

  test("Losentscheid wird markiert, wenn alle sportlichen Kriterien gleich sind", () => {
    const now = new Date();
    // a und b spielen 1:1, beide schlagen c mit 1:0 → komplett gleich
    const [table] = computeGroupStandings([["b", "a", "c"]], [
      { groupIndex: 0, player1Id: "a", player2Id: "b", winnerId: null, score1: 1, score2: 1, playedAt: now },
      { groupIndex: 0, player1Id: "a", player2Id: "c", winnerId: "a", score1: 1, score2: 0, playedAt: now },
      { groupIndex: 0, player1Id: "b", player2Id: "c", winnerId: "b", score1: 1, score2: 0, playedAt: now },
    ]);
    assert.deepEqual(table.map(s => [s.userId, !!s.decidedByLot]), [["b", true], ["a", true], ["c", false]]);
  });

  test("Konfigurationsprüfung", () => {
    assert.equal(validateGroupStageConfig(16, { groupCount: 4, advancePerGroup: 2 }), null);
    assert.match(validateGroupStageConfig(5, { groupCount: 3, advancePerGroup: 1 })!, /höchstens 2 Gruppen/);
    assert.match(validateGroupStageConfig(8, { groupCount: 2, advancePerGroup: 4 })!, /höchstens 3/);
    assert.equal(groupLetter(0), "A");
    assert.equal(groupLetter(27), "AB");
  });
});

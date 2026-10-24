// Turnierformat "group_knockout" — Gruppenphase + K.O.-Runde wie bei einer Fußball-WM.
//
// Ablauf:
//  1. Gruppen auslosen: Teilnehmer werden zufällig auf groupCount Gruppen verteilt, jede Gruppe
//     spielt jeder-gegen-jeden (Match.groupIndex = Gruppe, Match.round = Spieltag).
//  2. Tabelle je Gruppe: Sieg 3, Unentschieden 1, Niederlage 0 · danach Tordifferenz, Tore; bei
//     weiterhin Gleichstand der direkte Vergleich (Punkte, Tordifferenz, Tore nur aus den Spielen der
//     Gleichplatzierten untereinander), dann Siege, zuletzt die Auslosungsreihenfolge (Losentscheid).
//  3. K.O.-Runde: die besten advancePerGroup jeder Gruppe ziehen in einen K.O.-Baum ein
//     (Match.groupIndex = null). Gruppensieger werden vor Gruppenzweiten gesetzt, und Spieler aus
//     derselben Gruppe landen möglichst weit auseinander im Baum (bei 2 Gruppen à 2 Weiterkommenden:
//     A1–B2 und B1–A2, A1 und A2 können sich erst im Finale wiedersehen). Optional mit Spiel um
//     Platz 3 zwischen den Halbfinal-Verlierern (Match.isThirdPlace).
//  4. Optional Hin- und Rückspiel — in der Gruppenphase (jede Paarung zweimal, Heimrecht getauscht)
//     und/oder in der K.O.-Runde (Gesamtergebnis entscheidet, bei Gleichstand wählt der Admin beim
//     Rückspiel, wer weiterkommt; Finale wahlweise als Einzelspiel).
//
// Rein funktional (kein Prisma), damit Server (Generierung) und Client (Tabellen) dieselbe
// Berechnung verwenden.
import { bracketFromSlots, generateRoundRobin, shuffle, type GeneratedMatch } from "./generate";

export const GROUP_KNOCKOUT_FORMAT = "group_knockout";

export type GroupStageConfig = {
  groupCount: number;
  advancePerGroup: number;
  thirdPlaceMatch?: boolean;
  /** 2 = Gruppenspiele mit Hin- und Rückspiel */
  groupLegs?: 1 | 2;
  /** 2 = K.O.-Paarungen mit Hin- und Rückspiel */
  knockoutLegs?: 1 | 2;
  /** Bei knockoutLegs = 2: Finale trotzdem als Einzelspiel (Standard) */
  singleLegFinal?: boolean;
};

export const DEFAULT_ADVANCE_PER_GROUP = 2;

export function parseGroupStageConfig(json: string | null | undefined): GroupStageConfig | null {
  if (!json) return null;
  try {
    const raw = JSON.parse(json) as Partial<GroupStageConfig>;
    const groupCount = Number(raw.groupCount);
    const advancePerGroup = Number(raw.advancePerGroup);
    if (!Number.isInteger(groupCount) || groupCount < 1) return null;
    return {
      groupCount,
      advancePerGroup: Number.isInteger(advancePerGroup) && advancePerGroup >= 1 ? advancePerGroup : DEFAULT_ADVANCE_PER_GROUP,
      thirdPlaceMatch: raw.thirdPlaceMatch === true,
      groupLegs: raw.groupLegs === 2 ? 2 : 1,
      knockoutLegs: raw.knockoutLegs === 2 ? 2 : 1,
      singleLegFinal: raw.singleLegFinal !== false,
    };
  } catch { return null; }
}

/** 0 → "A", 1 → "B", … 26 → "AA" */
export function groupLetter(groupIndex: number): string {
  let n = groupIndex;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export const groupLabel = (groupIndex: number) => `Gruppe ${groupLetter(groupIndex)}`;

/** Vorschlag für die Gruppenanzahl: Gruppen à 4 wie bei der WM, mindestens eine Gruppe. */
export function suggestedGroupCount(participantCount: number): number {
  return Math.max(1, Math.round(participantCount / 4));
}

/**
 * Prüft eine Gruppen-Konfiguration für n Teilnehmer. Gibt eine Fehlermeldung zurück oder null.
 * Jede Gruppe braucht ≥ 2 Spieler, aus jeder Gruppe muss mindestens einer ausscheiden, und
 * insgesamt müssen ≥ 2 Spieler die K.O.-Runde erreichen.
 */
export function validateGroupStageConfig(participantCount: number, cfg: GroupStageConfig): string | null {
  const { groupCount, advancePerGroup } = cfg;
  if (!Number.isInteger(groupCount) || groupCount < 1) return "Ungültige Gruppenanzahl.";
  if (!Number.isInteger(advancePerGroup) || advancePerGroup < 1) return "Mindestens 1 Spieler pro Gruppe muss weiterkommen.";
  if (participantCount < 3) return "Für Gruppenphase + K.O.-Runde werden mindestens 3 Teilnehmer benötigt.";
  const smallestGroup = Math.floor(participantCount / groupCount);
  if (smallestGroup < 2) return `Bei ${participantCount} Teilnehmern sind höchstens ${Math.floor(participantCount / 2)} Gruppen möglich (mind. 2 Spieler pro Gruppe).`;
  if (advancePerGroup >= smallestGroup) return `Die kleinste Gruppe hat ${smallestGroup} Spieler — es können höchstens ${smallestGroup - 1} pro Gruppe weiterkommen.`;
  if (groupCount * advancePerGroup < 2) return "Mindestens 2 Spieler müssen die K.O.-Runde erreichen.";
  return null;
}

/** Teilnehmer zufällig und möglichst gleichmäßig auf die Gruppen verteilen. */
export function drawGroups(participantIds: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  shuffle(participantIds).forEach((id, i) => groups[i % groupCount].push(id));
  return groups;
}

/**
 * Jeder-gegen-jeden innerhalb jeder Gruppe. Spieltag-Nummern laufen je Gruppe ab 1. Mit legs = 2
 * folgt eine Rückrunde: dieselben Paarungen mit getauschtem Heimrecht, Spieltage fortlaufend.
 */
export function generateGroupMatches(groups: string[][], eventId: string, legs: 1 | 2 = 1): GeneratedMatch[] {
  return groups.flatMap((ids, groupIndex) => {
    const first = generateRoundRobin(ids, eventId).map(m => ({ ...m, groupIndex }));
    if (legs === 1) return first;
    const rounds = first.length ? Math.max(...first.map(m => m.round)) : 0;
    const second = first.map(m => ({ ...m, round: m.round + rounds, player1Id: m.player2Id, player2Id: m.player1Id }));
    return [...first, ...second];
  });
}

/** Anzahl Gruppenspiele für Gruppengrößen (für Vorschauen in der Oberfläche). */
export function groupMatchCount(groupSizes: number[], legs: 1 | 2 = 1): number {
  return groupSizes.reduce((n, size) => n + (size * (size - 1)) / 2, 0) * legs;
}

// ── Tabellen ──────────────────────────────────────────────────────────────────

export type GroupMatchLike = {
  groupIndex?: number | null;
  isThirdPlace?: boolean;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null;
};

export type GroupStanding = {
  userId: string;
  groupIndex: number;
  played: number; w: number; d: number; l: number;
  scored: number; conceded: number; pts: number;
  /** Platz gegenüber einem Nachbarn nur per Los (Auslosungsreihenfolge) entschieden — alle
   *  sportlichen Kriterien inkl. direktem Vergleich und Siegen waren gleich. */
  decidedByLot?: boolean;
};

/** Reihenfolge innerhalb einer Tabelle (und beim Vergleich Gleichplatzierter verschiedener Gruppen). */
export function compareStandings(a: GroupStanding, b: GroupStanding): number {
  return (b.pts - a.pts)
    || ((b.scored - b.conceded) - (a.scored - a.conceded))
    || (b.scored - a.scored)
    || (b.w - a.w);
}

/**
 * Tabelle je Gruppe. members[g] = userIds der Gruppe g (in Auslosungsreihenfolge — bei komplettem
 * Gleichstand entscheidet diese, wie beim Losentscheid). Nur Gruppenspiele mit Ergebnis zählen;
 * ein gespieltes Match ohne Sieger ist ein Unentschieden.
 */
export function computeGroupStandings(members: string[][], matches: GroupMatchLike[]): GroupStanding[][] {
  return members.map((ids, groupIndex) => {
    const map = new Map<string, GroupStanding>(ids.map(userId => [userId, {
      userId, groupIndex, played: 0, w: 0, d: 0, l: 0, scored: 0, conceded: 0, pts: 0,
    }]));
    for (const m of matches) {
      if (m.groupIndex !== groupIndex || !m.playedAt || !m.player1Id || !m.player2Id) continue;
      const s1 = map.get(m.player1Id);
      const s2 = map.get(m.player2Id);
      for (const [self, own, other] of [[s1, m.score1, m.score2], [s2, m.score2, m.score1]] as const) {
        if (!self) continue;
        self.played += 1;
        self.scored += own ?? 0;
        self.conceded += other ?? 0;
      }
      if (!m.winnerId) {
        if (s1) { s1.d += 1; s1.pts += 1; }
        if (s2) { s2.d += 1; s2.pts += 1; }
      } else {
        const winner = m.winnerId === m.player1Id ? s1 : s2;
        const loser  = m.winnerId === m.player1Id ? s2 : s1;
        if (winner) { winner.w += 1; winner.pts += 3; }
        if (loser)  { loser.l += 1; }
      }
    }
    const order = new Map(ids.map((id, i) => [id, i]));
    const primary = (a: GroupStanding, b: GroupStanding) =>
      (b.pts - a.pts) || ((b.scored - b.conceded) - (a.scored - a.conceded)) || (b.scored - a.scored);
    const sorted = [...map.values()].sort((a, b) => primary(a, b) || (order.get(a.userId)! - order.get(b.userId)!));

    // Gleichstand nach Punkten/Tordifferenz/Toren: direkter Vergleich unter genau diesen Spielern
    const result: GroupStanding[] = [];
    for (let i = 0; i < sorted.length;) {
      let j = i + 1;
      while (j < sorted.length && primary(sorted[i], sorted[j]) === 0) j++;
      const tied = sorted.slice(i, j);
      if (tied.length > 1) {
        const h2h = headToHead(tied.map(t => t.userId), matches, groupIndex);
        const sporting = (a: GroupStanding, b: GroupStanding) => {
          const ha = h2h.get(a.userId)!, hb = h2h.get(b.userId)!;
          return (hb.pts - ha.pts) || (hb.diff - ha.diff) || (hb.scored - ha.scored) || (b.w - a.w);
        };
        tied.sort((a, b) => sporting(a, b) || (order.get(a.userId)! - order.get(b.userId)!));
        for (let k = 1; k < tied.length; k++) {
          if (sporting(tied[k - 1], tied[k]) === 0) tied[k - 1].decidedByLot = tied[k].decidedByLot = true;
        }
      }
      result.push(...tied);
      i = j;
    }
    return result;
  });
}

/** Mini-Tabelle nur aus den Gruppenspielen der übergebenen Spieler untereinander. */
function headToHead(userIds: string[], matches: GroupMatchLike[], groupIndex: number) {
  const set = new Set(userIds);
  const table = new Map(userIds.map(id => [id, { pts: 0, diff: 0, scored: 0 }]));
  for (const m of matches) {
    if (m.groupIndex !== groupIndex || !m.playedAt || !m.player1Id || !m.player2Id) continue;
    if (!set.has(m.player1Id) || !set.has(m.player2Id)) continue;
    const a = table.get(m.player1Id)!, b = table.get(m.player2Id)!;
    const s1 = m.score1 ?? 0, s2 = m.score2 ?? 0;
    a.scored += s1; a.diff += s1 - s2;
    b.scored += s2; b.diff += s2 - s1;
    if (!m.winnerId) { a.pts += 1; b.pts += 1; }
    else if (m.winnerId === m.player1Id) a.pts += 3;
    else b.pts += 3;
  }
  return table;
}

/**
 * Tabelle einer Liga (Liga-Modus, auch mit Hin-/Rückrunde) — exakt dieselben Regeln wie eine
 * Gruppentabelle: Sieg 3, Unentschieden 1 (gespielt ohne Sieger), dann Tordifferenz, Tore, direkter
 * Vergleich, Siege, Reihenfolge von memberIds. Einzige Tabellenlogik für Turnierseite, Overlay,
 * Ranking-Vorschau und Siegerermittlung, damit diese nie voneinander abweichen.
 */
export function computeLeagueStandings(memberIds: string[], matches: GroupMatchLike[]): GroupStanding[] {
  return computeGroupStandings([memberIds], matches.map(m => ({ ...m, groupIndex: 0 })))[0];
}

/**
 * Wer gehört in die Liga-Tabelle: alle Spieler, die in einem Match stehen (in Anmelde-Reihenfolge
 * von candidates, danach Unbekannte). Ohne Matches die Kandidaten selbst — so tauchen Zuschauer oder
 * nicht ausgeloste Anmeldungen nicht mit 0 Spielen in der Tabelle auf.
 */
export function leagueMemberIds(
  matches: { player1Id: string | null; player2Id: string | null }[],
  candidates: string[],
): string[] {
  const inMatches = new Set(matches.flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is string => !!id));
  if (inMatches.size === 0) return candidates;
  return [...candidates.filter(id => inMatches.has(id)), ...[...inMatches].filter(id => !candidates.includes(id))];
}

/** Gruppen-Mitglieder aus den Teilnehmern ableiten (Teilnehmer ohne Gruppe fallen heraus). */
export function groupMembers(participants: { userId: string; groupIndex?: number | null }[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (const p of participants) {
    if (p.groupIndex != null && p.groupIndex >= 0 && p.groupIndex < groupCount) groups[p.groupIndex].push(p.userId);
  }
  return groups;
}

/** Anzahl der Gruppen aus Konfiguration bzw. (Fallback) aus den vergebenen Gruppen-Indizes. */
export function resolveGroupCount(cfg: GroupStageConfig | null, participants: { groupIndex?: number | null }[]): number {
  if (cfg) return cfg.groupCount;
  const max = Math.max(-1, ...participants.map(p => p.groupIndex ?? -1));
  return max + 1;
}

// ── K.O.-Runde ────────────────────────────────────────────────────────────────

/** Klassische Setzreihenfolge für einen Baum mit size Plätzen: [1, 8, 4, 5, 2, 7, 3, 6] für 8. */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2 + 1;
    order = order.flatMap(s => [s, n - s]);
  }
  return order;
}

/** In welcher K.O.-Runde sich die Slots a und b frühestens begegnen (1 = erste Runde). */
function meetingRound(a: number, b: number): number {
  return Math.floor(Math.log2(a ^ b)) + 1;
}

/**
 * Setzliste für die K.O.-Runde: gibt die Slots des Baums zurück (Länge = Zweierpotenz,
 * null = Freilos). Ränge werden stufenweise gesetzt — erst alle Gruppensieger (bester zuerst),
 * dann alle Zweiten usw. Freilose gehen an die am höchsten Gesetzten. Innerhalb einer Stufe
 * wählt jeder Spieler den freien Setzplatz, auf dem er Spielern aus seiner eigenen Gruppe
 * möglichst spät begegnen würde.
 */
export function seedKnockout(standings: GroupStanding[][], advancePerGroup: number): (string | null)[] {
  const tiers: GroupStanding[][] = [];
  for (let rank = 0; rank < advancePerGroup; rank++) {
    const tier = standings
      .map(g => g[rank])
      .filter((s): s is GroupStanding => !!s)
      .sort((a, b) => compareStandings(a, b) || a.groupIndex - b.groupIndex);
    if (tier.length) tiers.push(tier);
  }
  const qualifierCount = tiers.reduce((n, t) => n + t.length, 0);
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(qualifierCount, 2))));
  const order = seedOrder(size);
  const slotOfSeed = new Map(order.map((seed, slot) => [seed, slot]));

  const slots: (string | null)[] = Array(size).fill(null);
  const placed: { slot: number; groupIndex: number }[] = [];
  let nextSeed = 1;

  for (const tier of tiers) {
    const free = tier.map((_, i) => nextSeed + i);
    for (const s of tier) {
      let best = free[0];
      let bestScore = -1;
      for (const seed of free) {
        const slot = slotOfSeed.get(seed)!;
        const sameGroup = placed.filter(p => p.groupIndex === s.groupIndex);
        const score = sameGroup.length ? Math.min(...sameGroup.map(p => meetingRound(slot, p.slot))) : Infinity;
        if (score > bestScore) { best = seed; bestScore = score; }
      }
      free.splice(free.indexOf(best), 1);
      const slot = slotOfSeed.get(best)!;
      slots[slot] = s.userId;
      placed.push({ slot, groupIndex: s.groupIndex });
    }
    nextSeed += tier.length;
  }
  return slots;
}

/** Komplette K.O.-Runde (alle Runden, Freilose bereits aufgerückt) als Match-Daten. */
export function generateKnockoutMatches(
  standings: GroupStanding[][], advancePerGroup: number, eventId: string, thirdPlaceMatch = false,
  options: { legs?: 1 | 2; singleLegFinal?: boolean } = {},
): GeneratedMatch[] {
  const matches = bracketFromSlots(seedKnockout(standings, advancePerGroup), eventId, null, thirdPlaceMatch);
  return options.legs === 2 ? expandToTwoLegs(matches, options.singleLegFinal !== false) : matches;
}

/**
 * Macht aus jeder K.O.-Paarung Hin- und Rückspiel (gleiche round/position, im Rückspiel Heimrecht
 * getauscht). Einzelspiele bleiben: Freilose, das Spiel um Platz 3 und — wenn gewünscht — das Finale.
 */
function expandToTwoLegs(matches: GeneratedMatch[], singleLegFinal: boolean): GeneratedMatch[] {
  const totalRounds = Math.max(0, ...matches.filter(m => !m.isThirdPlace).map(m => m.round));
  return matches.flatMap(m => {
    const isBye = !!m.winnerId && (!m.player1Id || !m.player2Id);
    const isFinal = !m.isThirdPlace && m.round === totalRounds;
    if (m.isThirdPlace || isBye || (isFinal && singleLegFinal)) return [m];
    return [
      { ...m, leg: 1 },
      { ...m, leg: 2, player1Id: m.player2Id, player2Id: m.player1Id },
    ];
  });
}

// ── Hin- und Rückspiel zusammenfassen ─────────────────────────────────────────

export type TieMatchLike = {
  id: string; round: number; position: number;
  groupIndex?: number | null; isThirdPlace?: boolean; leg?: number | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null;
  startedAt?: string | Date | null;
};

export type AggregatedTie<T extends TieMatchLike> = T & {
  /** Hin- und Rückspiel, falls die Paarung zweibeinig ist */
  legs?: { first: T; second: T | null };
};

/**
 * Fasst jede K.O.-Paarung mit Hin- und Rückspiel zu EINEM Eintrag zusammen (Spieler aus Sicht des
 * Hinspiels, Tore = Gesamtergebnis, Sieger = wer weiterkommt, playedAt erst nach dem Rückspiel).
 * Gruppenspiele und Einzelspiele werden unverändert durchgereicht — so funktionieren Turnierbaum,
 * Overlay und Ranking mit Hin-/Rückspiel ohne eigene Sonderlogik.
 */
export function aggregateKnockoutTies<T extends TieMatchLike>(matches: T[]): AggregatedTie<T>[] {
  const out: AggregatedTie<T>[] = [];
  const legsByTie = new Map<string, { first?: T; second?: T }>();
  for (const m of matches) {
    if (m.groupIndex != null || !m.leg) { out.push(m); continue; }
    const key = `${m.round}:${m.position}:${m.isThirdPlace ? 1 : 0}`;
    const tie = legsByTie.get(key) ?? {};
    if (m.leg === 2) tie.second = m; else tie.first = m;
    if (!legsByTie.has(key)) { legsByTie.set(key, tie); out.push(m); } // Platzhalter, wird unten ersetzt
  }
  return out.map(m => {
    if (m.groupIndex != null || !m.leg) return m;
    const tie = legsByTie.get(`${m.round}:${m.position}:${m.isThirdPlace ? 1 : 0}`)!;
    const first = tie.first ?? tie.second!;
    const second = tie.first ? tie.second ?? null : null;
    const goals = (uid: string | null) => {
      if (!uid || !first.playedAt) return null;
      let sum = uid === first.player1Id ? first.score1 ?? 0 : first.score2 ?? 0;
      if (second?.playedAt) sum += uid === second.player1Id ? second.score1 ?? 0 : second.score2 ?? 0;
      return sum;
    };
    const decided = !!second?.playedAt;
    return {
      ...first,
      score1: goals(first.player1Id),
      score2: goals(first.player2Id),
      winnerId: decided ? second!.winnerId : null,
      playedAt: decided ? second!.playedAt : null,
      // Live ist die Paarung, solange gerade das Hin- oder das Rückspiel läuft
      startedAt: second?.startedAt ?? (first.playedAt ? null : first.startedAt ?? null),
      legs: { first, second },
    };
  });
}

/**
 * Vorläufiges Gesamtranking (Ranking-Vorschau/Widget): nach erreichter Stufe der K.O.-Runde
 * (Sieger > Finalist > Platz 3 > Platz 4 > Halbfinale > … ), Ausgeschiedene der Gruppenphase danach;
 * Gleichstand innerhalb einer Stufe nach dem Abschneiden in der Gruppenphase.
 */
export function groupKnockoutRanking(
  participants: { userId: string; groupIndex?: number | null }[],
  matches: (GroupMatchLike & { groupIndex?: number | null; round: number; position?: number; leg?: number | null; id?: string })[],
  groupStageJson: string | null | undefined,
): { userId: string; score: number; label: string }[] {
  const groupCount = resolveGroupCount(parseGroupStageConfig(groupStageJson), participants);
  const standings = new Map(
    computeGroupStandings(groupMembers(participants, groupCount), matches).flat().map(s => [s.userId, s]),
  );
  // Hin-/Rückspiel als eine Paarung werten; eine Paarung zählt als "erreicht", sobald ihr erstes
  // Spiel gespielt ist, als gewonnen erst, wenn sie entschieden ist
  const knockout = aggregateKnockoutTies(matches.map((m, i) => ({ id: String(i), position: 0, ...m })))
    .filter(m => m.groupIndex == null && m.player1Id && m.player2Id && (m.playedAt || m.legs?.first.playedAt));
  const totalRounds = knockout.length ? Math.max(...knockout.map(m => m.round)) : 0;
  // Stufen-Wert: je Paarung (Runde·2 + gewonnen); Spiel um Platz 3 zählt zwischen Finale und Halbfinale
  const stage = new Map<string, { value: number; label: string }>();
  for (const m of knockout) {
    for (const uid of [m.player1Id!, m.player2Id!]) {
      const won = !!m.playedAt && m.winnerId === uid;
      const isFinal = !m.isThirdPlace && m.round === totalRounds;
      const value = m.isThirdPlace ? 2 * totalRounds - (won ? 0.5 : 1.5) : 2 * m.round + (won ? 1 : 0);
      const label = isFinal ? (won ? "Sieger" : "Finale")
        : m.isThirdPlace ? (won ? "Platz 3" : "Platz 4")
        : won ? knockoutRoundLabel(m.round + 1, totalRounds) : knockoutRoundLabel(m.round, totalRounds);
      if ((stage.get(uid)?.value ?? -1) < value) stage.set(uid, { value, label });
    }
  }
  const empty = (userId: string): GroupStanding => ({ userId, groupIndex: -1, played: 0, w: 0, d: 0, l: 0, scored: 0, conceded: 0, pts: 0 });
  return participants
    .map(p => ({ userId: p.userId, st: stage.get(p.userId), s: standings.get(p.userId) ?? empty(p.userId) }))
    .sort((a, b) => ((b.st?.value ?? 0) - (a.st?.value ?? 0)) || compareStandings(a.s, b.s))
    .map(r => ({
      userId: r.userId,
      score: r.st?.value ?? 0,
      label: r.st ? `${r.st.label} · ${r.s.pts} Pkt.` : `${r.s.pts} Pkt. (Gruppe)`,
    }));
}

/** Label einer K.O.-Runde (gezählt ab der ersten K.O.-Runde). */
export function knockoutRoundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Halbfinale";
  if (fromEnd === 2) return "Viertelfinale";
  if (fromEnd === 3) return "Achtelfinale";
  return `K.O.-Runde ${round}`;
}

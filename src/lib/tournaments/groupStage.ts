// Turnierformat "group_knockout" — Gruppenphase + K.O.-Runde wie bei einer Fußball-WM.
//
// Ablauf:
//  1. Gruppen auslosen: Teilnehmer werden zufällig auf groupCount Gruppen verteilt, jede Gruppe
//     spielt jeder-gegen-jeden (Match.groupIndex = Gruppe, Match.round = Spieltag).
//  2. Tabelle je Gruppe: Sieg 3, Unentschieden 1, Niederlage 0 · danach Tordifferenz, Tore, Siege.
//  3. K.O.-Runde: die besten advancePerGroup jeder Gruppe ziehen in einen K.O.-Baum ein
//     (Match.groupIndex = null). Gruppensieger werden vor Gruppenzweiten gesetzt, und Spieler aus
//     derselben Gruppe landen möglichst weit auseinander im Baum (bei 2 Gruppen à 2 Weiterkommenden:
//     A1–B2 und B1–A2, A1 und A2 können sich erst im Finale wiedersehen).
//
// Rein funktional (kein Prisma), damit Server (Generierung) und Client (Tabellen) dieselbe
// Berechnung verwenden.
import { bracketFromSlots, generateRoundRobin, shuffle, type GeneratedMatch } from "./generate";

export const GROUP_KNOCKOUT_FORMAT = "group_knockout";

export type GroupStageConfig = { groupCount: number; advancePerGroup: number };

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

/** Jeder-gegen-jeden innerhalb jeder Gruppe. Spieltag-Nummern laufen je Gruppe ab 1. */
export function generateGroupMatches(groups: string[][], eventId: string): GeneratedMatch[] {
  return groups.flatMap((ids, groupIndex) =>
    generateRoundRobin(ids, eventId).map(m => ({ ...m, groupIndex })),
  );
}

// ── Tabellen ──────────────────────────────────────────────────────────────────

export type GroupMatchLike = {
  groupIndex?: number | null;
  player1Id: string | null; player2Id: string | null;
  winnerId: string | null; score1: number | null; score2: number | null;
  playedAt: string | Date | null;
};

export type GroupStanding = {
  userId: string;
  groupIndex: number;
  played: number; w: number; d: number; l: number;
  scored: number; conceded: number; pts: number;
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
    return [...map.values()].sort((a, b) => compareStandings(a, b) || (order.get(a.userId)! - order.get(b.userId)!));
  });
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
export function generateKnockoutMatches(standings: GroupStanding[][], advancePerGroup: number, eventId: string): GeneratedMatch[] {
  return bracketFromSlots(seedKnockout(standings, advancePerGroup), eventId, null);
}

/**
 * Vorläufiges Gesamtranking (Ranking-Vorschau/Widget): zuerst nach Siegen in der K.O.-Runde,
 * bei Gleichstand nach dem Abschneiden in der Gruppenphase (Punkte, Tordifferenz, Tore).
 */
export function groupKnockoutRanking(
  participants: { userId: string; groupIndex?: number | null }[],
  matches: (GroupMatchLike & { groupIndex?: number | null })[],
  groupStageJson: string | null | undefined,
): { userId: string; score: number; label: string }[] {
  const groupCount = resolveGroupCount(parseGroupStageConfig(groupStageJson), participants);
  const standings = new Map(
    computeGroupStandings(groupMembers(participants, groupCount), matches).flat().map(s => [s.userId, s]),
  );
  const koWins = new Map<string, number>();
  for (const m of matches) {
    if (m.groupIndex == null && m.playedAt && m.winnerId) koWins.set(m.winnerId, (koWins.get(m.winnerId) ?? 0) + 1);
  }
  const empty = (userId: string): GroupStanding => ({ userId, groupIndex: -1, played: 0, w: 0, d: 0, l: 0, scored: 0, conceded: 0, pts: 0 });
  return participants
    .map(p => ({ userId: p.userId, wins: koWins.get(p.userId) ?? 0, s: standings.get(p.userId) ?? empty(p.userId) }))
    .sort((a, b) => (b.wins - a.wins) || compareStandings(a.s, b.s))
    .map(r => ({
      userId: r.userId,
      score: r.wins,
      label: r.wins > 0 ? `${r.wins} K.O.-Siege · ${r.s.pts} Pkt.` : `${r.s.pts} Pkt. (Gruppe)`,
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

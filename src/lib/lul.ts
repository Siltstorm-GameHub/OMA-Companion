// LUL = Level-Up-League

export const LUL_POINTS = {
  GAME:            5,   // Teilnahme Mitspieler
  SPECTATOR:       5,   // Teilnahme Zuschauer
  GAME_WINNER:    10,   // Spieltag-Sieg als Mitspieler
  COMMUNITY_CHAMP: 10, // Umfrage-Sieg (Legacy: communityChamp)
  TROSTPREIS:     10,   // Trostpreis-Umfrage (Legacy: trostpreis)
  VOTE:            2,   // Abstimmungsteilnahme
  DOMINION:       20,   // 3 Siege in Folge
} as const;

export type LulPollConfig = {
  statKey: string;
  label:   string;
  points:  number;
};

export type LulPointsConfig = {
  game?:             number;
  spectator?:        number;
  gameWinner?:       number;
  vote?:             number;
  dominion?:         number;
  // statKeys die als "Sieg" für den Dominion-Bonus zählen
  dominionTriggers?: string[];
  polls?:            LulPollConfig[];
};

export function calcLulPoints(
  entry: {
    role?:          string;
    gameWinner:     boolean;
    communityChamp: boolean;
    trostpreis:     boolean;
    voted:          boolean;
    dominionBonus:  boolean;
    // JSON string[] der gewonnenen Poll-statKeys (neue Saisons)
    pollWinsJson?:  string | null;
  },
  config?: LulPointsConfig | null,
): number {
  const isVoterOnly   = entry.role === "voter";
  const isSpectator   = entry.role === "spectator";

  const gameBase   = config?.game      ?? LUL_POINTS.GAME;
  const spectBase  = config?.spectator ?? LUL_POINTS.SPECTATOR;
  const winPts     = config?.gameWinner ?? LUL_POINTS.GAME_WINNER;
  const votePts    = config?.vote      ?? LUL_POINTS.VOTE;
  const domPts     = config?.dominion  ?? LUL_POINTS.DOMINION;

  let pts = 0;

  if (!isVoterOnly) {
    pts += isSpectator ? spectBase : gameBase;
  }

  if (!isVoterOnly && entry.gameWinner) pts += winPts;

  // Poll-Gewinne — zuerst neues flexibles System prüfen
  const polls = config?.polls;
  if (polls && polls.length > 0) {
    const wins: string[] = entry.pollWinsJson
      ? (JSON.parse(entry.pollWinsJson) as string[])
      : [];
    // Legacy-Flags als Fallback in wins-Array aufnehmen
    if (entry.communityChamp && !wins.includes("communityChamp")) wins.push("communityChamp");
    if (entry.trostpreis     && !wins.includes("trostpreis"))     wins.push("trostpreis");

    for (const poll of polls) {
      if (!isVoterOnly && wins.includes(poll.statKey)) {
        pts += poll.points;
      }
    }
  } else {
    // Legacy-Modus: hardcodierte Flags
    if (!isVoterOnly && entry.communityChamp) pts += LUL_POINTS.COMMUNITY_CHAMP;
    if (!isVoterOnly && entry.trostpreis)     pts += LUL_POINTS.TROSTPREIS;
  }

  if (entry.voted)                         pts += votePts;
  if (!isVoterOnly && entry.dominionBonus) pts += domPts;

  return pts;
}

export type LulStandingRow = {
  userId:      string;
  name:        string;
  image:       string | null;
  totalPts:    number;
  asPlayer:    number;  // Einsätze als Mitspieler
  asSpectator: number;  // Einsätze als Zuschauer
  wins:        number;  // gameWinner
  champs:      number;  // communityChamp (Legacy)
  trost:       number;  // trostpreis (Legacy)
  dominion:    number;  // dominionBonus (Anzahl Boni)
  votes:       number;  // voted
  // Flexible Poll-Wins: { statKey -> Anzahl }
  pollWins:    Record<string, number>;
};

export function buildLulStandings(
  entries: {
    userId:         string;
    role:           string;
    user:           { name: string | null; username: string | null; image: string | null };
    lulPoints:      number;
    gameWinner:     boolean;
    communityChamp: boolean;
    trostpreis:     boolean;
    voted:          boolean;
    dominionBonus:  boolean;
    pollWinsJson?:  string | null;
  }[],
  pollsConfig?: LulPollConfig[],
): LulStandingRow[] {
  const map = new Map<string, LulStandingRow>();

  for (const e of entries) {
    const display = e.user.username ?? e.user.name ?? "Unbekannt";

    // Flexible Poll-Wins aus JSON lesen
    const pollWins: Record<string, number> = {};
    if (e.pollWinsJson) {
      const wins = JSON.parse(e.pollWinsJson) as string[];
      for (const key of wins) {
        pollWins[key] = (pollWins[key] ?? 0) + 1;
      }
    }
    // Legacy-Flags in pollWins spiegeln
    if (e.communityChamp) pollWins["communityChamp"] = (pollWins["communityChamp"] ?? 0) + 1;
    if (e.trostpreis)     pollWins["trostpreis"]     = (pollWins["trostpreis"]     ?? 0) + 1;

    const existing = map.get(e.userId);
    if (!existing) {
      map.set(e.userId, {
        userId:      e.userId,
        name:        display,
        image:       e.user.image,
        totalPts:    e.lulPoints,
        asPlayer:    e.role === "player"    ? 1 : 0,
        asSpectator: e.role === "spectator" ? 1 : 0,
        wins:        e.gameWinner     ? 1 : 0,
        champs:      e.communityChamp ? 1 : 0,
        trost:       e.trostpreis     ? 1 : 0,
        dominion:    e.dominionBonus  ? 1 : 0,
        votes:       e.voted          ? 1 : 0,
        pollWins,
      });
    } else {
      existing.totalPts    += e.lulPoints;
      existing.asPlayer    += e.role === "player"    ? 1 : 0;
      existing.asSpectator += e.role === "spectator" ? 1 : 0;
      existing.wins        += e.gameWinner     ? 1 : 0;
      existing.champs      += e.communityChamp ? 1 : 0;
      existing.trost       += e.trostpreis     ? 1 : 0;
      existing.dominion    += e.dominionBonus  ? 1 : 0;
      existing.votes       += e.voted          ? 1 : 0;
      for (const [key, val] of Object.entries(pollWins)) {
        existing.pollWins[key] = (existing.pollWins[key] ?? 0) + val;
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => b.totalPts - a.totalPts || b.wins - a.wins || b.champs - a.champs
  );
}

// Merges regular season standings with legacy season totals into one all-time table.
export function mergeStandings(
  regular: LulStandingRow[],
  legacy:  LulStandingRow[],
): LulStandingRow[] {
  const map = new Map<string, LulStandingRow>();

  for (const r of regular) map.set(r.userId, { ...r, pollWins: { ...r.pollWins } });

  for (const l of legacy) {
    const existing = map.get(l.userId);
    if (!existing) {
      map.set(l.userId, { ...l, pollWins: { ...l.pollWins } });
    } else {
      existing.totalPts    += l.totalPts;
      existing.asPlayer    += l.asPlayer;
      existing.asSpectator += l.asSpectator;
      existing.wins        += l.wins;
      existing.champs      += l.champs;
      existing.trost       += l.trost;
      existing.dominion    += l.dominion;
      existing.votes       += l.votes;
      for (const [key, val] of Object.entries(l.pollWins)) {
        existing.pollWins[key] = (existing.pollWins[key] ?? 0) + val;
      }
    }
  }

  return [...map.values()].sort(
    (a, b) => b.totalPts - a.totalPts || b.wins - a.wins || b.champs - a.champs
  );
}

// Prüft ob der User einen Dominion-Bonus verdient hat.
// winHistory: Boolean-Array pro Spieltag (true = Sieg in diesem Spieltag).
// Sieg = gameWinner ODER ein Eintrag in dominionTriggers aus pollWinsJson.
// Die letzten 3 Einträge müssen alle true sein.
export function hasDominionBonus(winFlags: boolean[]): boolean {
  if (winFlags.length < 3) return false;
  return winFlags.slice(-3).every(Boolean);
}

// Berechnet ob ein Spieltag-Eintrag als "Sieg" für den Dominion-Bonus gilt.
export function isWinForDominion(
  entry: { gameWinner: boolean; communityChamp: boolean; trostpreis: boolean; pollWinsJson?: string | null },
  triggers?: string[],
): boolean {
  // Wenn keine triggers konfiguriert → nur gameWinner zählt (Legacy)
  const t = triggers ?? ["gameWinner", "communityChamp", "trostpreis"];

  if (t.includes("gameWinner") && entry.gameWinner) return true;

  const wins: string[] = entry.pollWinsJson
    ? (JSON.parse(entry.pollWinsJson) as string[])
    : [];
  if (entry.communityChamp && !wins.includes("communityChamp")) wins.push("communityChamp");
  if (entry.trostpreis     && !wins.includes("trostpreis"))     wins.push("trostpreis");

  return wins.some(w => t.includes(w));
}

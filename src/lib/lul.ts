// LUL = Level-Up-League

export const LUL_POINTS = {
  GAME:            5,   // Teilnahme (Spieler oder Zuschauer)
  GAME_WINNER:    10,   // Spieltag-Sieg als Mitspieler
  COMMUNITY_CHAMP: 10, // Umfrage-Sieg als Zuschauer
  TROSTPREIS:     10,   // Trostpreis-Umfrage (Mitspieler, ohne Sieger)
  VOTE:            2,   // Abstimmungsteilnahme
  DOMINION:       20,   // 3 Siege in Folge
} as const;

export function calcLulPoints(entry: {
  role?:          string;
  gameWinner:     boolean;
  communityChamp: boolean;
  trostpreis:     boolean;
  voted:          boolean;
  dominionBonus:  boolean;
}): number {
  // Reine Wähler (role="voter") bekommen keine Teilnahme-Punkte
  const isVoterOnly = entry.role === "voter";
  let pts = isVoterOnly ? 0 : LUL_POINTS.GAME;
  if (!isVoterOnly && entry.gameWinner)     pts += LUL_POINTS.GAME_WINNER;
  if (!isVoterOnly && entry.communityChamp) pts += LUL_POINTS.COMMUNITY_CHAMP;
  if (!isVoterOnly && entry.trostpreis)     pts += LUL_POINTS.TROSTPREIS;
  if (entry.voted)                          pts += LUL_POINTS.VOTE;
  if (!isVoterOnly && entry.dominionBonus)  pts += LUL_POINTS.DOMINION;
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
  champs:      number;  // communityChamp
  trost:       number;  // trostpreis
  dominion:    number;  // dominionBonus (Anzahl Boni erhalten)
  votes:       number;  // voted
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
  }[]
): LulStandingRow[] {
  const map = new Map<string, LulStandingRow>();

  for (const e of entries) {
    const display = e.user.username ?? e.user.name ?? "Unbekannt";
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

  for (const r of regular) map.set(r.userId, { ...r });

  for (const l of legacy) {
    const existing = map.get(l.userId);
    if (!existing) {
      map.set(l.userId, { ...l });
    } else {
      existing.totalPts    += l.totalPts;
      existing.asPlayer    += l.asPlayer;
      existing.asSpectator += l.asSpectator;
      existing.wins        += l.wins;
      existing.champs      += l.champs;
      existing.trost       += l.trost;
      existing.dominion    += l.dominion;
      existing.votes       += l.votes;
    }
  }

  return [...map.values()].sort(
    (a, b) => b.totalPts - a.totalPts || b.wins - a.wins || b.champs - a.champs
  );
}

export function hasDominionBonus(winFlags: boolean[]): boolean {
  if (winFlags.length < 3) return false;
  return winFlags.slice(-3).every(Boolean);
}

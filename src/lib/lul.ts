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
  gameWinner:     boolean;
  communityChamp: boolean;
  trostpreis:     boolean;
  voted:          boolean;
  dominionBonus:  boolean;
}): number {
  let pts = LUL_POINTS.GAME;
  if (entry.gameWinner)     pts += LUL_POINTS.GAME_WINNER;
  if (entry.communityChamp) pts += LUL_POINTS.COMMUNITY_CHAMP;
  if (entry.trostpreis)     pts += LUL_POINTS.TROSTPREIS;
  if (entry.voted)          pts += LUL_POINTS.VOTE;
  if (entry.dominionBonus)  pts += LUL_POINTS.DOMINION;
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

export function hasDominionBonus(winFlags: boolean[]): boolean {
  if (winFlags.length < 3) return false;
  return winFlags.slice(-3).every(Boolean);
}

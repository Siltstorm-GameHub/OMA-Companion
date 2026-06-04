// LUL = Level-Up-League

export const LUL_POINTS = {
  GAME:           5,   // Teilnahme (Spieler oder Zuschauer)
  GAME_WINNER:   10,   // Spieltag-Sieg als Mitspieler
  COMMUNITY_CHAMP: 10, // Umfrage-Sieg als Zuschauer
  TROSTPREIS:    10,   // Trostpreis-Umfrage (Mitspieler, ohne Sieger)
  VOTE:           2,   // Abstimmungsteilnahme
  DOMINION:      20,   // 3 Siege in Folge
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
  userId:    string;
  name:      string;
  image:     string | null;
  totalPts:  number;
  games:     number;
  wins:      number;
  champs:    number;
  trost:     number;
  votes:     number;
  dominion:  number;
};

export function buildLulStandings(
  entries: {
    userId:         string;
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
    const existing = map.get(e.userId);
    const display  = e.user.username ?? e.user.name ?? "Unbekannt";
    if (!existing) {
      map.set(e.userId, {
        userId:   e.userId,
        name:     display,
        image:    e.user.image,
        totalPts: e.lulPoints,
        games:    1,
        wins:     e.gameWinner     ? 1 : 0,
        champs:   e.communityChamp ? 1 : 0,
        trost:    e.trostpreis     ? 1 : 0,
        votes:    e.voted          ? 1 : 0,
        dominion: e.dominionBonus  ? 1 : 0,
      });
    } else {
      existing.totalPts += e.lulPoints;
      existing.games    += 1;
      existing.wins     += e.gameWinner     ? 1 : 0;
      existing.champs   += e.communityChamp ? 1 : 0;
      existing.trost    += e.trostpreis     ? 1 : 0;
      existing.votes    += e.voted          ? 1 : 0;
      existing.dominion += e.dominionBonus  ? 1 : 0;
    }
  }
  return [...map.values()].sort((a, b) => b.totalPts - a.totalPts || b.wins - a.wins);
}

// Returns true if this spieltag (by index in ordered list) completes a 3-win streak.
// winFlags: boolean array of "did user win" for spieltage 0..current
export function hasDominionBonus(winFlags: boolean[]): boolean {
  if (winFlags.length < 3) return false;
  const last3 = winFlags.slice(-3);
  return last3.every(Boolean);
}

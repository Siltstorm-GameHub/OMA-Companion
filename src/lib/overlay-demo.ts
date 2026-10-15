import type { EventOverlayState, OverlayMatch, OverlayParticipant, OverlayStreamer } from "@/components/overlay/types";

/**
 * Beispieldaten für die Layout-Vorschau: So sieht das Turnier-Overlay aus, auch wenn gerade kein
 * Event läuft. Rein erfunden (Spieler "Spieler 1" …), wird nie gespeichert.
 *   - "liga": Liga mit Tabelle, laufendem Match und Gesamttabelle einer Reihe,
 *   - "ko":   K.-o.-Turnier mit Turnierbaum.
 */
export type DemoFormat = "liga" | "ko";

const NAMES = ["NovaStrike", "PixelPaul", "Lunatic", "Krümelmonster", "Shadowfox", "TurboTina", "Glitchy", "Mondkalb"];

export function buildDemoEventState(streamer: OverlayStreamer, format: DemoFormat): EventOverlayState {
  const participants: OverlayParticipant[] = NAMES.map((name, i) => ({
    userId: `demo-${i}`,
    user: { id: `demo-${i}`, name, username: name, image: null, rankPoints: 900 - i * 70 },
  }));
  const id = (i: number) => `demo-${i}`;
  const played = new Date(Date.now() - 20 * 60_000).toISOString();
  const match = (n: number, round: number, position: number, p1: number, p2: number, s1: number | null, s2: number | null): OverlayMatch => ({
    id: `demo-m${n}`, round, position, title: null,
    player1Id: id(p1), player2Id: id(p2),
    winnerId: s1 == null || s2 == null ? null : s1 > s2 ? id(p1) : id(p2),
    score1: s1, score2: s2, playedAt: s1 == null ? null : played, entries: [],
  });

  const matches: OverlayMatch[] = format === "ko"
    ? [
      match(1, 1, 1, 0, 7, 3, 1), match(2, 1, 2, 3, 4, 2, 3), match(3, 1, 3, 2, 5, 3, 0), match(4, 1, 4, 1, 6, 1, 3),
      match(5, 2, 1, 0, 4, 3, 2), match(6, 2, 2, 2, 6, null, null),
      { ...match(7, 3, 1, 0, 0, null, null), player2Id: null },
    ]
    : [
      match(1, 1, 1, 0, 1, 3, 1), match(2, 1, 2, 2, 3, 2, 2), match(3, 1, 3, 4, 5, 0, 3), match(4, 1, 4, 6, 7, 3, 1),
      match(5, 2, 1, 0, 2, 2, 1), match(6, 2, 2, 1, 3, 3, 0), match(7, 2, 3, 4, 6, null, null), match(8, 2, 4, 5, 7, null, null),
    ];

  return {
    id: "demo",
    title: format === "ko" ? "Beispiel-Cup (K.-o.)" : "Beispiel-Liga #3",
    status: "active",
    format: format === "ko" ? "single_elimination" : "round_robin",
    tournamentStatus: "active",
    game: "Rocket League",
    statFields: null,
    matches,
    participants,
    streamer,
    ligaPunkteByUser: {},
    seriesTable: format === "ko" ? null : {
      seriesName: "Beispiel-Reihe",
      ranking: participants.slice(0, 6).map((p, i) => ({
        placement: i + 1, userId: p.userId, displayName: p.user.username ?? "", image: null, rankPoints: p.user.rankPoints,
        totalPoints: 42 - i * 6, participations: 3, spectatorParticipations: 0, stats: {},
      })),
    },
    control: { hidden: [], zoom: null },
  };
}

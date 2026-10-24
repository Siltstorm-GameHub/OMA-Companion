"use client";

/**
 * Listen-Panels des Event-Overlays: Turnierbaum, Tabelle, Gesamttabelle der Eventreihe, Teilnehmer.
 */
import RankedAvatar from "@/components/RankedAvatar";
import { AutoScrollViewport } from "./AutoScrollViewport";
import { GROUP_KNOCKOUT_FORMAT, aggregateKnockoutTies, computeGroupStandings, computeLeagueStandings, groupLabel, knockoutRoundLabel, leagueMemberIds } from "@/lib/tournaments/groupStage";
import { PanelShell } from "./tiles";
import {
  displayName, PANEL_LIST_HEIGHT, PANEL_LIST_HEIGHT_COMPACT,
  type OverlayMatch, type OverlayUser, type OverlayParticipant, type SeriesTable,
} from "./types";

/* ── Bracket-Panel: Runden nebeneinander, kompakt für Elimination-Formate ── */
export function BracketPanel({ matches: allMatches, userOf }: { matches: OverlayMatch[]; userOf: (id: string | null) => OverlayUser | undefined }) {
  // Nur K.O.-Matches (bei "Gruppenphase + K.O." stehen die Gruppenspiele in der Tabelle);
  // das Spiel um Platz 3 bekommt einen eigenen Abschnitt nach dem Finale.
  // Hin- und Rückspiel als eine Paarung mit Gesamtergebnis (siehe aggregateKnockoutTies)
  const ties = aggregateKnockoutTies(allMatches.filter(m => m.groupIndex == null));
  const matches = ties.filter(m => !m.isThirdPlace);
  const thirdPlace = ties.filter(m => m.isThirdPlace);
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length ? rounds[rounds.length - 1] : 0;
  const sections = [
    ...rounds.map(round => ({ key: `r${round}`, label: knockoutRoundLabel(round, totalRounds), items: matches.filter(m => m.round === round) })),
    ...(thirdPlace.length ? [{ key: "third", label: "Spiel um Platz 3", items: thirdPlace }] : []),
  ];
  return (
    <PanelShell title="Turnierbaum">
      <AutoScrollViewport axis="y" size={PANEL_LIST_HEIGHT} gap={8}>
        {sections.map(section => (
          <div key={section.key} style={{ width: "100%" }}>
            <p style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
              {section.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {section.items.map(m => (
                <BracketRow key={m.id} match={m} userOf={userOf} />
              ))}
            </div>
          </div>
        ))}
      </AutoScrollViewport>
    </PanelShell>
  );
}

function BracketRow({ match, userOf }: { match: OverlayMatch; userOf: (id: string | null) => OverlayUser | undefined }) {
  const p1Winner = !!match.winnerId && match.winnerId === match.player1Id;
  const p2Winner = !!match.winnerId && match.winnerId === match.player2Id;
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
      <Row user={userOf(match.player1Id)} score={match.score1} winner={p1Winner} />
      <Row user={userOf(match.player2Id)} score={match.score2} winner={p2Winner} />
    </div>
  );
}

function Row({ user, score, winner }: { user: OverlayUser | undefined; score: number | null; winner: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: winner ? 700 : 400, color: winner ? "#5eead4" : "rgba(255,255,255,0.85)" }}>
      <RankedAvatar badge={null} userId={user?.id} src={user?.image} alt={displayName(user)} size={26} />
      <span style={{ flex: 1 }}>{displayName(user)}</span>
      {score != null && <span>{score}</span>}
    </div>
  );
}

type RankedRow = {
  userId: string; user: OverlayUser; primary: string; secondary: string;
  /** Vollständige Stat-Aufschlüsselung (ffa/coop_stats) — eine Zeile je konfiguriertem Feld,
   *  statt alles in `secondary` zusammenzuquetschen und dabei Felder faktisch unsichtbar
   *  werden zu lassen. */
  statLines?: string[];
  /** Ligapunkte, die dieses Event dem User zur Eventreihe beigesteuert hat — unabhängig vom
   *  Turnierformat, sichtbar sobald das Event zu einer Reihe gehört. */
  ligaPunkte?: number;
};

/** Tabellen-Panel — die Berechnung unterscheidet sich bewusst je Turnierformat, weil die
 *  zugrunde liegenden Datenfelder unterschiedlich sind: Liga/Round-Robin tragen Sieger in
 *  `Match.winnerId`, FFA/Coop/Avg-Stats dagegen in `MatchEntry.placement`/`statsJson` — ein
 *  reiner winnerId-Sieg-Zähler zeigt bei FFA-Formaten für jeden Teilnehmer 0 an. Spiegelt
 *  die Logik aus LigaView/FfaView, nur kompakter fürs Overlay. */
export function TablePanel({
  matches, participants, format, statFields, ligaPunkteByUser, compact = true,
}: {
  matches: OverlayMatch[]; participants: OverlayParticipant[]; format: string | null; statFields: string | null;
  ligaPunkteByUser: Record<string, number>;
  /** false in der Vollbild-Zoom-Ansicht: zeigt bei avg_stats zusaetzlich jedes einzelne Stat-
   *  Feld statt nur des kombinierten Durchschnitts, und nutzt die groessere Listenhoehe. */
  compact?: boolean;
}) {
  if (format === GROUP_KNOCKOUT_FORMAT) return <GroupTablesPanel matches={matches} participants={participants} compact={compact} />;
  const isFfaFamily = format === "ffa" || format === "coop_stats" || format === "avg_stats";
  const title = format === "liga" ? "Liga-Tabelle" : isFfaFamily ? "Gesamtranking" : "Tabelle";
  const ranked = isFfaFamily
    ? buildFfaRanking(matches, participants, format, statFields, ligaPunkteByUser, compact)
    : buildMatchRanking(matches, participants, format, ligaPunkteByUser);

  return (
    <PanelShell title={title}>
      <AutoScrollViewport axis="y" size={compact ? PANEL_LIST_HEIGHT_COMPACT : PANEL_LIST_HEIGHT} gap={2}>
        {ranked.map((p, i) => (
          <div
            key={p.userId}
            style={{
              display: "flex", alignItems: "center", gap: 13, width: "100%",
              padding: "5px 8px", borderRadius: 7,
              background: i < 3 ? "rgba(20,184,166,0.06)" : "transparent",
            }}
          >
            <span style={{ width: 22, fontSize: 15, opacity: 0.4, textAlign: "right" }}>{i + 1}</span>
            <RankedAvatar badge={null} userId={p.user.id} src={p.user.image} alt={displayName(p.user)} size={30} />
            <span style={{ flex: 1, fontSize: 18, fontWeight: i < 3 ? 700 : 400, color: i < 3 ? "#5eead4" : "#fff" }}>
              {displayName(p.user)}
            </span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 84, flexShrink: 0 }}>
              {p.primary && (
                <span style={{ fontSize: 16, fontWeight: 700, color: i < 3 ? "#5eead4" : "#fff", whiteSpace: "nowrap" }}>{p.primary}</span>
              )}
              {p.secondary && <span style={{ fontSize: 13, opacity: 0.5, whiteSpace: "nowrap" }}>{p.secondary}</span>}
              {p.statLines?.map((line, idx) => (
                <span key={idx} style={{ fontSize: 14, fontWeight: i < 3 ? 700 : 500, color: i < 3 ? "#5eead4" : "#fff", whiteSpace: "nowrap" }}>
                  {line}
                </span>
              ))}
              {p.ligaPunkte != null && (
                <span style={{ fontSize: 13, color: "#5eead4", opacity: 0.85, whiteSpace: "nowrap" }}>
                  +{p.ligaPunkte} Ligapunkte
                </span>
              )}
            </div>
          </div>
        ))}
      </AutoScrollViewport>
    </PanelShell>
  );
}

/** "Gruppenphase + K.O.": eine kompakte Tabelle je Gruppe (gleiche Berechnung wie Turnierseite/Admin,
 *  siehe lib/tournaments/groupStage.ts). Die Gruppen-Mitglieder ergeben sich aus den Gruppenspielen —
 *  dafür braucht das Overlay keine eigenen Teilnehmer-Gruppendaten. */
function GroupTablesPanel({ matches, participants, compact }: { matches: OverlayMatch[]; participants: OverlayParticipant[]; compact: boolean }) {
  const groupMatches = matches.filter(m => m.groupIndex != null);
  const groupCount = groupMatches.reduce((n, m) => Math.max(n, (m.groupIndex ?? 0) + 1), 0);
  const members: string[][] = Array.from({ length: groupCount }, () => []);
  for (const m of groupMatches) {
    for (const uid of [m.player1Id, m.player2Id]) {
      if (uid && !members[m.groupIndex!].includes(uid)) members[m.groupIndex!].push(uid);
    }
  }
  const standings = computeGroupStandings(members, groupMatches);
  const userById = new Map(participants.map(p => [p.userId, p.user]));
  return (
    <PanelShell title="Gruppen">
      <AutoScrollViewport axis="y" size={compact ? PANEL_LIST_HEIGHT_COMPACT : PANEL_LIST_HEIGHT} gap={8}>
        {standings.map((table, gi) => (
          <div key={gi} style={{ width: "100%" }}>
            <p style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>
              {groupLabel(gi)}
            </p>
            {table.map((s, i) => {
              const user = userById.get(s.userId);
              return (
                <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "3px 8px", borderRadius: 7, background: i === 0 ? "rgba(20,184,166,0.06)" : "transparent" }}>
                  <span style={{ width: 18, fontSize: 14, opacity: 0.4, textAlign: "right" }}>{i + 1}</span>
                  <RankedAvatar badge={null} userId={user?.id} src={user?.image} alt={displayName(user)} size={24} />
                  <span style={{ flex: 1, fontSize: 16 }}>{displayName(user)}</span>
                  <span style={{ fontSize: 13, opacity: 0.5, whiteSpace: "nowrap" }}>{s.scored}:{s.conceded}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, minWidth: 52, textAlign: "right", whiteSpace: "nowrap" }}>{s.pts} Pkt.</span>
                </div>
              );
            })}
          </div>
        ))}
      </AutoScrollViewport>
    </PanelShell>
  );
}

/** Roh-Feldnamen aus der Punkte-Konfiguration ("MVP_Abstimmungen") sind fuer den internen
 *  Gebrauch benannt, nicht fuers Overlay — hier nur kosmetisch in Leerzeichen aufgeloest. */
function formatStatLabel(key: string): string {
  return key.replace(/_/g, " ");
}

/** Gesamttabelle der Eventreihe — separat von TablePanel (das zeigt nur dieses eine Event).
 *  Nutzt die vom Server per loadSeriesRanking() (src/lib/seriesRanking.ts) fertig berechneten
 *  Zeilen, keine eigene Punktelogik hier. */
export function SeriesTablePanel({
  seriesTable, compact = true,
}: {
  seriesTable: SeriesTable;
  /** false in der Vollbild-Zoom-Ansicht: listet zusaetzlich zu den Gesamtpunkten auch jede
   *  einzelne getrackte Stat auf, statt nur die entscheidende Punktzahl zu zeigen. */
  compact?: boolean;
}) {
  return (
    <PanelShell title={`Gesamttabelle · ${seriesTable.seriesName}`}>
      <AutoScrollViewport axis="y" size={compact ? PANEL_LIST_HEIGHT_COMPACT : PANEL_LIST_HEIGHT} gap={compact ? 2 : 8}>
        {seriesTable.ranking.map((r, i) => {
          const statEntries = Object.entries(r.stats);
          return (
            <div
              key={r.userId}
              style={{
                display: "flex", flexDirection: "column", gap: 6, width: "100%",
                padding: compact ? "5px 8px" : "9px 12px",
                borderRadius: 8,
                background: i < 3 ? "rgba(20,184,166,0.08)" : "rgba(255,255,255,0.03)",
                border: i < 3 ? "1px solid rgba(20,184,166,0.22)" : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13, width: "100%" }}>
                <span style={{ width: 22, fontSize: 15, opacity: 0.45, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                <RankedAvatar badge={null} userId={r.userId} src={r.image} alt={r.displayName} size={30} />
                <span style={{ flex: 1, fontSize: 18, fontWeight: i < 3 ? 700 : 400, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.displayName}
                </span>
                <span style={{ fontSize: 17, fontWeight: 800, color: i < 3 ? "#5eead4" : "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {Math.round(r.totalPoints)} Pkt.
                </span>
              </div>
              {!compact && statEntries.length > 0 && (
                <div
                  style={{
                    display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 16, rowGap: 3,
                    paddingLeft: 45, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6,
                  }}
                >
                  {statEntries.map(([key, val]) => (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatStatLabel(key)}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {Math.round(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </AutoScrollViewport>
    </PanelShell>
  );
}

/** Liga-Tabelle (mit und ohne Hin-/Rückrunde) — gemeinsame Berechnung mit Turnierseite und Ranking,
 *  siehe computeLeagueStandings. Unentschieden zählen immer (gespielt ohne Sieger). */
function buildMatchRanking(
  matches: OverlayMatch[], participants: OverlayParticipant[], _format: string | null, ligaPunkteByUser: Record<string, number>,
): RankedRow[] {
  const userById = new Map(participants.map(p => [p.userId, p.user]));
  const ids = leagueMemberIds(matches, participants.map(p => p.userId));
  return computeLeagueStandings(ids, matches)
    .filter(s => userById.has(s.userId))
    .map(s => {
      const ligaPunkte = ligaPunkteByUser[s.userId];
      return {
        userId: s.userId, user: userById.get(s.userId)!,
        secondary: `${s.w}S · ${s.d}U · ${s.l}N`, primary: `${s.pts} Pkt.`,
        ligaPunkte: ligaPunkte ? Math.round(ligaPunkte) : undefined,
      };
    });
}

/** FFA / Coop-Stats / Avg-Stats — Sieger stecken in MatchEntry, nicht in Match.winnerId.
 *  coop_stats zählt "Match Win"-Flags, avg_stats den Durchschnitt über alle Stat-Felder,
 *  ffa die Summe des ersten (primären) Stat-Felds — identische Sortierlogik wie FfaView. */
function buildFfaRanking(
  matches: OverlayMatch[], participants: OverlayParticipant[], format: string, statFieldsJson: string | null,
  ligaPunkteByUser: Record<string, number>, compact: boolean = true,
): RankedRow[] {
  let statFields: string[] = [];
  try { statFields = statFieldsJson ? JSON.parse(statFieldsJson) : []; } catch { /* ignore */ }
  const isAvg  = format === "avg_stats";
  const isCoop = format === "coop_stats";

  const totals = new Map<string, { stats: Record<string, number>; matchCount: number }>(
    participants.map(p => [p.userId, { stats: {}, matchCount: 0 }])
  );
  for (const m of matches) {
    if (!m.playedAt) continue;
    for (const e of m.entries) {
      if (!e.userId) continue;
      let t = totals.get(e.userId);
      if (!t) { t = { stats: {}, matchCount: 0 }; totals.set(e.userId, t); }
      t.matchCount += 1;
      if (e.statsJson) {
        try {
          const s = JSON.parse(e.statsJson) as Record<string, number>;
          for (const [k, v] of Object.entries(s)) t.stats[k] = (t.stats[k] ?? 0) + v;
        } catch { /* ignore */ }
      }
    }
  }

  // coop_stats hat keinen sinnvollen "Sieger" (das Match-Win-Flag gilt für alle Spieler der
  // Runde gemeinsam, siehe FfaView) — hier zählen wie bei reinem FFA die tatsächlich
  // eingetragenen Stat-Felder, nicht ein Sieg-Zähler. Das Ranking selbst behandelt coop_stats
  // deshalb identisch zu ffa; nur avg_stats (Durchschnitt statt Summe) bleibt ein Sonderfall.
  const nonCoopStatFields = statFields.filter(f => f !== "Match Win");

  return participants
    .map(p => {
      const t = totals.get(p.userId) ?? { stats: {}, matchCount: 0 };
      let primary: string;
      const statLines: string[] = [];
      // coop_stats trägt sein Sieg/Niederlage-Flag als "Match Win" in statsJson, getrennt von den
      // eigentlich konfigurierten Stat-Feldern (siehe FfaView: eigene Spalte, nicht Teil von
      // statFields) — ohne diese Zeile fehlte genau der Wert, den der Admin pro Runde einträgt.
      if (isCoop) statLines.push(`${t.stats["Match Win"] ?? 0} Siege`);

      if (isAvg) {
        const avg = nonCoopStatFields.length > 0 && t.matchCount > 0
          ? nonCoopStatFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((a, b) => a + b, 0) / nonCoopStatFields.length
          : 0;
        primary = t.matchCount > 0 ? `Ø ${avg.toFixed(1)}` : "–";
        // Vollbild-Ansicht: zusaetzlich zum kombinierten Durchschnitt (primary) auch den
        // Durchschnitt je einzelnem Stat-Feld auflisten, statt nur die eine Zahl zu zeigen.
        if (!compact && nonCoopStatFields.length > 1 && t.matchCount > 0) {
          statLines.push(...nonCoopStatFields.map(f => `Ø ${((t.stats[f] ?? 0) / t.matchCount).toFixed(1)} ${f}`));
        }
      } else if (nonCoopStatFields.length > 0) {
        // Jedes konfigurierte Feld bekommt seine eigene Zeile, statt alles in einen einzigen
        // String zu quetschen — sonst wirkten weitere Felder im schmalen Panel abgeschnitten
        // oder verschwanden optisch ganz.
        primary = "";
        statLines.push(...nonCoopStatFields.map(f => `${t.stats[f] ?? 0} ${f}`));
      } else {
        primary = isCoop ? "" : `${t.matchCount} Runden`;
      }
      const ligaPunkte = ligaPunkteByUser[p.userId];
      return {
        userId: p.userId, user: p.user, t, primary, secondary: "",
        statLines: statLines.length > 0 ? statLines : undefined,
        ligaPunkte: ligaPunkte ? Math.round(ligaPunkte) : undefined,
      };
    })
    .sort((a, b) => {
      if (a.t.matchCount === 0 && b.t.matchCount === 0) return 0;
      if (a.t.matchCount === 0) return 1;
      if (b.t.matchCount === 0) return -1;
      if (isAvg) {
        const avgOf = (t: typeof a.t) => nonCoopStatFields.length > 0
          ? nonCoopStatFields.map(f => (t.stats[f] ?? 0) / t.matchCount).reduce((s, v) => s + v, 0) / nonCoopStatFields.length
          : 0;
        return avgOf(b.t) - avgOf(a.t);
      }
      for (const f of nonCoopStatFields) {
        const diff = (b.t.stats[f] ?? 0) - (a.t.stats[f] ?? 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
}

/* ── Teilnehmer-Panel ── */
export function ParticipantsPanel({ participants }: { participants: OverlayParticipant[] }) {
  return (
    <PanelShell title="Teilnehmer">
      <AutoScrollViewport axis="y" size={PANEL_LIST_HEIGHT_COMPACT}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 14px", width: "100%" }}>
          {participants.map(p => (
            <div key={p.userId} style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <RankedAvatar badge={null} userId={p.user.id} src={p.user.image} alt={displayName(p.user)} size={28} />
              <span style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName(p.user)}
              </span>
            </div>
          ))}
        </div>
      </AutoScrollViewport>
    </PanelShell>
  );
}

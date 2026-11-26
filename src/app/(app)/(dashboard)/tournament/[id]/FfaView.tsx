"use client";
import { formatDecimal, formatFixed } from "@/lib/format-number";
import PlaceMedal from "@/components/PlaceMedal";
import React, { Fragment, useState } from "react";
import { POINTS_GLOSSARY, useScoringInfo } from "./ScoringInfo";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "@/components/icons";
import { Trophy, Clock, Vote, Eye, CheckCircle2, StickyNote, Flame, Camera } from "@/components/icons";
import RankPointsIcon from "@/components/RankPointsIcon";
import RankedAvatar from "@/components/RankedAvatar";
import { PLACEMENT_STAT_KEY } from "@/lib/series-event-points";
import { formatBerlinDate, formatBerlinTime, getBerlinDateParts } from "@/lib/time";
import { compareAvg, computeAvgTotals, entryAvg, parseEntryStats, readStatValue, roundWinnerIds, type AvgTotals } from "@/lib/avg-stats";
import { sortStatRounds, statRoundLabel, statRoundNote } from "@/lib/tournaments/stat-rounds";

/** Rundet auf bis zu 2 Nachkommastellen, ohne überflüssige Nullen, mit Komma (1 statt 1,00, 1,5 statt 1,50). */
function fmtUpTo2(n: number): string {
  return formatDecimal(n, 2);
}

type User        = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
type Participant = { userId: string; user: User; role?: string };
type Entry       = {
  id: string; userId: string | null; teamId: string | null;
  placement: number | null; score: number | null; statsJson: string | null;
};
type Match = {
  id: string; round: number; position: number;
  title: string | null; scheduledAt: string | Date | null; notes: string | null;
  playedAt: string | Date | null; entries: Entry[];
  /** false = von Spielern gemeldet, noch nicht bestätigt (vorläufig) */
  resultConfirmed?: boolean;
};

const uname  = (u: User | undefined | null) => u?.username ?? u?.name ?? "?";
const MEDAL  = [<PlaceMedal key="1" place={1} />, <PlaceMedal key="2" place={2} />, <PlaceMedal key="3" place={3} />];

export default function FfaView({
  matches,
  participants,
  statFields,
  statPointsPer = {},
  ligaPunkteByUser = {},
  ligaPunkteBreakdownByUser = {},
  turnierpunkteByUser = {},
  rankStatField,
  placementPoints,
  isLigaPunkteLive = false,
  projectedWinnerIds = [],
  projectedWinnerBonusByUser = {},
  dominionResultByUser = {},
  dominionThreshold,
  userId,
  format = "ffa",
  trackMatchWin = false,
  finalRankingGroups = null,
  pollWinnerIds = [],
  pollLabel = null,
  pollWinsByUser = {},
  votedUserIds = [],
  externalVoters = [],
  finalRankingNote = null,
  excludedUserIds = [],
  avgWinnerDirection = "high",
  proofsByEntry = {},
}: {
  /** Bestätigte Nachweis-Screenshots je Runde und Spieler (Schlüssel "matchId:userId") — nur für
   *  angemeldete Teilnehmer bzw. Verwalter gefüllt, siehe tournament/[id]/page.tsx */
  proofsByEntry?: Record<string, string[]>;
  matches: Match[];
  participants: Participant[];
  statFields: string[];
  /** Tabellenpunkte pro Einheit je Stat-Feld (aus der Reihen-Tabellenkonfiguration) — nur für die Punkte-Anzeige je Stat-Spalte */
  statPointsPer?: Record<string, number>;
  /** Tabellenpunkte, die dieses Event je Spieler insgesamt beigesteuert hat (identisch zur Berechnung in der Reihentabelle) */
  ligaPunkteByUser?: Record<string, number>;
  /** Aufschlüsselung der endgültigen Tabellenpunkte je User (Teilnahme, Sieger-Stat, …), siehe
   *  computeEventPoints — zum Aufklappen in der Tabellenpunkte-Spalte. */
  ligaPunkteBreakdownByUser?: Record<string, { label: string; points: number }[]>;
  /** Eventpunkte dieses Events je Spieler (Stats × Punkte-pro-Stat + Platzierungspunkte, siehe
   *  computeTurnierpunkte) — KEINE Tabellenpunkte, bestimmen nur die Endplatzierung/den Sieger dieses
   *  einzelnen Events. Anders als ligaPunkteByUser bereits sichtbar, solange das Event noch läuft. */
  turnierpunkteByUser?: Record<string, number>;
  /** Ohne Eventpunkte (alle Stats 0 Punkte): Stat, der die Platzierung entscheidet (Sieger-Stat) —
   *  wird vor den übrigen Stat-Feldern sortiert, die nur noch Tiebreaker sind. */
  rankStatField?: string;
  /** Punkte je Platz (Event-eigene statConfigJson, siehe EventEditClient "Turnier"-Reiter) — wenn
   *  gesetzt, zeigt die Tabelle zusätzlich die Ø-Platzierung über alle Runden sowie die daraus
   *  resultierenden Eventpunkte je Spieler. */
  placementPoints?: Record<string, number>;
  /** true, solange die Spielphase noch nicht abgeschlossen ist — dann sind ligaPunkteByUser nur eine
   *  Live-Vorschau (Teilnahme + bisherige Stats + projizierter Sieger-Bonus), keine endgültige
   *  Vergabe. Steuert die pulsierende „Live"-Markierung an der Tabellenpunkte-Spalte. */
  isLigaPunkteLive?: boolean;
  /** User-IDs, die aktuell (nach Eventpunkten) in Führung liegen — nur relevant/gefüllt wenn
   *  isLigaPunkteLive true ist. */
  projectedWinnerIds?: string[];
  /** Sieger-Bonus, den projectedWinnerIds zusätzlich zu ligaPunkteByUser bekämen, WENN das Event
   *  jetzt mit dieser Platzierung enden würde — bewusst NICHT in ligaPunkteByUser eingerechnet,
   *  siehe computeLiveLigaPunkte. */
  projectedWinnerBonusByUser?: Record<string, number>;
  /** Dominion-Bonus-Ergebnis DIESES Events je User (nur wer hier +1 bekommen bzw. den Bonus ausgelöst hat) */
  dominionResultByUser?: Record<string, { streakAfter: number; bonusAwarded: boolean }>;
  dominionThreshold?: number;
  userId: string;
  format?: string;
  /** Zeigt die "Match Wins"-Spalte/Team-Zuordnung nur, wenn die Reihe tatsächlich einen Stat darauf
   *  aufbaut (⚔️ in der Reihentabellen-Konfiguration) — sonst irrelevant für dieses Event. */
  trackMatchWin?: boolean;
  finalRankingGroups?: string[][] | null;
  pollWinnerIds?: string[];
  pollLabel?: string | null;
  /** Gewonnene Umfrage-Labels je User (neues DB-basiertes Multi-Umfrage-System) */
  pollWinsByUser?: Record<string, string[]>;
  /** Alle User-IDs, die in mindestens einer Umfrage des Events abgestimmt haben */
  votedUserIds?: string[];
  /** Wähler ohne Event-Registrierung — nur übergeben wenn es Tabellenpunkte für Stimmabgabe gibt */
  externalVoters?: Participant[];
  /** Begründung für manuelle Änderungen der Endtabelle / Disqualifikation, falls vorhanden */
  finalRankingNote?: string | null;
  /** Ausgeschlossene (disqualifizierte) User — werden mit „Ungewertet"-Badge markiert, zählen aber
   *  weiterhin mit ihren Stats in der Tabelle */
  excludedUserIds?: string[];
  /** Nur avg_stats: ob der höchste oder der niedrigste Ø gewinnt (completionData.avgWinnerDirection) —
   *  bestimmt Rundensieger, Sortierung je Runde und das Gesamtranking. */
  avgWinnerDirection?: "high" | "low";
}) {
  const excludedSet = new Set(excludedUserIds);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const isAvg    = format === "avg_stats";
  // avg_stats: Ø je Feld/kombiniert nach den gemeinsamen Regeln (nur gespielte Runden, leere Felder ≠ 0)
  const avgTotals = isAvg ? computeAvgTotals(matches, statFields) : new Map<string, AvgTotals>();
  const findUser = (uid: string | null) =>
    uid ? participants.find(p => p.userId === uid)?.user : null;
  const votedSet = new Set(votedUserIds);

  // ── Gesamtranking ─────────────────────────────────────────────────────────
  type PlayerTotal = {
    userId: string; user: User; role?: string; stats: Record<string, number>; matchCount: number;
    /** Anzahl Runden mit erfasster Platzierung (kann < matchCount sein, wenn nicht jede Runde eine
     *  Platzierung bekam) — Grundlage der Ø-Platzierung, siehe placementPoints-Spalte unten. */
    placementRounds: number;
    /** Aus der Platzierung je Runde resultierende Eventpunkte, über alle Runden summiert. */
    placementPointsSum: number;
  };
  const totals = new Map<string, PlayerTotal>();

  for (const p of participants) {
    totals.set(p.userId, { userId: p.userId, user: p.user, role: p.role, stats: {}, matchCount: 0, placementRounds: 0, placementPointsSum: 0 });
  }
  // Externe Wähler (ohne Event-Teilnahme) werden nur übergeben, wenn es Tabellenpunkte für die
  // Stimmabgabe gibt — dann tauchen sie unten im Gesamtranking als reine "Abgestimmt"-Zeile auf
  for (const v of externalVoters) {
    if (!totals.has(v.userId)) {
      totals.set(v.userId, { userId: v.userId, user: v.user, role: "voter", stats: {}, matchCount: 0, placementRounds: 0, placementPointsSum: 0 });
    }
  }
  for (const match of matches) {
    if (!match.playedAt) continue;
    for (const e of match.entries) {
      if (!e.userId) continue;
      let t = totals.get(e.userId);
      if (!t) {
        const u = findUser(e.userId);
        if (!u) continue;
        t = { userId: e.userId, user: u, role: "player", stats: {}, matchCount: 0, placementRounds: 0, placementPointsSum: 0 };
        totals.set(e.userId, t);
      }
      t.matchCount += 1;
      const s = parseEntryStats(e.statsJson) as Record<string, number> | null;
      if (s) {
        // Nur Zahlen aufsummieren — interne Marker wie "_team" ("A"/"B") sind keine Stats
        for (const [k, v] of Object.entries(s)) {
          if (typeof v === "number") t.stats[k] = (t.stats[k] ?? 0) + v;
        }
        if (s[PLACEMENT_STAT_KEY] != null) {
          t.placementRounds += 1;
          const pts = placementPoints?.[String(s[PLACEMENT_STAT_KEY])];
          if (pts) t.placementPointsSum += pts;
        }
      }
    }
  }

  // Für avg_stats: kombinierter Ø aus avgTotals in der gewählten Richtung. Teilnehmer ohne einen
  // einzigen eingetragenen Wert bleiben in der Tabelle sichtbar, landen aber immer ganz unten und
  // bekommen keinen (fiktiven) Durchschnittswert — sonst könnte eine ungespielte "0" bei
  // niedrigstem-Ø-gewinnt fälschlich als bester Wert durchgehen.
  // Ist eine Eventpunkte-Konfiguration aktiv (Punkte pro Stat und/oder Platzierungspunkte, siehe
  // computeTurnierpunkte), bestimmt AUSSCHLIESSLICH die kombinierte Gesamtpunktzahl die Reihenfolge —
  // nie eine einzelne Stat-Spalte. Nur ohne Eventpunkte-Konfiguration (reines ffa/avg_stats ohne
  // Punkte-Einstellungen) wird wie bisher lexikografisch nach den einzelnen Stat-Feldern sortiert.
  const hasTurnierpunkte = Object.keys(turnierpunkteByUser).length > 0;
  // Sieger-Stat (falls angegeben) zuerst, die übrigen Felder nur als Tiebreaker
  const sortFields = rankStatField && statFields.includes(rankStatField)
    ? [rankStatField, ...statFields.filter(f => f !== rankStatField)]
    : statFields;
  const byStatFields = (a: PlayerTotal, b: PlayerTotal) => {
    if (isAvg) return 0; // Summen sind bei Ø-Wertung kein sinnvoller Tiebreaker
    for (const f of sortFields) {
      const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };
  // Bestimmt die Platzierung — 0 = gleichauf (gleicher Platz).
  const rankCompare = (a: PlayerTotal, b: PlayerTotal) => {
    if (a.matchCount === 0 && b.matchCount === 0) return 0;
    if (a.matchCount === 0) return 1;
    if (b.matchCount === 0) return -1;
    if (isAvg) {
      return compareAvg(avgTotals.get(a.userId)?.combined, avgTotals.get(b.userId)?.combined, avgWinnerDirection);
    }
    if (hasTurnierpunkte) {
      return (turnierpunkteByUser[b.userId] ?? 0) - (turnierpunkteByUser[a.userId] ?? 0);
    }
    return byStatFields(a, b);
  };
  // Gleichauf liegende Spieler teilen sich den Platz; innerhalb des Gleichstands nur zur Anzeige
  // nach den Stat-Feldern geordnet.
  // Nach Abschluss der Spielphase: Angemeldete ohne gespielte Runde und ohne Tabellenpunkte/Stimmabgabe
  // haben nicht teilgenommen — sie tauchen nicht mehr (mit fiktivem Platz) in der Endtabelle auf.
  const tookPart = (t: PlayerTotal) =>
    isLigaPunkteLive || t.matchCount > 0 || (ligaPunkteByUser[t.userId] ?? 0) > 0 || votedSet.has(t.userId);
  const ranked = [...totals.values()].filter(tookPart).sort((a, b) => rankCompare(a, b) || byStatFields(a, b));

  // Sobald der Admin eine Endplatzierung bestätigt hat (finalRankingGroups), hat diese
  // Vorrang vor der statistischen Sortierung — die Zeilenreihenfolge folgt dann 1. bis
  // letztem Platz, unabhängig davon, wer den höchsten Durchschnitt/Stat-Wert hat.
  const confirmedPlaceOf = new Map<string, number>();
  if (finalRankingGroups) {
    let place = 1;
    for (const group of finalRankingGroups) {
      for (const uid of group) confirmedPlaceOf.set(uid, place);
      place += group.length;
    }
  }
  if (confirmedPlaceOf.size > 0) {
    ranked.sort((a, b) => {
      const pa = confirmedPlaceOf.get(a.userId) ?? Infinity;
      const pb = confirmedPlaceOf.get(b.userId) ?? Infinity;
      return pa - pb;
    });
  }

  // Platz je Zeile: bestätigte Endplatzierung, sonst Wettkampf-Rangfolge (1, 1, 1, 4 bei Gleichstand).
  const placeByUser = new Map<string, number>();
  ranked.forEach((r, i) => {
    const prev = ranked[i - 1];
    const statPlace = prev && rankCompare(prev, r) === 0 ? placeByUser.get(prev.userId)! : i + 1;
    placeByUser.set(r.userId, confirmedPlaceOf.get(r.userId) ?? statPlace);
  });

  // Farbe einer Stat-Zelle nach ihrem Wert innerhalb der Spalte (gleiche Werte = gleiche Farbe),
  // nicht nach der Zeilenposition.
  const RANK_TEXT = ["text-amber-300", "text-fg/90", "text-amber-700"];
  const statRankCls = (f: string, val: number) => {
    if (val <= 0) return "text-muted";
    const higher = new Set(
      ranked.filter(t => t.matchCount > 0 && (t.stats[f] ?? 0) > val).map(t => t.stats[f]),
    ).size;
    return RANK_TEXT[higher] ?? "text-muted";
  };
  // Dasselbe für die Ø-Spalten bei avg_stats — "besser" richtet sich nach der gewählten Richtung.
  const avgRankCls = (val: number | null | undefined, valueOf: (uid: string) => number | null | undefined) => {
    if (val === null || val === undefined) return "text-muted";
    const better = new Set(
      ranked.map(t => valueOf(t.userId)).filter(v => v != null && compareAvg(v, val, avgWinnerDirection) < 0),
    ).size;
    return RANK_TEXT[better] ?? "text-muted";
  };
  const fmtAvg = (v: number | null | undefined) => (v === null || v === undefined ? "–" : fmtUpTo2(v));
  // Ø je Feld als eigene Spalten — bei nur einem Feld wäre das identisch mit "Ø Gesamt"
  const showAvgFieldCols = isAvg && statFields.length > 1;

  // Sortierbare Spalten (Klick auf die Überschrift); null = offizielle Reihenfolge (Platzierung)
  const [sortKey, setSortKey] = useState<string | null>(null);
  const info = useScoringInfo();
  const sortValue = (r: (typeof ranked)[number], key: string): number =>
    key === "__event" ? (turnierpunkteByUser[r.userId] ?? 0)
      : key === "__table" ? (ligaPunkteByUser[r.userId] ?? 0)
        : key === "__rounds" ? r.matchCount
          : key === "__mw" ? (r.stats["Match Win"] ?? 0)
            : (r.stats[key] ?? 0);
  const shownRanked = sortKey ? [...ranked].sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey)) : ranked;
  const sortTh = (key: string, label: React.ReactNode, cls = "") => (
    <th className={`text-center px-3 py-2.5 font-semibold ${cls}`} aria-sort={sortKey === key ? "descending" : "none"}>
      <button type="button" onClick={() => setSortKey(k => (k === key ? null : key))}
        className={`inline-flex items-center gap-0.5 uppercase tracking-wider hover:text-fg ${sortKey === key ? "text-primary-fg" : ""}`}
        title={sortKey === key ? "Zurück zur Platzierung" : "Danach sortieren"}>
        {label}{sortKey === key && <ChevronDown className="size-3" />}
      </button>
    </th>
  );
  // Hauptwert je Spieler für die Karten am Handy
  const mainValue = (r: (typeof ranked)[number]): { label: string; value: string } => {
    if (hasTurnierpunkte) return { label: "Eventpunkte", value: fmtUpTo2(turnierpunkteByUser[r.userId] ?? 0) };
    if (isAvg) { const c = avgTotals.get(r.userId)?.combined; return { label: "Ø Gesamt", value: c != null ? formatFixed(c, 2) : "–" }; }
    const f = statFields[0];
    return { label: f ?? "Matches", value: f ? (r.stats[f] ? fmtUpTo2(r.stats[f]) : "–") : String(r.matchCount) };
  };

  // Nach Rundennummer sortiert — nachgetragene Runden erscheinen an ihrer Stelle, nicht am Ende
  const playedMatches   = sortStatRounds(matches.filter(m => m.playedAt));
  const upcomingMatches = sortStatRounds(matches.filter(m => !m.playedAt));


  return (
    <div className="space-y-5">

      {/* ── Gesamtranking ───────────────────────────────────────────────── */}
      {ranked.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-fg mb-3 flex flex-wrap items-center gap-2">
            <Trophy className="size-4 text-coin" /> Gesamtranking
            {isLigaPunkteLive && (
              <span className="flex items-center gap-1.5 normal-case tracking-normal text-xs font-medium text-primary" title="Tabellenpunkte sind eine Live-Vorschau — das Turnier läuft noch, endgültig werden sie erst beim Abschluss vergeben">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Tabellenpunkte live
              </span>
            )}
            <span className="ml-auto">{info.button}</span>
          </h2>
          {info.panel(<>
            <p>
              {isAvg
                ? <>Es zählt der Durchschnitt über alle eingetragenen Matches ({avgWinnerDirection === "low" ? "niedriger ist besser" : "höher ist besser"}). Nicht eingetragene Werte zählen nicht als 0.</>
                : hasTurnierpunkte
                  ? <>Jeder Wert bringt Eventpunkte (Wert × Punkte pro Wert{placementPoints ? ", dazu Punkte für die Platzierung im Match" : ""}). Die meisten Eventpunkte gewinnen.</>
                  : <>Sortiert nach <b>{sortFields[0]}</b>{sortFields.length > 1 && <>, bei Gleichstand nach {sortFields.slice(1).join(", ")}</>}.</>}
            </p>
            {POINTS_GLOSSARY}
            <p className="text-xs text-muted">Tipp: Auf eine Spaltenüberschrift tippen sortiert danach, nochmal tippen zurück zur Platzierung.</p>
          </>)}

          {/* Handy: eine Karte je Spieler, Details zum Aufklappen */}
          <ol className="md:hidden space-y-2">
            {shownRanked.map((r, i) => {
              const isMe = r.userId === userId;
              const place = placeByUser.get(r.userId) ?? (i + 1);
              const main = mainValue(r);
              const table = ligaPunkteByUser[r.userId] ?? 0;
              return (
                <li key={r.userId}>
                  <details className={`group rounded-card border bg-surface shadow-card ${isMe ? "border-primary/40" : "border-line"}`}>
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                      <span className="w-6 shrink-0 text-center">
                        {!sortKey && place <= 3 ? <span className="text-base">{MEDAL[place - 1]}</span> : <span className="text-sm font-bold text-subtle tabular-nums">{place}</span>}
                      </span>
                      <RankedAvatar userId={r.user.id} src={r.user.image} alt={uname(r.user)} size={28} className="w-7 h-7" />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-bold ${isMe ? "text-primary-fg" : "text-fg"}`}>{uname(r.user)}{isMe && " (du)"}</span>
                        <span className="block text-xs text-subtle">{r.matchCount} {r.matchCount === 1 ? "Match" : "Matches"}{table > 0 && <> · <span className="text-primary-fg font-semibold">{isLigaPunkteLive ? "~" : ""}+{fmtUpTo2(table)} Tabellenpkt.</span></>}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-extrabold tabular-nums text-fg">{main.value}</span>
                        <span className="block text-[11px] text-subtle">{main.label}</span>
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-subtle transition-transform group-open:rotate-180" />
                    </summary>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-xs">
                      {statFields.map(f => (
                        <div key={f} className="flex justify-between gap-2">
                          <dt className="text-subtle">{isAvg ? `Ø ${f}` : f}</dt>
                          <dd className="font-semibold tabular-nums text-fg">{isAvg ? fmtAvg(avgTotals.get(r.userId)?.fieldAvgs[f]) : (r.stats[f] ? fmtUpTo2(r.stats[f]) : "–")}</dd>
                        </div>
                      ))}
                      {trackMatchWin && <div className="flex justify-between gap-2"><dt className="text-subtle">Match Wins</dt><dd className="font-semibold tabular-nums text-success">{r.stats["Match Win"] ?? 0}</dd></div>}
                      {hasTurnierpunkte && <div className="flex justify-between gap-2"><dt className="text-subtle">Eventpunkte</dt><dd className="font-bold tabular-nums text-coin">{fmtUpTo2(turnierpunkteByUser[r.userId] ?? 0)}</dd></div>}
                      <div className="flex justify-between gap-2"><dt className="text-subtle">Matches</dt><dd className="font-semibold tabular-nums text-fg">{r.matchCount}</dd></div>
                    </dl>
                  </details>
                </li>
              );
            })}
          </ol>

          <div className="hidden md:block rounded-card border border-line bg-surface shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="border-b border-line text-xs text-subtle uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5 font-medium">#</th>
                    <th className="text-left px-4 py-2.5 font-medium">Spieler</th>
                    {(!isAvg || showAvgFieldCols) && statFields.map(f => (
                      isAvg
                        ? <th key={f} className="text-center px-3 py-2.5 font-semibold">{`Ø ${f}`}</th>
                        : <Fragment key={f}>{sortTh(f, f)}</Fragment>
                    ))}
                    {isAvg && (
                      <th className="text-center px-3 py-2.5 font-medium text-amber-400">Ø Gesamt</th>
                    )}
                    {!!placementPoints && (
                      <th className="text-center px-3 py-2.5 font-medium">Ø Platzierung</th>
                    )}
                    {trackMatchWin && sortTh("__mw", "Match Wins", "text-success")}
                    {hasTurnierpunkte && sortTh("__event", "Eventpunkte", "text-coin")}
                    {sortTh("__table", "Tabellenpunkte", "text-primary-fg")}
                    {sortTh("__rounds", "Matches")}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shownRanked.map((r, i) => {
                    const isMe   = r.userId === userId;
                    const avgT     = avgTotals.get(r.userId);
                    const combined = avgT?.combined ?? null;
                    // Bestätigte Endplatzierung bzw. geteilter Platz bei Gleichstand (siehe placeByUser)
                    const place = placeByUser.get(r.userId) ?? (i + 1);
                    const isPollWinner = pollWinnerIds.includes(r.userId);
                    const wonPollLabels = pollWinsByUser[r.userId] ?? [];
                    const eventLigapunkte = ligaPunkteByUser[r.userId] ?? 0;
                    const winnerBonusIfWon = projectedWinnerBonusByUser[r.userId] ?? 0;
                    return (
                      <tr key={r.userId} className={`transition-colors ${isMe ? "bg-primary-soft/60" : "hover:bg-surface-2"}`}>
                        <td className="px-4 py-3 text-center">
                          {place <= 3
                            ? <span className="text-base">{MEDAL[place - 1]}</span>
                            : <span className="text-sm text-subtle">{place}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link href={isMe ? "/profile" : `/profile/${r.userId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                              <RankedAvatar userId={r.user.id} src={r.user.image} alt={uname(r.user)} size={24} className="w-6 h-6" />
                              <span className={`font-medium ${isMe ? "text-primary-fg" : "text-fg"}`}>
                                {uname(r.user)}{isMe && " (du)"}
                              </span>
                            </Link>
                            {r.role === "spectator" && (
                              <Eye className="w-3 h-3 text-subtle shrink-0" />
                            )}
                            {isLigaPunkteLive && projectedWinnerIds.includes(r.userId) && (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0"
                                title="Führt aktuell nach Eventpunkten — würde bei Abschluss jetzt den Sieger-Bonus in Tabellenpunkten bekommen"
                              >
                                <Trophy className="w-2.5 h-2.5" /> aktuell vorn
                              </span>
                            )}
                            {excludedSet.has(r.userId) && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted bg-line px-1.5 py-0.5 rounded-full shrink-0">
                                Ungewertet
                              </span>
                            )}
                            {votedSet.has(r.userId) && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success-soft px-1.5 py-0.5 rounded-full shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Abgestimmt
                              </span>
                            )}
                            {isPollWinner && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded-full shrink-0">
                                <Vote className="w-2.5 h-2.5" />{pollLabel ?? "Poll"}
                              </span>
                            )}
                            {wonPollLabels.map(label => (
                              <span key={label} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded-full shrink-0">
                                <Vote className="w-2.5 h-2.5" />{label}
                              </span>
                            ))}
                            {dominionResultByUser[r.userId] && (
                              <span
                                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0"
                                title={dominionResultByUser[r.userId].bonusAwarded
                                  ? "Dominion Bonus hier ausgelöst!"
                                  : `Dominion-Streak hier +1${dominionThreshold ? ` — jetzt bei ${dominionResultByUser[r.userId].streakAfter} von ${dominionThreshold}` : ""}`}
                              >
                                <Flame className="w-2.5 h-2.5" />
                                {dominionResultByUser[r.userId].bonusAwarded
                                  ? "Bonus!"
                                  : dominionResultByUser[r.userId].streakAfter}
                              </span>
                            )}
                          </div>
                        </td>
                        {!isAvg && statFields.map(f => {
                          const val = r.stats[f] ?? 0;
                          const pts = statPointsPer[f] ? val * statPointsPer[f] : 0;
                          return (
                            <td key={f} className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-0">
                                <span className={`tabular-nums font-semibold ${statRankCls(f, val)}`}>
                                  {val > 0 ? fmtUpTo2(val) : "–"}
                                </span>
                                {pts > 0 && (
                                  <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{fmtUpTo2(pts)} Pkt.</span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {showAvgFieldCols && statFields.map(f => {
                          const val = avgT?.fieldAvgs[f];
                          return (
                            <td key={f} className={`px-3 py-3 text-center tabular-nums font-semibold ${
                              avgRankCls(val, uid => avgTotals.get(uid)?.fieldAvgs[f])
                            }`}>
                              {fmtAvg(val)}
                            </td>
                          );
                        })}
                        {isAvg && (
                          <td className={`px-3 py-3 text-center tabular-nums font-bold ${
                            combined !== null ? RANK_TEXT[place - 1] ?? "text-muted" : "text-muted"
                          }`}>
                            {combined !== null ? formatFixed(combined, 2) : "–"}
                          </td>
                        )}
                        {!!placementPoints && (
                          <td className="px-3 py-3 text-center">
                            <div className="flex flex-col items-center gap-0">
                              <span className="tabular-nums font-semibold text-fg/90">
                                {r.placementRounds > 0 ? fmtUpTo2((r.stats[PLACEMENT_STAT_KEY] ?? 0) / r.placementRounds) : "–"}
                              </span>
                              {r.placementPointsSum > 0 && (
                                <span className="text-[9px] text-emerald-500 tabular-nums leading-none">+{fmtUpTo2(r.placementPointsSum)} Pkt.</span>
                              )}
                            </div>
                          </td>
                        )}
                        {trackMatchWin && (
                          <td className="px-3 py-3 text-center tabular-nums font-semibold text-success">
                            {r.stats["Match Win"] ?? 0}
                          </td>
                        )}
                        {hasTurnierpunkte && (
                          <td className="px-3 py-3 text-center tabular-nums font-bold text-amber-300">
                            {fmtUpTo2(turnierpunkteByUser[r.userId] ?? 0)}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-0">
                            {eventLigapunkte > 0 && !isLigaPunkteLive && (ligaPunkteBreakdownByUser[r.userId]?.length ?? 0) > 0
                              ? <details className="group text-center">
                                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer tabular-nums font-bold inline-flex items-center gap-0.5 text-primary"
                                    title="Aufschlüsselung anzeigen">
                                    +{fmtUpTo2(eventLigapunkte)} <RankPointsIcon size={13} />
                                  </summary>
                                  <div className="mt-1 space-y-0.5">
                                    {ligaPunkteBreakdownByUser[r.userId].map(item => (
                                      <div key={item.label} className="text-[9px] text-subtle whitespace-nowrap leading-tight">
                                        {item.label}: <span className="tabular-nums text-primary/80">{item.points > 0 ? "+" : ""}{fmtUpTo2(item.points)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              : eventLigapunkte > 0
                              ? <span className={`tabular-nums font-bold inline-flex items-center gap-0.5 ${isLigaPunkteLive ? "text-primary-fg/80" : "text-primary"}`}
                                  title={isLigaPunkteLive ? "Vorläufig — Turnier läuft noch, kann sich noch ändern" : undefined}>
                                  {isLigaPunkteLive && "~"}+{fmtUpTo2(eventLigapunkte)} <RankPointsIcon size={13} />
                                </span>
                              : <span className="text-sm text-subtle">–</span>}
                            {winnerBonusIfWon > 0 && (
                              <span className="text-[9px] text-primary/70 tabular-nums leading-none" title="Zusätzlicher Sieger-Bonus, falls das Turnier jetzt mit dieser Platzierung enden würde">
                                +{winnerBonusIfWon} falls Sieger
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-subtle text-xs">{r.matchCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-subtle mt-1.5 px-1">
            {isAvg
              ? <>Sortiert nach kombiniertem Durchschnitt aller Felder ({avgWinnerDirection === "low" ? "niedrigster" : "höchster"} Ø gewinnt) · nicht eingetragene Werte zählen nicht als 0</>
              : hasTurnierpunkte
                ? <>Sortiert nach Eventpunkte</>
                : <>Sortiert nach: <span className="text-subtle">{sortFields[0]}</span>
                    {sortFields.length > 1 && <> · Tiebreaker: {sortFields.slice(1).join(", ")}</>}</>}
          </p>
        </div>
      )}

      {/* Endtabellen-Notiz (Begründung für manuelle Änderungen/Disqualifikation, falls vorhanden) */}
      {finalRankingNote && (
        <div className="glass rounded-2xl px-4 py-3 flex items-start gap-2">
          <StickyNote className="w-3.5 h-3.5 text-subtle mt-0.5 shrink-0" />
          <p className="text-xs text-subtle italic leading-relaxed">{finalRankingNote}</p>
        </div>
      )}

      {/* ── Ausstehende Matches ─────────────────────────────────────────── */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-fg mb-3">
            Ausstehende Matches
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map(match => (
              <div key={match.id} className="glass rounded-card px-4 py-3 flex items-center gap-3">
                {match.scheduledAt && (
                  <div className="shrink-0 text-center w-12">
                    <p className="text-sm font-bold text-fg">{getBerlinDateParts(match.scheduledAt).day}</p>
                    <p className="text-xs text-subtle uppercase">
                      {formatBerlinDate(match.scheduledAt, { month: "short" })}
                    </p>
                    <p className="text-xs text-subtle">
                      {formatBerlinTime(match.scheduledAt, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{statRoundLabel(match)}</p>
                  <p className="text-xs text-subtle mt-0.5">{match.entries.length} Spieler</p>
                  {match.notes && <p className="text-xs text-subtle mt-0.5 truncate">{match.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {match.entries.slice(0, 4).map(e => {
                    const u    = findUser(e.userId);
                    const isMe = e.userId === userId;
                    return u ? (
                      <span key={e.id} className={`text-xs px-2 py-0.5 rounded-full border ${
                        isMe ? "border-primary/40 text-primary-fg bg-primary-soft/60" : "border-line-strong text-muted glass-heavy"
                      }`}>
                        {uname(u)}
                      </span>
                    ) : null;
                  })}
                  {match.entries.length > 4 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-line-strong text-subtle">
                      +{match.entries.length - 4}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gespielte Matches mit Ergebnissen ───────────────────────────── */}
      {playedMatches.length > 0 && (
        <div>
          <h2 className="text-base font-extrabold text-fg mb-3">
            Ergebnisse
          </h2>
          <div className="space-y-2">
            {playedMatches.map(match => {
              const isExp   = expanded.has(match.id);
              const myEntry = match.entries.find(e => e.userId === userId);

              // Für avg_stats: Rundensieger nach Ø des Eintrags in der gewählten Richtung — bei
              // Gleichstand alle Gleichauf-Liegenden
              const matchWinnerIds = isAvg && statFields.length > 0
                ? new Set(roundWinnerIds(match.entries, statFields, avgWinnerDirection))
                : new Set<string>();

              // Für coop_stats: "Match Win"-Haken dieser Runde auslesen (gilt für alle Spieler der Runde)
              let matchWin: boolean | null = null;
              if (trackMatchWin) {
                for (const e of match.entries) {
                  const v = readStatValue(parseEntryStats(e.statsJson), "Match Win");
                  if (v !== null) { matchWin = v > 0; break; }
                }
              }

              return (
                <div key={match.id} className={`glass border rounded-xl overflow-hidden ${myEntry ? "border-primary/40" : "border-line"}`}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 text-left"
                    onClick={() => toggle(match.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-fg truncate">
                        Match {match.position}
                        {statRoundNote(match) && <span className="text-muted font-normal"> · {statRoundNote(match)}</span>}
                      </span>
                      {match.resultConfirmed === false && (
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-warning-soft text-warning shrink-0"
                          title="Von Spielern gemeldet, noch nicht bestätigt">vorläufig</span>
                      )}
                      {match.playedAt && (
                        <span className="text-xs text-subtle flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatBerlinDate(match.playedAt, { day: "2-digit", month: "2-digit" })}
                        </span>
                      )}
                      {isAvg && matchWinnerIds.size > 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1 min-w-0">
                          <Trophy className="w-3 h-3 shrink-0" />
                          <span className="truncate">{[...matchWinnerIds].map(id => uname(findUser(id))).join(", ")}</span>
                        </span>
                      )}
                      {trackMatchWin && matchWin !== null && (
                        <span className={`text-xs flex items-center gap-1 shrink-0 ${matchWin ? "text-success" : "text-subtle"}`}>
                          <Trophy className="w-3 h-3" />
                          {matchWin ? "Sieg" : "Niederlage"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-subtle">{match.entries.length} Spieler</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-subtle" /> : <ChevronDown className="w-4 h-4 text-subtle" />}
                    </div>
                  </button>

                  {isExp && (
                    <div className="border-t border-line overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-line text-xs text-subtle uppercase tracking-wider bg-surface-2">
                            <th className="text-left px-4 py-2 font-medium">Spieler</th>
                            {(!isAvg || showAvgFieldCols) && statFields.map(f => (
                              <th key={f} className="text-center px-3 py-2 font-medium">{f}</th>
                            ))}
                            {isAvg && (
                              <th className="text-center px-3 py-2 font-medium text-amber-400">Ø Gesamt</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {[...match.entries]
                            .sort((a, b) => isAvg
                              // Richtung wie im Gesamtranking, Einträge ohne Werte immer ans Ende
                              ? compareAvg(entryAvg(a.statsJson, statFields), entryAvg(b.statsJson, statFields), avgWinnerDirection)
                              : 0)
                            .map(e => {
                              const u      = findUser(e.userId);
                              const stats  = parseEntryStats(e.statsJson) ?? {};
                              const isMe   = e.userId === userId;
                              const isWinner = isAvg && !!e.userId && matchWinnerIds.has(e.userId);
                              const avg    = isAvg ? entryAvg(e.statsJson, statFields) : null;
                              return (
                                <tr key={e.id} className={`transition-colors ${isMe ? "bg-primary-soft/60" : "hover:bg-surface-2"}`}>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      {isWinner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
                                      {u && <RankedAvatar userId={u.id} src={u.image} alt={uname(u)} size={20} className="w-5 h-5" />}
                                      <span className={`font-medium ${isWinner ? "text-amber-300" : isMe ? "text-primary-fg" : "text-fg"}`}>
                                        {u ? <>{uname(u)}</> : "?"}{isMe && " (du)"}
                                      </span>
                                      {(proofsByEntry[`${match.id}:${e.userId}`] ?? []).map((url, i, all) => (
                                        <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                                          title={`Nachweis${all.length > 1 ? ` ${i + 1}` : ""} ansehen (vom Admin bestätigt)`}
                                          className="inline-flex items-center gap-0.5 text-subtle hover:text-primary-fg transition-colors">
                                          <Camera className="w-3.5 h-3.5" />{all.length > 1 && <span className="text-[9px]">{i + 1}</span>}
                                        </a>
                                      ))}
                                    </div>
                                  </td>
                                  {(!isAvg || showAvgFieldCols) && statFields.map(f => (
                                    <td key={f} className="px-3 py-2.5 text-center text-fg/90 tabular-nums">
                                      {(() => { const v = readStatValue(stats, f); return v === null ? "–" : fmtUpTo2(v); })()}
                                    </td>
                                  ))}
                                  {isAvg && (
                                    <td className={`px-3 py-2.5 text-center tabular-nums font-bold ${isWinner ? "text-amber-300" : "text-muted"}`}>
                                      {fmtAvg(avg)}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center text-subtle text-sm">
          Noch keine Matches angelegt.
        </div>
      )}
    </div>
  );
}

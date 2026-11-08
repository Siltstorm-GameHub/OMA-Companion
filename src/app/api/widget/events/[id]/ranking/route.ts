import { formatFixed } from "@/lib/format-number";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placementRewardFor } from "@/lib/placement-rewards";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { applyEventStatOverride, computeTurnierpunkte, hasEventPoints, PLACEMENT_STAT_KEY, resolveRankStatField, type StatConfig } from "@/lib/series-event-points";
import { compareAvg, computeAvgTotals, resolveAvgDirection } from "@/lib/avg-stats";
import { GROUP_KNOCKOUT_FORMAT, computeLeagueStandings, groupKnockoutRanking, leagueMemberIds } from "@/lib/tournaments/groupStage";

type UserLite = { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };

/**
 * GET /api/widget/events/[id]/ranking
 *
 * Live-Rangliste eines einzelnen Events fürs Widget — Formel 1:1 aus
 * /api/tournaments/[id]/ranking/route.ts übernommen (bewusst dupliziert statt importiert:
 * jene Route ist Moderator-Session-geschützt, hier reiner Read ohne Nebenwirkungen, daher
 * geringes Risiko einer eigenen Kopie). Bei Abweichungen künftig dort UND hier pflegen.
 *
 * "Eventpunkte" (computeTurnierpunkte, src/lib/series-event-points.ts) werden zusätzlich live
 * berechnet — anders als die echten Tabellenpunkte (computeEventPoints) haengt diese Funktion NICHT an
 * completionData, ist also schon waehrend eines laufenden Events verwendbar.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireWidgetKey(req);
  if (unauthorized) return unauthorized;

  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } } },
      matches: { include: { entries: true }, where: { playedAt: { not: null } } },
      series: { select: { seriesStatConfig: true, placementRewardsJson: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const format = event.format ?? "single_elimination";
  const userMap = new Map<string, UserLite>(event.participants.map((p) => [p.userId, p.user]));

  // Eventpunkte-Konfiguration: Reihen-weite StatConfig + Event-eigene Ueberschreibung (identisch
  // zu applyEventStatOverride-Nutzung in EventEditClient.tsx / computeTurnierpunkte-Aufrufern).
  const baseStatCfg: StatConfig = (() => {
    try {
      return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : null;
    } catch {
      return null;
    }
  })() ?? { participationPoints: 0, stats: [] };
  const effectiveStatCfg = applyEventStatOverride(baseStatCfg, event.statConfigJson);
  // Alle Stats 0 Punkte → keine Eventpunkte (wie Eventseite), sortiert wird nach dem Sieger-Stat
  const hasTurnierpunkteConfig = hasEventPoints(effectiveStatCfg);
  const turnierpunkteByUser = hasTurnierpunkteConfig
    ? computeTurnierpunkte(event.matches, effectiveStatCfg, format)
    : {};

  let ranking: { userId: string; score: number; label: string; stats?: Record<string, number> }[] = [];

  if (format === "ffa" || format === "coop_stats" || format === "avg_stats") {
    const statFieldList: string[] = event.statFields ? JSON.parse(event.statFields) : [];
    // Ohne Eventpunkte entscheidet der Sieger-Stat (zuerst sortiert), die übrigen sind Tiebreaker
    const rankField = hasTurnierpunkteConfig
      ? undefined
      : resolveRankStatField(statFieldList, event.seriesEventConfigJson, baseStatCfg as { winnerStatField?: string; defaultWinnerStatField?: string });
    const fields: string[] = rankField ? [rankField, ...statFieldList.filter((f) => f !== rankField)] : statFieldList;
    const totals = new Map<
      string,
      { userId: string; stats: Record<string, number>; rounds: number; placementSum: number; placementCount: number }
    >();

    for (const match of event.matches) {
      for (const entry of match.entries) {
        if (!entry.userId) continue;
        if (!totals.has(entry.userId)) {
          totals.set(entry.userId, { userId: entry.userId, stats: {}, rounds: 0, placementSum: 0, placementCount: 0 });
        }
        const t = totals.get(entry.userId)!;
        t.rounds += 1;
        if (entry.statsJson) {
          try {
            const s = JSON.parse(entry.statsJson) as Record<string, unknown>;
            // Nur konfigurierte Stat-Felder aufsummieren — nicht blind alle JSON-Keys (sonst
            // landen interne Marker wie "_team" als NaN/String-Konkatenation in den Summen).
            for (const f of fields) {
              const v = Number(s[f] ?? 0);
              if (v) t.stats[f] = (t.stats[f] ?? 0) + v;
            }
            // "Match Win" ist ein Zaehler (0/1 pro Runde) — Summe ist hier sinnvoll, daher normal
            // aufaddiert, nicht wie Platzierung gemittelt.
            if (s["Match Win"] != null) {
              const mw = Number(s["Match Win"]);
              if (mw) t.stats["Match Win"] = (t.stats["Match Win"] ?? 0) + mw;
            }
            // Platzierung ist ein Rang pro Runde (1 = Erster) — Summieren über mehrere Runden ist
            // sinnlos, hier wird stattdessen der Durchschnitt gebildet (wie bei der Endplatzierung
            // ueblich, siehe "Endplatzierung tracken" / PLACEMENT_STAT_KEY).
            const placementRaw = s[PLACEMENT_STAT_KEY];
            if (placementRaw != null) {
              const p = Number(placementRaw);
              if (p > 0) {
                t.placementSum += p;
                t.placementCount += 1;
              }
            }
          } catch {
            // malformed entry ueberspringen
          }
        }
      }
    }
    for (const t of totals.values()) {
      if (t.placementCount > 0) {
        t.stats[`Ø ${PLACEMENT_STAT_KEY}`] = Math.round((t.placementSum / t.placementCount) * 100) / 100;
      }
    }

    if (format === "avg_stats") {
      // Gemeinsame Ø-Regeln + Richtung (Abschluss bzw. Event-Einstellung), siehe avg-stats.ts
      const direction = resolveAvgDirection(event.completionData, event.statConfigJson);
      const avgTotals = computeAvgTotals(event.matches, fields);
      const sorted = [...totals.values()]
        .map((t) => ({ userId: t.userId, avg: avgTotals.get(t.userId) }))
        .sort((a, b) => compareAvg(a.avg?.combined, b.avg?.combined, direction));
      ranking = sorted.map(({ userId, avg }) => {
        const combined = avg?.combined ?? null;
        const display = combined === null ? "–" : combined % 1 === 0 ? String(combined) : formatFixed(combined, 2);
        const statsAvg: Record<string, number> = {};
        for (const f of fields) {
          const v = avg?.fieldAvgs[f];
          if (v !== null && v !== undefined) statsAvg[f] = Math.round(v * 100) / 100;
        }
        return { userId, score: combined === null ? 0 : Math.round(combined * 100) / 100, label: `Ø ${display} (${avg?.rounds ?? 0}R)`, stats: statsAvg };
      });
    } else {
      const sorted = [...totals.values()].sort((a, b) => {
        for (const f of fields) {
          const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
          if (diff !== 0) return diff;
        }
        return 0;
      });
      ranking = sorted.map((t, i) => ({
        userId: t.userId,
        score: fields[0] ? (t.stats[fields[0]] ?? 0) : 0,
        label: fields[0] ? `${t.stats[fields[0]] ?? 0} ${fields[0]}` : `Platz ${i + 1}`,
        stats: t.stats,
      }));
    }
  } else if (format === GROUP_KNOCKOUT_FORMAT) {
    ranking = groupKnockoutRanking(event.participants, event.matches, event.groupStageJson);
  } else if (format === "single_elimination") {
    const wins = new Map<string, number>();
    for (const match of event.matches) {
      if (match.winnerId) wins.set(match.winnerId, (wins.get(match.winnerId) ?? 0) + 1);
    }
    for (const match of event.matches) {
      for (const uid of [match.player1Id, match.player2Id, match.winnerId]) {
        if (uid && !userMap.has(uid)) userMap.set(uid, { id: uid, name: null, username: null, image: null, rankPoints: 0 });
      }
    }
    ranking = [...userMap.keys()]
      .map((uid) => ({ userId: uid, score: wins.get(uid) ?? 0, label: `${wins.get(uid) ?? 0} Siege` }))
      .sort((a, b) => b.score - a.score);
  } else if (format === "round_robin" || format === "liga") {
    // Gleiche Tabelle wie auf der Turnierseite (inkl. Unentschieden ohne Tore, Tordifferenz,
    // direktem Vergleich), siehe computeLeagueStandings
    // Alle Turnier-Teilnehmer (auch ohne gespieltes Match) plus alle Spieler aus Matches
    const ids = [...new Set([...userMap.keys(), ...leagueMemberIds(event.matches, [...userMap.keys()])])];
    for (const uid of ids) if (!userMap.has(uid)) userMap.set(uid, { id: uid, name: null, username: null, image: null, rankPoints: 0 });
    ranking = computeLeagueStandings(ids, event.matches)
      .map(s => ({ userId: s.userId, score: s.pts, label: `${s.pts} Pkt.` }));

  } else {
    ranking = [...userMap.keys()].map((uid) => ({ userId: uid, score: 0, label: "–" }));
  }

  const missingUserIds = ranking
    .map((r) => r.userId)
    .filter((uid) => {
      const u = userMap.get(uid);
      return !u || (!u.name && !u.username);
    });
  if (missingUserIds.length > 0) {
    const fetchedUsers = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, name: true, username: true, image: true, rankPoints: true },
    });
    for (const u of fetchedUsers) userMap.set(u.id, u);
  }

  const result = ranking.map((r, i) => {
    const placement = i + 1;
    // Vorschau der Belohnung, die der Event-Abschluss für diesen Platz auszahlen würde
    const { coins, rankPoints: rankPts } = placementRewardFor(placement, event.placementRewardsJson, event.series?.placementRewardsJson);
    const user = userMap.get(r.userId);
    const rawTurnierpunkte = turnierpunkteByUser[r.userId];
    return {
      placement,
      userId: r.userId,
      displayName: user?.username ?? user?.name ?? "Unbekannt",
      image: user?.image ?? null,
      rankPoints: user?.rankPoints ?? 0,
      score: r.score,
      label: r.label,
      stats: r.stats ?? null,
      coins,
      rankPts,
      turnierpunkte: hasTurnierpunkteConfig ? Math.round((rawTurnierpunkte ?? 0) * 100) / 100 : null,
    };
  });

  return NextResponse.json({ ranking: result, format });
}

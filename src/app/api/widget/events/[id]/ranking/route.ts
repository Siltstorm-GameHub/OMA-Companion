import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { placementRewardFor } from "@/lib/placement-rewards";
import { requireWidgetKey } from "@/lib/widgetAuth";
import { applyEventStatOverride, computeTurnierpunkte, PLACEMENT_STAT_KEY, type StatConfig } from "@/lib/series-event-points";
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
 * "Turnierpunkte" (computeTurnierpunkte, src/lib/series-event-points.ts) werden zusätzlich live
 * berechnet — anders als die echten Ligapunkte (computeEventPoints) haengt diese Funktion NICHT an
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

  // Turnierpunkte-Konfiguration: Reihen-weite StatConfig + Event-eigene Ueberschreibung (identisch
  // zu applyEventStatOverride-Nutzung in EventEditClient.tsx / computeTurnierpunkte-Aufrufern).
  const baseStatCfg: StatConfig = (() => {
    try {
      return event.series?.seriesStatConfig ? JSON.parse(event.series.seriesStatConfig) : null;
    } catch {
      return null;
    }
  })() ?? { participationPoints: 0, stats: [] };
  const effectiveStatCfg = applyEventStatOverride(baseStatCfg, event.statConfigJson);
  const hasTurnierpunkteConfig = effectiveStatCfg.stats.length > 0 || !!effectiveStatCfg.placementPoints;
  const turnierpunkteByUser = hasTurnierpunkteConfig
    ? computeTurnierpunkte(event.matches, effectiveStatCfg, format)
    : {};

  let ranking: { userId: string; score: number; label: string; stats?: Record<string, number> }[] = [];

  if (format === "ffa" || format === "coop_stats" || format === "avg_stats") {
    const fields: string[] = event.statFields ? JSON.parse(event.statFields) : [];
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
      const averaged = [...totals.values()].map((t) => {
        const fieldAvgs = fields.map((f) => (t.rounds > 0 ? (t.stats[f] ?? 0) / t.rounds : 0));
        const combined = fields.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fields.length : 0;
        return { userId: t.userId, combined, rounds: t.rounds };
      });
      const sorted = averaged.sort((a, b) => b.combined - a.combined);
      ranking = sorted.map((t) => {
        const display = t.combined % 1 === 0 ? String(t.combined) : t.combined.toFixed(2);
        const totalsForUser = totals.get(t.userId)!;
        const statsAvg: Record<string, number> = {};
        for (const f of fields) {
          const avg = totalsForUser.rounds > 0 ? (totalsForUser.stats[f] ?? 0) / totalsForUser.rounds : 0;
          statsAvg[f] = Math.round(avg * 100) / 100;
        }
        return { userId: t.userId, score: Math.round(t.combined * 100) / 100, label: `Ø ${display} (${t.rounds}R)`, stats: statsAvg };
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

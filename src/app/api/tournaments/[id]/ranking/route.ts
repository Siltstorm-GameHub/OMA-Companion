import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { placementRewardFor } from "@/lib/placement-rewards";
import { compareAvg, computeAvgTotals, resolveAvgDirection } from "@/lib/avg-stats";
import { GROUP_KNOCKOUT_FORMAT, computeLeagueStandings, groupKnockoutRanking, leagueMemberIds } from "@/lib/tournaments/groupStage";

// Berechnet die Endplatzierung als Vorschau (ohne Punkte zu vergeben)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  // [id] ist jetzt die Event.id
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
      matches: { include: { entries: true }, where: { playedAt: { not: null } } },
      series: { select: { placementRewardsJson: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });


  const format = event.format ?? "single_elimination";

  const userMap = new Map<string, { id: string; name: string | null; username: string | null; image: string | null }>(
    event.participants.map(p => [p.userId, p.user])
  );

  let ranking: { userId: string; score: number; label: string }[] = [];

  if (format === "ffa" || format === "coop_stats" || format === "avg_stats") {
    const fields: string[] = event.statFields ? JSON.parse(event.statFields) : [];
    const totals = new Map<string, { userId: string; stats: Record<string, number>; rounds: number }>();

    for (const match of event.matches) {
      for (const entry of match.entries) {
        if (!entry.userId) continue;
        if (!totals.has(entry.userId)) totals.set(entry.userId, { userId: entry.userId, stats: {}, rounds: 0 });
        const t = totals.get(entry.userId)!;
        t.rounds += 1;
        if (entry.statsJson) {
          try {
            const s = JSON.parse(entry.statsJson) as Record<string, number>;
            // Nur Zahlen — interne Marker wie "_team" ("A"/"B") sind keine Stats
            for (const [k, v] of Object.entries(s)) if (typeof v === "number") t.stats[k] = (t.stats[k] ?? 0) + v;
          } catch { /* skip malformed entry */ }
        }
      }
    }

    if (format === "avg_stats") {
      // Gemeinsame Ø-Regeln + Richtung (Abschluss bzw. Event-Einstellung), siehe avg-stats.ts
      const direction = resolveAvgDirection(event.completionData, event.statConfigJson);
      const avgTotals = computeAvgTotals(event.matches, fields);
      const sorted = [...totals.values()]
        .map(t => ({ userId: t.userId, avg: avgTotals.get(t.userId) }))
        .sort((a, b) => compareAvg(a.avg?.combined, b.avg?.combined, direction));

      ranking = sorted.map(({ userId, avg }) => {
        const combined = avg?.combined ?? null;
        const display = combined === null ? "–" : combined % 1 === 0 ? String(combined) : combined.toFixed(2);
        return {
          userId,
          score:  combined === null ? 0 : Math.round(combined * 100) / 100,
          label:  `Ø ${display} (${avg?.rounds ?? 0}R)`,
        };
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
        score:  fields[0] ? (t.stats[fields[0]] ?? 0) : 0,
        label:  fields[0] ? `${t.stats[fields[0]] ?? 0} ${fields[0]}` : `Platz ${i + 1}`,
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
        if (uid && !userMap.has(uid)) userMap.set(uid, { id: uid, name: null, username: null, image: null });
      }
    }

    ranking = [...userMap.keys()]
      .map(uid => ({ userId: uid, score: wins.get(uid) ?? 0, label: `${wins.get(uid) ?? 0} Siege` }))
      .sort((a, b) => b.score - a.score);

  } else if (format === "round_robin" || format === "liga") {
    // Gleiche Tabelle wie auf der Turnierseite (inkl. Unentschieden ohne Tore, Tordifferenz,
    // direktem Vergleich), siehe computeLeagueStandings
    // Alle Turnier-Teilnehmer (auch ohne gespieltes Match) plus alle Spieler aus Matches
    const ids = [...new Set([...userMap.keys(), ...leagueMemberIds(event.matches, [...userMap.keys()])])];
    for (const uid of ids) if (!userMap.has(uid)) userMap.set(uid, { id: uid, name: null, username: null, image: null });
    ranking = computeLeagueStandings(ids, event.matches)
      .map(s => ({ userId: s.userId, score: s.pts, label: `${s.pts} Pkt.` }));

  } else {
    ranking = [...userMap.keys()].map(uid => ({ userId: uid, score: 0, label: "–" }));
  }

  const missingUserIds = ranking
    .map(r => r.userId)
    .filter(uid => { const u = userMap.get(uid); return !u || (!u.name && !u.username); });

  if (missingUserIds.length > 0) {
    const fetchedUsers = await prisma.user.findMany({
      where:  { id: { in: missingUserIds } },
      select: { id: true, name: true, username: true, image: true },
    });
    for (const u of fetchedUsers) userMap.set(u.id, u);
  }

  const result = ranking.map((r, i) => {
    const placement = i + 1;
    // Vorschau der Belohnung, die der Event-Abschluss für diesen Platz auszahlen würde
    const { coins, rankPoints: rankPts } = placementRewardFor(placement, event.placementRewardsJson, event.series?.placementRewardsJson);
    const user    = userMap.get(r.userId);
    return {
      placement,
      userId: r.userId,
      user:   user ? { id: user.id, name: user.name, username: user.username, image: user.image } : null,
      score:  r.score,
      label:  r.label,
      coins,
      rankPts,
    };
  });

  return NextResponse.json({ ranking: result, format });
}

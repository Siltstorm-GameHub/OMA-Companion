import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Berechnet die Endplatzierung eines Turniers als Vorschau (ohne Punkte zu vergeben)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
      matches: { include: { entries: true }, where: { playedAt: { not: null } } },
    },
  });

  if (!tournament) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const cfg: Record<string, number | { coins: number; points: number }> =
    tournament.pointsConfig ? JSON.parse(tournament.pointsConfig) : {};

  const format = tournament.format;
  const userMap = new Map(tournament.participants.map(p => [p.userId, p.user]));

  let ranking: { userId: string; score: number; label: string }[] = [];

  if (format === "ffa" || format === "coop_stats") {
    // Stats über alle Matches summieren
    const fields: string[] = tournament.statFields ? JSON.parse(tournament.statFields) : [];
    const totals = new Map<string, { userId: string; stats: Record<string, number> }>();

    for (const match of tournament.matches) {
      for (const entry of match.entries) {
        if (!entry.userId) continue;
        if (!totals.has(entry.userId)) totals.set(entry.userId, { userId: entry.userId, stats: {} });
        const t = totals.get(entry.userId)!;
        if (entry.statsJson) {
          const s = JSON.parse(entry.statsJson) as Record<string, number>;
          for (const [k, v] of Object.entries(s)) t.stats[k] = (t.stats[k] ?? 0) + v;
        }
      }
    }

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

  } else if (format === "single_elimination") {
    // Siege aus Match-Ergebnissen zählen
    const wins = new Map<string, number>();
    for (const match of tournament.matches) {
      if (match.winnerId) wins.set(match.winnerId, (wins.get(match.winnerId) ?? 0) + 1);
    }
    ranking = [...userMap.keys()]
      .map(uid => ({ userId: uid, score: wins.get(uid) ?? 0, label: `${wins.get(uid) ?? 0} Siege` }))
      .sort((a, b) => b.score - a.score);

  } else if (format === "round_robin" || format === "liga") {
    // Punkte: Sieg = 3, Unentschieden = 1, Niederlage = 0
    const pts = new Map<string, number>();
    for (const match of tournament.matches) {
      const p1 = match.player1Id; const p2 = match.player2Id;
      if (!p1 || !p2) continue;
      if (!pts.has(p1)) pts.set(p1, 0);
      if (!pts.has(p2)) pts.set(p2, 0);
      if (match.winnerId === p1) { pts.set(p1, pts.get(p1)! + 3); }
      else if (match.winnerId === p2) { pts.set(p2, pts.get(p2)! + 3); }
      else if (match.score1 !== null && match.score2 !== null && match.score1 === match.score2) {
        pts.set(p1, pts.get(p1)! + 1); pts.set(p2, pts.get(p2)! + 1);
      }
    }
    ranking = [...userMap.keys()]
      .map(uid => ({ userId: uid, score: pts.get(uid) ?? 0, label: `${pts.get(uid) ?? 0} Pkt.` }))
      .sort((a, b) => b.score - a.score);

  } else {
    // Fallback: alle Teilnehmer ohne Wertung
    ranking = [...userMap.keys()].map(uid => ({ userId: uid, score: 0, label: "–" }));
  }

  // Punkte-Vorschau pro Platz
  const result = ranking.map((r, i) => {
    const placement = i + 1;
    const raw = cfg[String(placement)];
    const coins   = raw === undefined ? 0 : typeof raw === "number" ? raw : (raw.coins  ?? 0);
    const rankPts = raw === undefined ? 0 : typeof raw === "number" ? 0   : (raw.points ?? 0);
    const user = userMap.get(r.userId);
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

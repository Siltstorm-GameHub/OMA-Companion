import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

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
    },
  });

  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const cfg: Record<string, number | { coins: number; points: number }> =
    event.pointsConfig ? JSON.parse(event.pointsConfig) : {};

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
          const s = JSON.parse(entry.statsJson) as Record<string, number>;
          for (const [k, v] of Object.entries(s)) t.stats[k] = (t.stats[k] ?? 0) + v;
        }
      }
    }

    if (format === "avg_stats") {
      const averaged = [...totals.values()].map(t => {
        const fieldAvgs = fields.map(f => (t.rounds > 0 ? (t.stats[f] ?? 0) / t.rounds : 0));
        const combined  = fields.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / fields.length : 0;
        return { userId: t.userId, combined, rounds: t.rounds };
      });

      const sorted = averaged.sort((a, b) => b.combined - a.combined);

      ranking = sorted.map(t => {
        const display = t.combined % 1 === 0 ? String(t.combined) : t.combined.toFixed(2);
        return {
          userId: t.userId,
          score:  Math.round(t.combined * 100) / 100,
          label:  `Ø ${display} (${t.rounds}R)`,
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
    const pts = new Map<string, number>();
    for (const match of event.matches) {
      const p1 = match.player1Id; const p2 = match.player2Id;
      if (!p1 || !p2) continue;
      if (!pts.has(p1)) pts.set(p1, 0);
      if (!pts.has(p2)) pts.set(p2, 0);
      if (!userMap.has(p1)) userMap.set(p1, { id: p1, name: null, username: null, image: null });
      if (!userMap.has(p2)) userMap.set(p2, { id: p2, name: null, username: null, image: null });
      if (match.winnerId === p1)       { pts.set(p1, pts.get(p1)! + 3); }
      else if (match.winnerId === p2)  { pts.set(p2, pts.get(p2)! + 3); }
      else if (match.score1 !== null && match.score2 !== null && match.score1 === match.score2) {
        pts.set(p1, pts.get(p1)! + 1); pts.set(p2, pts.get(p2)! + 1);
      }
    }
    ranking = [...userMap.keys()]
      .map(uid => ({ userId: uid, score: pts.get(uid) ?? 0, label: `${pts.get(uid) ?? 0} Pkt.` }))
      .sort((a, b) => b.score - a.score);

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
    const raw     = cfg[String(placement)];
    const coins   = raw === undefined ? 0 : typeof raw === "number" ? raw : (raw.coins  ?? 0);
    const rankPts = raw === undefined ? 0 : typeof raw === "number" ? 0  : (raw.points ?? 0);
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

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/app/api/tournaments/route";

// Gesamtranking für FFA/coop_stats berechnen: Stats über alle Matches summieren,
// dann nach erstem Stat-Feld absteigend sortieren (weitere Felder als Tiebreaker)
async function calcFfaRanking(tournamentId: string, statFields: string[]) {
  const matches = await prisma.match.findMany({
    where: { tournamentId, playedAt: { not: null } },
    include: { entries: true },
  });

  const totals = new Map<string, { userId: string; stats: Record<string, number> }>();
  for (const match of matches) {
    for (const entry of match.entries) {
      if (!entry.userId) continue;
      if (!totals.has(entry.userId)) totals.set(entry.userId, { userId: entry.userId, stats: {} });
      const t = totals.get(entry.userId)!;
      if (entry.statsJson) {
        const s = JSON.parse(entry.statsJson) as Record<string, number>;
        for (const [k, v] of Object.entries(s)) {
          t.stats[k] = (t.stats[k] ?? 0) + v;
        }
      }
    }
  }

  return [...totals.values()].sort((a, b) => {
    for (const f of statFields) {
      const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const { status, pointsConfig, statFields, generateMatches, finalRanking } = await req.json();

  // Auto-generate round-robin matches from existing participants
  if (generateMatches === "round_robin") {
    const existing = await prisma.match.count({ where: { tournamentId: id } });
    if (existing > 0) {
      return NextResponse.json({ error: "Es existieren bereits Matches. Zuerst alle löschen." }, { status: 409 });
    }
    const participants = await prisma.tournamentParticipant.findMany({
      where: { tournamentId: id },
      select: { userId: true },
    });
    if (participants.length < 2) {
      return NextResponse.json({ error: "Mindestens 2 Teilnehmer benötigt." }, { status: 400 });
    }
    const matchData = generateRoundRobin(participants.map(p => p.userId), id);
    await prisma.match.createMany({ data: matchData });
    return NextResponse.json({ generated: matchData.length });
  }

  const existing = await prisma.tournament.findUnique({
    where: { id },
    select: { format: true, statFields: true, pointsConfig: true, status: true },
  });

  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(status       !== undefined && { status }),
      ...(pointsConfig !== undefined && { pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null }),
      ...(statFields   !== undefined && { statFields:   statFields   ? JSON.stringify(statFields)   : null }),
    },
  });

  // Punkte vergeben wenn Status → "finished" und finalRanking übergeben wurde
  if (status === "finished" && existing?.status !== "finished" && finalRanking && Array.isArray(finalRanking)) {
    const cfgRaw = existing?.pointsConfig ?? tournament.pointsConfig;
    const cfg = cfgRaw ? JSON.parse(cfgRaw) as Record<string, number | { coins: number; points: number }> : null;

    for (let i = 0; i < (finalRanking as string[]).length; i++) {
      const userId    = (finalRanking as string[])[i];
      const placement = i + 1;
      const raw       = cfg?.[String(placement)];
      if (!raw) continue;
      const coins   = typeof raw === "number" ? raw : (raw.coins  ?? 0);
      const rankPts = typeof raw === "number" ? 0   : (raw.points ?? 0);
      if (coins <= 0 && rankPts <= 0) continue;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data:  { points: { increment: coins }, ...(rankPts > 0 && { rankPoints: { increment: rankPts } }) },
        }),
        prisma.pointTransaction.create({
          data: { userId, amount: coins, reason: `Platz ${placement} beim Turnier` },
        }),
      ]);
    }
  }

  return NextResponse.json(tournament);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { eventId: true },
  });
  if (!tournament) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Delete in dependency order; MatchEntry cascades from Match, TeamMember from Team
  await prisma.match.deleteMany({ where: { tournamentId: id } });
  await prisma.team.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: id } });
  await prisma.tournament.delete({ where: { id } });

  await prisma.event.update({
    where: { id: tournament.eventId },
    data: { status: "open", type: "community" },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/app/api/tournaments/route";
import { announceTournamentResult } from "@/lib/discord-notify";

// Gesamtranking für FFA/coop_stats/avg_stats berechnen
async function calcFfaRanking(tournamentId: string, statFields: string[], format: string) {
  const matches = await prisma.match.findMany({
    where: { tournamentId, playedAt: { not: null } },
    include: { entries: true },
  });

  const totals = new Map<string, { userId: string; stats: Record<string, number>; rounds: number }>();
  for (const match of matches) {
    for (const entry of match.entries) {
      if (!entry.userId) continue;
      if (!totals.has(entry.userId)) totals.set(entry.userId, { userId: entry.userId, stats: {}, rounds: 0 });
      const t = totals.get(entry.userId)!;
      t.rounds += 1;
      if (entry.statsJson) {
        const s = JSON.parse(entry.statsJson) as Record<string, number>;
        for (const [k, v] of Object.entries(s)) {
          t.stats[k] = (t.stats[k] ?? 0) + v;
        }
      }
    }
  }

  if (format === "avg_stats") {
    return [...totals.values()]
      .map(t => {
        const fieldAvgs = statFields.map(f => (t.rounds > 0 ? (t.stats[f] ?? 0) / t.rounds : 0));
        const combined  = statFields.length > 0 ? fieldAvgs.reduce((s, v) => s + v, 0) / statFields.length : 0;
        return { userId: t.userId, stats: t.stats, rounds: t.rounds, combined };
      })
      .sort((a, b) => b.combined - a.combined);
  }

  return [...totals.values()].sort((a, b) => {
    for (const f of statFields) {
      const diff = (b.stats[f] ?? 0) - (a.stats[f] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

/** Punkte-Konfiguration parsen → { coins, rankPts } pro Platzierung */
function parsePlacementPts(
  cfg: Record<string, number | { coins: number; points: number }> | null,
  placement: number
): { coins: number; rankPts: number } {
  const raw = cfg?.[String(placement)];
  if (!raw) return { coins: 0, rankPts: 0 };
  if (typeof raw === "number") return { coins: raw, rankPts: raw }; // Zahl = gilt für beides
  return { coins: raw.coins ?? 0, rankPts: raw.points ?? 0 };
}

/** Punkte für eine Reihenfolge von UserIds vergeben (increment) */
async function awardPoints(
  ranking: string[],
  cfg: Record<string, number | { coins: number; points: number }> | null,
  tournamentLabel: string,
  direction: 1 | -1 = 1
) {
  for (let i = 0; i < ranking.length; i++) {
    const userId    = ranking[i];
    const placement = i + 1;
    const { coins, rankPts } = parsePlacementPts(cfg, placement);
    if (coins <= 0 && rankPts <= 0) continue;

    const deltaCoins = coins   * direction;
    const deltaRank  = rankPts * direction;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(deltaCoins !== 0 && { points:     { increment: deltaCoins } }),
          ...(deltaRank  !== 0 && { rankPoints: { increment: deltaRank  } }),
        },
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          amount: deltaCoins,
          reason: direction === 1
            ? `Platz ${placement} beim Turnier (${tournamentLabel})`
            : `Korrektur Platz ${placement} – Turnier (${tournamentLabel})`,
        },
      }),
    ]);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json();
  const { status, pointsConfig, statFields, generateMatches, finalRanking, finalRankingNote } = body;

  // Auto-generate round-robin matches
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

  // Aktuellen DB-Zustand VORHER lesen (brauchen wir für Punkte-Rückabwicklung)
  const existing = await prisma.tournament.findUnique({
    where: { id },
    select: {
      format:           true,
      statFields:       true,
      pointsConfig:     true,
      status:           true,
      finalRankingJson: true,
      event:            { select: { title: true, game: true, discordChannelId: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Tournament updaten
  const tournament = await prisma.tournament.update({
    where: { id },
    data: {
      ...(status           !== undefined && { status }),
      ...(pointsConfig     !== undefined && { pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null }),
      ...(statFields       !== undefined && { statFields:   statFields   ? JSON.stringify(statFields)   : null }),
      ...(finalRanking     !== undefined && Array.isArray(finalRanking) && { finalRankingJson: JSON.stringify(finalRanking) }),
      ...(finalRankingNote !== undefined && { finalRankingNote: finalRankingNote?.trim() || null }),
    },
  });

  // ── Punkte-Logik ────────────────────────────────────────────────────────────
  const newRanking: string[] | null =
    finalRanking && Array.isArray(finalRanking) ? finalRanking : null;

  const isBecomingFinished = status === "finished" && existing.status !== "finished";
  const isAlreadyFinished  = existing.status === "finished";

  // Punkte vergeben wenn Turnier abgeschlossen wird/ist UND eine Platzierung vorliegt
  if (newRanking && (isBecomingFinished || isAlreadyFinished)) {
    const eventTitle  = existing.event?.title ?? id;

    // Punkte-Config: bevorzuge die neu übergebene, sonst die gespeicherte
    const cfgRaw: Record<string, number | { coins: number; points: number }> | null =
      pointsConfig
        ? (typeof pointsConfig === "string" ? JSON.parse(pointsConfig) : pointsConfig)
        : existing.pointsConfig
          ? JSON.parse(existing.pointsConfig)
          : null;

    // 1. Alte Punkte rückgängig machen (wenn vorher schon eine Platzierung vergeben war)
    if (isAlreadyFinished && existing.finalRankingJson) {
      const oldRanking = JSON.parse(existing.finalRankingJson) as string[];
      await awardPoints(oldRanking, cfgRaw, eventTitle, -1); // direction = -1 → Abziehen
    }

    // 2. Neue Punkte vergeben
    await awardPoints(newRanking, cfgRaw, eventTitle, 1);

    // Discord-Ankündigung des Turnierergebnisses (fire-and-forget)
    if (isBecomingFinished) {
      announceTournamentResult({
        tournamentId:     id,
        eventTitle,
        finalRanking:     newRanking,
        cfgRaw,
        format:           existing.format,
        game:             existing.event?.game ?? null,
        discordChannelId: existing.event?.discordChannelId ?? null,
      }).catch(() => {});
    }
  }

  return NextResponse.json(tournament);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where:  { id },
    select: { eventId: true, status: true, finalRankingJson: true, pointsConfig: true, event: { select: { title: true } } },
  });
  if (!tournament) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Punkte zurückbuchen falls Turnier bereits abgeschlossen war
  if (tournament.status === "finished" && tournament.finalRankingJson) {
    const oldRanking = JSON.parse(tournament.finalRankingJson) as string[];
    const cfgRaw = tournament.pointsConfig ? JSON.parse(tournament.pointsConfig) : null;
    await awardPoints(oldRanking, cfgRaw, tournament.event?.title ?? id, -1);
  }

  await prisma.match.deleteMany({ where: { tournamentId: id } });
  await prisma.team.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentParticipant.deleteMany({ where: { tournamentId: id } });
  await prisma.tournament.delete({ where: { id } });

  await prisma.event.update({
    where: { id: tournament.eventId },
    data:  { status: "open", type: "community" },
  });

  return NextResponse.json({ ok: true });
}

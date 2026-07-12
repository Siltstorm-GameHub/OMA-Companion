import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateRoundRobin } from "@/app/api/tournaments/route";
import { resolveEventPredictions } from "@/lib/predictions";

// Gesamtranking für FFA/coop_stats/avg_stats berechnen
async function calcFfaRanking(eventId: string, statFields: string[], format: string) {
  const matches = await prisma.match.findMany({
    where: { eventId, playedAt: { not: null } },
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
  if (typeof raw === "number") return { coins: raw, rankPts: raw };
  return { coins: raw.coins ?? 0, rankPts: raw.points ?? 0 };
}

/** Punkte für eine Reihenfolge von UserIds vergeben (increment) */
async function awardPoints(
  ranking: string[],
  cfg: Record<string, number | { coins: number; points: number }> | null,
  eventLabel: string,
  direction: 1 | -1 = 1
) {
  for (let i = 0; i < ranking.length; i++) {
    const userId    = ranking[i];
    const placement = i + 1;
    const { coins, rankPts } = parsePlacementPts(cfg, placement);
    if (coins <= 0 && rankPts <= 0) continue;

    const deltaCoins = coins   * direction;
    const deltaRank  = rankPts * direction;

    const baseReason = direction === 1
      ? `Platz ${placement} beim Turnier (${eventLabel})`
      : `Korrektur Platz ${placement} – Turnier (${eventLabel})`;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(deltaCoins !== 0 && { points:     { increment: deltaCoins } }),
          ...(deltaRank  !== 0 && { rankPoints: { increment: deltaRank  } }),
        },
      }),
      ...(deltaCoins !== 0 ? [prisma.pointTransaction.create({
        data: { userId, amount: deltaCoins, reason: `[Münzen] ${baseReason}` },
      })] : []),
      ...(deltaRank !== 0 ? [prisma.pointTransaction.create({
        data: { userId, amount: deltaRank, reason: `[Rang-Punkte] ${baseReason}` },
      })] : []),
    ]);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  // [id] ist jetzt die Event.id
  const { id: eventId } = await params;
  const body = await req.json();
  const { status, format, pointsConfig, statFields, generateMatches, finalRanking, finalRankingNote } = body;

  // Auto-generate round-robin matches
  if (generateMatches === "round_robin") {
    const existing = await prisma.match.count({ where: { eventId } });
    if (existing > 0) {
      return NextResponse.json({ error: "Es existieren bereits Matches. Zuerst alle löschen." }, { status: 409 });
    }
    const participants = await prisma.tournamentParticipant.findMany({
      where: { eventId },
      select: { userId: true },
    });
    if (participants.length < 2) {
      return NextResponse.json({ error: "Mindestens 2 Teilnehmer benötigt." }, { status: 400 });
    }
    const matchData = generateRoundRobin(participants.map(p => p.userId), eventId);
    await prisma.match.createMany({ data: matchData });
    return NextResponse.json({ generated: matchData.length });
  }

  // Aktuellen DB-Zustand VORHER lesen
  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      format:           true,
      statFields:       true,
      pointsConfig:     true,
      tournamentStatus: true,
      finalRankingJson: true,
      title:            true,
      game:             true,
      discordChannelId: true,
    },
  });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Event updaten (Turnier-Felder)
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(status           !== undefined && { tournamentStatus: status }),
      ...(format           !== undefined && { format }),
      ...(pointsConfig     !== undefined && { pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null }),
      ...(statFields       !== undefined && { statFields:   statFields   ? JSON.stringify(statFields)   : null }),
      ...(finalRanking     !== undefined && Array.isArray(finalRanking) && { finalRankingJson: JSON.stringify(finalRanking) }),
      ...(finalRankingNote !== undefined && { finalRankingNote: finalRankingNote?.trim() || null }),
    },
  });

  // ── Punkte-Logik ────────────────────────────────────────────────────────────
  const newRanking: string[] | null =
    finalRanking && Array.isArray(finalRanking) ? finalRanking : null;

  const isBecomingFinished  = status === "finished" && existing.tournamentStatus !== "finished";
  const isAlreadyFinished   = existing.tournamentStatus === "finished";
  // Only award placement points when:
  // • becoming finished for the first time, OR
  // • re-editing an already-confirmed ranking (reverse old + award new)
  // NOT when finalRankingJson is null but tournamentStatus is already finished
  // (single_elimination auto-awards TOURNAMENT_WIN via the matches handler)
  const hasExistingRanking  = existing.finalRankingJson !== null;

  if (newRanking && (isBecomingFinished || (isAlreadyFinished && hasExistingRanking))) {
    const eventTitle = existing.title ?? eventId;

    const cfgRaw: Record<string, number | { coins: number; points: number }> | null =
      pointsConfig
        ? (typeof pointsConfig === "string" ? JSON.parse(pointsConfig) : pointsConfig)
        : existing.pointsConfig
          ? JSON.parse(existing.pointsConfig)
          : null;

    let oldWinnerId: string | null = null;
    if (isAlreadyFinished && existing.finalRankingJson) {
      const oldRanking = JSON.parse(existing.finalRankingJson) as string[];
      oldWinnerId = oldRanking[0] ?? null;
      await awardPoints(oldRanking, cfgRaw, eventTitle, -1);
    }

    await awardPoints(newRanking, cfgRaw, eventTitle, 1);

    const newWinnerId = newRanking[0] ?? null;

    // Vorhersagen auswerten — beim ersten Abschluss, oder erneut beim Re-Edit, falls sich der
    // Sieger nachträglich geändert hat (Pott wird automatisch zurückgebucht und neu verteilt).
    if (isBecomingFinished || (isAlreadyFinished && hasExistingRanking && oldWinnerId !== newWinnerId)) {
      try {
        await resolveEventPredictions(eventId, newWinnerId);
      } catch (err) {
        console.error("[Predictions] Auswertung fehlgeschlagen:", err);
      }
    }
  }

  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: eventId } = await params;

  const event = await prisma.event.findUnique({
    where:  { id: eventId },
    select: { tournamentStatus: true, finalRankingJson: true, pointsConfig: true, title: true },
  });
  if (!event) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Punkte zurückbuchen falls Turnier bereits abgeschlossen war
  if (event.tournamentStatus === "finished" && event.finalRankingJson) {
    const oldRanking = JSON.parse(event.finalRankingJson) as string[];
    const cfgRaw = event.pointsConfig ? JSON.parse(event.pointsConfig) : null;
    await awardPoints(oldRanking, cfgRaw, event.title ?? eventId, -1);
  }

  // Turnier-Daten aus Event entfernen, zugehörige Matches/Teams/Participants löschen
  await prisma.match.deleteMany({ where: { eventId } });
  await prisma.team.deleteMany({ where: { eventId } });
  await prisma.tournamentParticipant.deleteMany({ where: { eventId } });

  await prisma.event.update({
    where: { id: eventId },
    data: {
      format: null, tournamentStatus: null, pointsConfig: null,
      statFields: null, finalRankingJson: null, finalRankingNote: null,
      status: "open", type: "community",
    },
  });

  return NextResponse.json({ ok: true });
}

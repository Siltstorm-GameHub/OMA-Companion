import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrEventSquadCaptain, hasMinRole } from "@/lib/roles";
import { capMatchResultPoints } from "@/lib/captain-reward-limits";
import { prisma } from "@/lib/prisma";
import { generateBracket, generateRoundRobin } from "@/lib/tournaments/generate";
import { prepareTournamentPool } from "@/lib/tournaments/participants";
import { ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";
import { GROUP_STAGE_ACTIONS, runGroupStageAction } from "@/lib/tournaments/groupStageServer";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [id] ist jetzt die Event.id
  const { id: eventId } = await params;
  const currentUser = await requireModeratorOrEventSquadCaptain(eventId);
  const body = await req.json();
  // Squad-Captains: Münzen pro Match-Ergebnis auf die Obergrenze kappen (captain-reward-limits.ts)
  if (!hasMinRole(currentUser.role, "moderator")) body.pointsConfig = capMatchResultPoints(body.pointsConfig);
  const { status, format, pointsConfig, statFields, statConfig, generateMatches, finalRanking, finalRankingNote } = body;

  // Gruppenphase + K.O.: Gruppen auslosen / K.O.-Runde erzeugen / jeweils zurücksetzen
  if (GROUP_STAGE_ACTIONS.includes(generateMatches)) {
    try {
      return NextResponse.json(await runGroupStageAction(eventId, generateMatches, body));
    } catch (err) {
      if (err instanceof ApplyMatchResultError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  }

  // Auto-generate: K.O.-Baum, Liga (round_robin) bzw. Hin-/Rückrunde (liga). Ausgelost werden die
  // angemeldeten Spieler (bei aktivem Check-in nur Eingecheckte) + direkt eingetragene Teilnehmer.
  if (generateMatches === "single_elimination" || generateMatches === "round_robin" || generateMatches === "liga") {
    const existing = await prisma.match.count({ where: { eventId } });
    if (existing > 0) {
      return NextResponse.json({ error: "Es existieren bereits Matches. Zuerst alle löschen." }, { status: 409 });
    }
    const { ids: participantIds, notCheckedIn } = await prepareTournamentPool(eventId);
    if (participantIds.length < 2) {
      return NextResponse.json({
        error: "Mindestens 2 Teilnehmer benötigt." + (notCheckedIn > 0 ? ` (${notCheckedIn} angemeldete Spieler sind nicht eingecheckt.)` : ""),
      }, { status: 400 });
    }
    let matchData;
    if (generateMatches === "single_elimination") {
      matchData = generateBracket(participantIds, eventId);
    } else if (generateMatches === "liga") {
      const hinrunde   = generateRoundRobin(participantIds, eventId);
      const maxRound   = hinrunde.length ? Math.max(...hinrunde.map(m => m.round)) : 0;
      const rueckrunde = generateRoundRobin([...participantIds].reverse(), eventId).map(m => ({
        ...m,
        round: m.round + maxRound,
      }));
      matchData = [...hinrunde, ...rueckrunde];
    } else {
      matchData = generateRoundRobin(participantIds, eventId);
    }
    await prisma.match.createMany({ data: matchData });
    return NextResponse.json({ generated: matchData.length });
  }

  // Event muss existieren
  const existing = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Event updaten (Turnier-Felder)
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      ...(status           !== undefined && { tournamentStatus: status }),
      ...(format           !== undefined && { format }),
      ...(pointsConfig     !== undefined && { pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null }),
      ...(statFields       !== undefined && { statFields:   statFields   ? JSON.stringify(statFields)   : null }),
      ...(statConfig       !== undefined && { statConfigJson: statConfig ? JSON.stringify(statConfig) : null }),
      ...(finalRanking     !== undefined && Array.isArray(finalRanking) && { finalRankingJson: JSON.stringify(finalRanking) }),
      ...(finalRankingNote !== undefined && { finalRankingNote: finalRankingNote?.trim() || null }),
    },
  });

  // Platzierungsbelohnungen und Tipp-Auswertung laufen ausschließlich über den Event-Abschluss
  // (/api/admin/events/[id]/complete, Event.placementRewardsJson) — hier wird bewusst nichts
  // ausgezahlt, damit es nur eine Belohnungsquelle gibt.
  return NextResponse.json(event);
}

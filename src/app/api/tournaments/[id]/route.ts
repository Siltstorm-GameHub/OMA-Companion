import { NextRequest, NextResponse } from "next/server";
import { notifyNotDrawn } from "@/lib/checkin-notify";
import { gameVoteDrawBlock } from "@/lib/game-vote/service";
import { requireEventManager, hasMinRole } from "@/lib/roles";
import { capMatchResultPoints } from "@/lib/captain-reward-limits";
import { prisma } from "@/lib/prisma";
import { bracketFromSlots, generateBracket, generateRoundRobin, shuffle } from "@/lib/tournaments/generate";
import { orderBySeed, parseSeeding, seededBracketSlots, tooFewPlayersMessage } from "@/lib/tournaments/draw-plan";
import { markDrawn, rankScores, resetDraw, withDrawLock } from "@/lib/tournaments/draw";
import { notifyDrawResult } from "@/lib/tournaments/drawNotifications";
import { prepareTournamentPool } from "@/lib/tournaments/participants";
import { planSchedule } from "@/lib/tournaments/schedule";
import { ApplyMatchResultError } from "@/lib/tournaments/applyMatchResult";
import { GROUP_STAGE_ACTIONS, runGroupStageAction } from "@/lib/tournaments/groupStageServer";
import { withSanitizedGoal } from "@/lib/community-goal";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // [id] ist jetzt die Event.id
  const { id: eventId } = await params;
  const currentUser = await requireEventManager(eventId);
  const body = await req.json();
  // Squad-Captains: Münzen pro Match-Ergebnis auf die Obergrenze kappen (captain-reward-limits.ts)
  if (!hasMinRole(currentUser.role, "moderator")) body.pointsConfig = capMatchResultPoints(body.pointsConfig);
  const { status, format, pointsConfig, statFields, generateMatches, finalRanking, finalRankingNote } = body;
  // Community-Ziel in statConfig prüfen (nur Skill-Index, nur vorhandene Stat-Felder), siehe lib/community-goal.ts.
  // Ohne format im Body wird nur gegen die Stat-Felder geprüft — das Ziel wird ohnehin nur bei coop_stats angezeigt.
  const statConfig = withSanitizedGoal(body.statConfig, format === undefined ? "coop_stats" : format, statFields);

  // Spielwahl: keine Auslosung, solange das Spiel gewählt wird bzw. die Regeln nicht freigegeben sind
  if ((GROUP_STAGE_ACTIONS.includes(generateMatches) && generateMatches !== "reset_groups" && generateMatches !== "reset_knockout") || generateMatches === "single_elimination" || generateMatches === "round_robin" || generateMatches === "liga") {
    const block = await gameVoteDrawBlock(eventId);
    if (block) return NextResponse.json({ error: block }, { status: 409 });
  }

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

  // Terminplanung: Startzeit + Abstand je Spieltag/Runde → alle (noch nicht terminierten) Matches
  if (generateMatches === "schedule") {
    const startAt = new Date(body.startAt);
    const interval = Math.round(Number(body.intervalMinutes));
    if (isNaN(startAt.getTime())) return NextResponse.json({ error: "Ungültige Startzeit" }, { status: 400 });
    if (!Number.isFinite(interval) || interval < 5 || interval > 7 * 24 * 60) {
      return NextResponse.json({ error: "Abstand muss zwischen 5 Minuten und 7 Tagen liegen" }, { status: 400 });
    }
    const matches = await prisma.match.findMany({
      where: { eventId },
      select: {
        id: true, round: true, groupIndex: true, leg: true, player1Id: true, player2Id: true, winnerId: true,
        scheduledAt: true, _count: { select: { entries: true } },
      },
    });
    const plan = planSchedule(
      matches.map(m => ({ ...m, entryCount: m._count.entries })), startAt, interval, body.overwrite === true,
    );
    await prisma.$transaction(plan.map(p => prisma.match.update({ where: { id: p.id }, data: { scheduledAt: p.scheduledAt } })));
    return NextResponse.json({ scheduled: plan.length });
  }

  // Auslosung zurücksetzen (K.O.-Baum, Liga, Jeder gegen jeden) — nur vor dem ersten Ergebnis.
  // Gruppenphase hat dafür "reset_groups".
  if (generateMatches === "reset_draw") {
    try {
      return NextResponse.json(await resetDraw(eventId));
    } catch (err) {
      if (err instanceof ApplyMatchResultError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }
  }

  // Auslosung: K.O.-Baum, Liga (round_robin) bzw. Hin-/Rückrunde (liga). Ausgelost werden die
  // angemeldeten Spieler (bei aktivem Check-in nur Bereite) + direkt eingetragene Teilnehmer.
  // Unter der Anmelde-Sperre (lib/tournaments/draw.ts): kein doppelter Baum, keine Anmeldung dazwischen.
  if (generateMatches === "single_elimination" || generateMatches === "round_robin" || generateMatches === "liga") {
    const seeding = parseSeeding(body.seeding);
    let drawn: { ids: string[]; generated: number };
    try {
      drawn = await withDrawLock(eventId, async (tx) => {
        if (await tx.match.count({ where: { eventId } }) > 0) {
          throw new ApplyMatchResultError("Das Turnier ist schon ausgelost. Zum Neu-Auslosen erst „Auslosung zurücksetzen“.", 409);
        }
        const { ids, notCheckedIn } = await prepareTournamentPool(eventId, tx);
        if (ids.length < 2) throw new ApplyMatchResultError(tooFewPlayersMessage(ids.length, notCheckedIn), 400);
        let matchData;
        if (generateMatches === "single_elimination") {
          matchData = seeding === "rank"
            ? bracketFromSlots(seededBracketSlots(orderBySeed(ids, await rankScores(ids, tx))), eventId)
            : generateBracket(ids, eventId);
        } else {
          // Gemischt: sonst bestimmt die Anmelde-Reihenfolge den Spielplan (wer zuerst kam, hat immer denselben Platz)
          const order = shuffle(ids);
          const hinrunde = generateRoundRobin(order, eventId);
          if (generateMatches === "liga") {
            const maxRound   = hinrunde.length ? Math.max(...hinrunde.map(m => m.round)) : 0;
            // Rückrunde: dieselben Paarungen mit getauschtem Heimrecht
            const rueckrunde = hinrunde.map(m => ({ ...m, round: m.round + maxRound, player1Id: m.player2Id, player2Id: m.player1Id }));
            matchData = [...hinrunde, ...rueckrunde];
          } else {
            matchData = hinrunde;
          }
        }
        await tx.match.createMany({ data: matchData });
        await markDrawn(tx, eventId);
        return { ids, generated: matchData.length };
      });
    } catch (err) {
      if (err instanceof ApplyMatchResultError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }
    // Wer nicht bereit war und fehlt, erfährt es; alle Ausgelosten bekommen ihren Einstieg (erster Gegner/Freilos)
    await notifyNotDrawn(eventId, drawn.ids);
    notifyDrawResult(eventId);
    return NextResponse.json({ generated: drawn.generated, players: drawn.ids.length });
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

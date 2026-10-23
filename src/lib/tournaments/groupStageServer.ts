import { prisma } from "@/lib/prisma";
import { ApplyMatchResultError } from "./applyMatchResult";
import {
  GROUP_KNOCKOUT_FORMAT, computeGroupStandings, drawGroups, generateGroupMatches, generateKnockoutMatches,
  groupMembers, parseGroupStageConfig, resolveGroupCount, validateGroupStageConfig, type GroupStageConfig,
} from "./groupStage";

export type GroupStageAction = "groups" | "reset_groups" | "knockout" | "reset_knockout";

export const GROUP_STAGE_ACTIONS: GroupStageAction[] = ["groups", "reset_groups", "knockout", "reset_knockout"];

/**
 * Admin-Aktionen des Formats group_knockout (aufgerufen aus PATCH /api/tournaments/[id] mit
 * generateMatches = Aktion). Wirft ApplyMatchResultError mit passendem HTTP-Status.
 *
 *  - groups:         Gruppen auslosen + alle Gruppenspiele anlegen (nur solange es keine Matches gibt)
 *  - reset_groups:   Auslosung verwerfen (nur solange noch kein Match ein Ergebnis hat)
 *  - knockout:       K.O.-Runde aus den Abschlusstabellen erzeugen (alle Gruppenspiele bestätigt)
 *  - reset_knockout: K.O.-Runde verwerfen (nur solange dort noch kein Match gespielt wurde)
 */
export async function runGroupStageAction(
  eventId: string,
  action: GroupStageAction,
  input: { groupCount?: unknown; advancePerGroup?: unknown },
): Promise<{ generated?: number; deleted?: number }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      format: true,
      groupStageJson: true,
      participants: { select: { userId: true, groupIndex: true, seed: true }, orderBy: { seed: "asc" } },
      matches: { select: { id: true, groupIndex: true, playedAt: true, resultConfirmed: true, player1Id: true, player2Id: true, winnerId: true, score1: true, score2: true } },
    },
  });
  if (!event) throw new ApplyMatchResultError("Nicht gefunden", 404);
  if (event.format !== GROUP_KNOCKOUT_FORMAT) {
    throw new ApplyMatchResultError("Nur für das Format „Gruppenphase + K.O.“ verfügbar.", 400);
  }

  const groupMatches    = event.matches.filter(m => m.groupIndex != null);
  const knockoutMatches = event.matches.filter(m => m.groupIndex == null);

  if (action === "groups") {
    if (event.matches.length > 0) {
      throw new ApplyMatchResultError("Es existieren bereits Matches. Zuerst die Auslosung zurücksetzen.", 409);
    }
    const cfg: GroupStageConfig = { groupCount: Number(input.groupCount), advancePerGroup: Number(input.advancePerGroup) };
    const ids = event.participants.map(p => p.userId);
    const error = validateGroupStageConfig(ids.length, cfg);
    if (error) throw new ApplyMatchResultError(error, 400);

    const groups = drawGroups(ids, cfg.groupCount);
    const matches = generateGroupMatches(groups, eventId);
    await prisma.$transaction([
      ...groups.flatMap((members, groupIndex) => members.length
        ? [prisma.tournamentParticipant.updateMany({ where: { eventId, userId: { in: members } }, data: { groupIndex } })]
        : []),
      prisma.match.createMany({ data: matches }),
      prisma.event.update({ where: { id: eventId }, data: { groupStageJson: JSON.stringify(cfg) } }),
    ]);
    return { generated: matches.length };
  }

  if (action === "reset_groups") {
    if (event.matches.some(m => m.playedAt)) {
      throw new ApplyMatchResultError("Es wurden bereits Ergebnisse eingetragen — die Auslosung kann nicht mehr zurückgesetzt werden.", 409);
    }
    const [deleted] = await prisma.$transaction([
      prisma.match.deleteMany({ where: { eventId } }),
      prisma.tournamentParticipant.updateMany({ where: { eventId }, data: { groupIndex: null } }),
      prisma.event.update({ where: { id: eventId }, data: { groupStageJson: null } }),
    ]);
    return { deleted: deleted.count };
  }

  if (action === "knockout") {
    if (knockoutMatches.length > 0) {
      throw new ApplyMatchResultError("Die K.O.-Runde existiert bereits.", 409);
    }
    if (groupMatches.length === 0) {
      throw new ApplyMatchResultError("Es gibt noch keine Gruppenspiele.", 400);
    }
    const open = groupMatches.filter(m => !m.playedAt || !m.resultConfirmed).length;
    if (open > 0) {
      throw new ApplyMatchResultError(`Noch ${open} Gruppenspiel${open === 1 ? "" : "e"} ohne bestätigtes Ergebnis.`, 400);
    }
    const cfg = parseGroupStageConfig(event.groupStageJson);
    const groupCount = resolveGroupCount(cfg, event.participants);
    const advancePerGroup = cfg?.advancePerGroup ?? 2;
    const standings = computeGroupStandings(groupMembers(event.participants, groupCount), groupMatches);
    if (standings.reduce((n, g) => n + Math.min(g.length, advancePerGroup), 0) < 2) {
      throw new ApplyMatchResultError("Mindestens 2 Spieler müssen die K.O.-Runde erreichen.", 400);
    }
    const matches = generateKnockoutMatches(standings, advancePerGroup, eventId);
    await prisma.match.createMany({ data: matches });
    return { generated: matches.length };
  }

  // reset_knockout
  if (knockoutMatches.some(m => m.playedAt)) {
    throw new ApplyMatchResultError("In der K.O.-Runde wurden bereits Ergebnisse eingetragen — erst diese zurücksetzen.", 409);
  }
  const deleted = await prisma.match.deleteMany({ where: { eventId, groupIndex: null } });
  return { deleted: deleted.count };
}

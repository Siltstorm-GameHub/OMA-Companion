import { prisma } from "@/lib/prisma";
import { notifyNotDrawn } from "@/lib/checkin-notify";
import { ApplyMatchResultError } from "./applyMatchResult";
import { prepareTournamentPool } from "./participants";
import { notifyKnockoutCreated } from "./matchNotifications";
import { markDrawn, rankScores, unmarkDrawn, withDrawLock } from "./draw";
import { orderBySeed, parseSeeding, potGroups, tooFewPlayersMessage } from "./draw-plan";
import { notifyDrawResult } from "./drawNotifications";
import {
  GROUP_KNOCKOUT_FORMAT, computeGroupStandings, drawGroups, generateGroupMatches, generateKnockoutMatches,
  groupMembers, parseGroupStageConfig, resolveGroupCount, validateGroupStageConfig, type GroupStageConfig,
} from "./groupStage";

export type GroupStageAction = "groups" | "reset_groups" | "knockout" | "reset_knockout" | "rebuild_knockout";

export const GROUP_STAGE_ACTIONS: GroupStageAction[] = ["groups", "reset_groups", "knockout", "reset_knockout", "rebuild_knockout"];

/**
 * Admin-Aktionen des Formats group_knockout (aufgerufen aus PATCH /api/tournaments/[id] mit
 * generateMatches = Aktion). Wirft ApplyMatchResultError mit passendem HTTP-Status.
 *
 *  - groups:         Gruppen auslosen + alle Gruppenspiele anlegen (nur solange es keine Matches gibt)
 *  - reset_groups:   Auslosung verwerfen (nur solange noch kein Match ein Ergebnis hat)
 *  - knockout:       K.O.-Runde aus den Abschlusstabellen erzeugen (alle Gruppenspiele bestätigt)
 *  - reset_knockout: K.O.-Runde verwerfen (nur solange dort noch kein Match gespielt wurde)
 *  - rebuild_knockout: beides nacheinander — nach Korrekturen in der Gruppenphase die Setzung neu
 *                    aus den aktuellen Tabellen erzeugen
 */
export async function runGroupStageAction(
  eventId: string,
  action: GroupStageAction,
  input: {
    groupCount?: unknown; advancePerGroup?: unknown; thirdPlaceMatch?: unknown;
    groupLegs?: unknown; knockoutLegs?: unknown; singleLegFinal?: unknown; seeding?: unknown;
  },
): Promise<{ generated?: number; deleted?: number }> {
  if (action === "rebuild_knockout") {
    // Erst prüfen, ob das Neuerstellen klappen würde — sonst wäre die alte K.O.-Runde schon weg
    const open = await prisma.match.count({
      where: { eventId, groupIndex: { not: null }, OR: [{ playedAt: null }, { resultConfirmed: false }] },
    });
    if (open > 0) throw new ApplyMatchResultError(`Noch ${open} Gruppenspiel${open === 1 ? "" : "e"} ohne bestätigtes Ergebnis.`, 400);
    const { deleted } = await runGroupStageAction(eventId, "reset_knockout", input);
    const { generated } = await runGroupStageAction(eventId, "knockout", input);
    return { deleted, generated };
  }
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
    const cfg: GroupStageConfig = {
      groupCount: Number(input.groupCount),
      advancePerGroup: Number(input.advancePerGroup),
      thirdPlaceMatch: input.thirdPlaceMatch === true,
      groupLegs: input.groupLegs === 2 ? 2 : 1,
      knockoutLegs: input.knockoutLegs === 2 ? 2 : 1,
      singleLegFinal: input.singleLegFinal !== false,
    };
    const seeding = parseSeeding(input.seeding);
    // Unter der Anmelde-/Auslosungs-Sperre (draw.ts): kein doppeltes Auslosen, keine Anmeldung dazwischen.
    // Ausgelost werden die angemeldeten Spieler (bei aktivem Check-in nur Bereite) plus von Admins
    // direkt eingetragene Teilnehmer — gemeinsame Quelle aller Generatoren, siehe participants.ts
    const { ids, generated } = await withDrawLock(eventId, async (tx) => {
      if (await tx.match.count({ where: { eventId } }) > 0) {
        throw new ApplyMatchResultError("Die Gruppen sind schon ausgelost. Zum Neu-Auslosen erst „Neu auslosen“.", 409);
      }
      const { ids, notCheckedIn } = await prepareTournamentPool(eventId, tx);
      if (ids.length < 3) throw new ApplyMatchResultError(tooFewPlayersMessage(ids.length, notCheckedIn, 3), 400);
      const error = validateGroupStageConfig(ids.length, cfg);
      if (error) {
        throw new ApplyMatchResultError(
          notCheckedIn > 0 ? `${error} (${notCheckedIn} angemeldete Spieler sind noch nicht bereit.)` : error,
          400,
        );
      }
      // Zufällig oder aus Lostöpfen nach Rangpunkten (starke Spieler auf verschiedene Gruppen)
      const groups = seeding === "rank"
        ? potGroups(orderBySeed(ids, await rankScores(ids, tx)), cfg.groupCount)
        : drawGroups(ids, cfg.groupCount);
      const matches = generateGroupMatches(groups, eventId, cfg.groupLegs);
      for (const [groupIndex, members] of groups.entries()) {
        if (members.length) await tx.tournamentParticipant.updateMany({ where: { eventId, userId: { in: members } }, data: { groupIndex } });
      }
      await tx.match.createMany({ data: matches });
      await tx.event.update({ where: { id: eventId }, data: { groupStageJson: JSON.stringify(cfg) } });
      await markDrawn(tx, eventId);
      return { ids, generated: matches.length };
    });
    // Wer nicht bereit war und fehlt, erfährt es; alle Ausgelosten bekommen Gruppe und ersten Gegner
    await notifyNotDrawn(eventId, ids);
    notifyDrawResult(eventId);
    return { generated };
  }

  if (action === "reset_groups") {
    if (event.matches.some(m => m.playedAt)) {
      throw new ApplyMatchResultError("Es wurden bereits Ergebnisse eingetragen — die Auslosung kann nicht mehr zurückgesetzt werden.", 409);
    }
    const deleted = await withDrawLock(eventId, async (tx) => {
      const d = await tx.match.deleteMany({ where: { eventId } });
      await tx.tournamentParticipant.updateMany({ where: { eventId }, data: { groupIndex: null } });
      await tx.event.update({ where: { id: eventId }, data: { groupStageJson: null } });
      await unmarkDrawn(tx, eventId);
      return d.count;
    });
    return { deleted };
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
    const matches = generateKnockoutMatches(standings, advancePerGroup, eventId, cfg?.thirdPlaceMatch ?? false, {
      legs: cfg?.knockoutLegs ?? 1,
      singleLegFinal: cfg?.singleLegFinal ?? true,
    });
    await prisma.match.createMany({ data: matches });
    await notifyKnockoutCreated(eventId);
    return { generated: matches.length };
  }

  // reset_knockout
  if (knockoutMatches.some(m => m.playedAt)) {
    throw new ApplyMatchResultError("In der K.O.-Runde wurden bereits Ergebnisse eingetragen — erst diese zurücksetzen.", 409);
  }
  const deleted = await prisma.match.deleteMany({ where: { eventId, groupIndex: null } });
  return { deleted: deleted.count };
}

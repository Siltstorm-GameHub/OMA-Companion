import { NextRequest, NextResponse, after } from "next/server";
import { requireEventManager, hasMinRole, getCaptainedSquadIds, canManageSeries } from "@/lib/roles";
import { getCommunityLimits } from "@/lib/community-event-limits";
import { isPresetCover } from "@/lib/event-cover-presets";
import { prisma } from "@/lib/prisma";
import { capCaptainRewardFields, capMatchResultPoints, type RewardLimits } from "@/lib/captain-reward-limits";
import { sanitizeCheckInMinutes } from "@/lib/checkin";
import { publishEvent } from "@/lib/event-publish";
import { revertEventCompletion } from "@/lib/revert-event-completion";
import { deleteEventRecord } from "@/lib/delete-event";
import { generateGemsTournamentBossTeam } from "@/lib/gems/gems-tournament";
import type { NpcDifficulty } from "@/lib/gems/npc-battle-types";
import { BLOCKS_GAME, sanitizeBlocksEventConfig } from "@/lib/blocks/event-config";

const GEMS_DIFFICULTIES: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const {
    eventId, removeUserId, seriesScope, discordChannelId, category, genre, spectatorMode, spectatorRewardJson,
    pollsConfigJson, twitchClipUrl, seriesEventConfigJson, endAt, gemsDifficulty, gemsMaxAttempts,
    gemsMonsterIds, blocks: blocksBody, ...data
  } = body;
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });

  const currentUser = await requireEventManager(eventId);

  if (endAt !== undefined) data.endAt = endAt ? new Date(endAt) : null;
  if (data.endAt) {
    const startAtValue = data.startAt ? new Date(data.startAt) : (await prisma.event.findUnique({ where: { id: eventId }, select: { startAt: true } }))?.startAt;
    if (startAtValue && data.endAt <= startAtValue) {
      return NextResponse.json({ error: "Ende muss nach dem Start liegen" }, { status: 400 });
    }
  }

  // Ersteller/Freigabe werden nie über diesen generischen Pfad geändert (Freigabe: eigene Route
  // /api/admin/events/[id]/approve).
  delete data.createdById;
  delete data.approvalStatus;

  // Nicht-Moderatoren dürfen die Squad-Bindung ihres Events nur auf ein Squad setzen, das sie selbst
  // captainen (nicht entfernen oder auf ein fremdes Squad umbiegen) — sonst könnten sie die
  // Anmeldebeschränkung faktisch aufheben oder ein fremdes Team betreffen.
  const isModerator = hasMinRole(currentUser.role, "moderator");
  if (!isModerator && "squadId" in data) {
    const captainedSquadIds = await getCaptainedSquadIds(currentUser.id);
    if (!data.squadId || !captainedSquadIds.includes(data.squadId)) delete data.squadId;
  }
  // Ebenso darf ein Nicht-Moderator sein Event nur in eine Reihe verschieben, die er selbst verwaltet.
  if (!isModerator && "seriesId" in data && data.seriesId) {
    if (!(await canManageSeries(currentUser, data.seriesId))) delete data.seriesId;
  }
  // Ankündigungskanal und Legacy-Feld pointReward legen nur Mods fest
  if (!isModerator) delete data.pointReward;
  // Cover: Nicht-Moderatoren nur Vorlagen (oder entfernen) — eine eigene URL bleibt unverändert stehen
  if (!isModerator && "coverImageUrl" in data && data.coverImageUrl && !isPresetCover(data.coverImageUrl)) delete data.coverImageUrl;

  // Abgeschlossene Saisons nehmen keine weiteren Termine auf
  if ("seriesId" in data && data.seriesId) {
    const target = await prisma.eventSeries.findUnique({ where: { id: data.seriesId }, select: { status: true } });
    const current = await prisma.event.findUnique({ where: { id: eventId }, select: { seriesId: true } });
    if (target?.status === "archived" && current?.seriesId !== data.seriesId) {
      return NextResponse.json({ error: "Diese Saison ist abgeschlossen — Termine können nicht mehr hinzugefügt werden." }, { status: 409 });
    }
  }

  // Belohnungen — für Nicht-Moderatoren auf die Community-Obergrenzen gekappt: Einzel-Event bzw.
  // Reihen-Termin, je nachdem, wo das Event nach dem Speichern liegt (lib/community-event-limits.ts)
  let rewardLimits: RewardLimits | null = null;
  if (!isModerator) {
    const limits = await getCommunityLimits();
    const targetSeriesId = "seriesId" in data
      ? data.seriesId
      : (await prisma.event.findUnique({ where: { id: eventId }, select: { seriesId: true } }))?.seriesId;
    rewardLimits = targetSeriesId ? limits.seriesEvent : limits.standalone;
  }
  const rewards = rewardLimits
    ? capCaptainRewardFields({ spectatorRewardJson, pollsConfigJson }, rewardLimits)
    : { spectatorRewardJson, pollsConfigJson };
  if (rewardLimits) {
    Object.assign(data, capCaptainRewardFields(data, rewardLimits));
    // Sieg/Unentschieden-Münzen im Liga-Modus (pointsConfig { win, draw })
    if (typeof data.pointsConfig === "string") {
      try { data.pointsConfig = JSON.stringify(capMatchResultPoints(JSON.parse(data.pointsConfig), rewardLimits)); } catch { delete data.pointsConfig; }
    } else if (data.pointsConfig && typeof data.pointsConfig === "object") {
      data.pointsConfig = JSON.stringify(capMatchResultPoints(data.pointsConfig, rewardLimits));
    }
  }

  // Sichtbarkeit / geplante Veröffentlichung
  if ("publishAt" in data) {
    const at = data.publishAt ? new Date(data.publishAt) : null;
    if (at && isNaN(at.getTime())) return NextResponse.json({ error: "Ungültiger Veröffentlichungszeitpunkt" }, { status: 400 });
    data.publishAt = at;
  }
  if ("hidden" in data) {
    data.hidden = data.hidden === true;
    if (!data.hidden) {
      const current = await prisma.event.findUnique({ where: { id: eventId }, select: { hidden: true } });
      if (current?.hidden) {
        // Unsichtbar → sichtbar: jetzt ankündigen (Discord-Event, Kanal-Post, Push) — vorher passierte
        // beim nachträglichen Sichtbarschalten gar nichts. Läuft nach der Antwort; publishEvent prüft
        // selbst, ob das Event dann wirklich sichtbar ist, und überspringt bereits erledigte Schritte.
        data.publishAt = null;
        after(() => publishEvent(eventId));
      }
    }
  }

  if ("checkInEnabled" in data) data.checkInEnabled = data.checkInEnabled === true;
  if ("checkInMinutes" in data) data.checkInMinutes = sanitizeCheckInMinutes(data.checkInMinutes);

  if (twitchClipUrl !== undefined) data.twitchClipUrl = twitchClipUrl || null;
  if (discordChannelId !== undefined && isModerator) data.discordChannelId = discordChannelId;
  if (category !== undefined) data.category = category;
  if (genre !== undefined) data.genre = genre || null;
  if (spectatorMode !== undefined) data.spectatorMode = spectatorMode;
  if (spectatorRewardJson !== undefined) data.spectatorRewardJson = rewards.spectatorRewardJson ? JSON.stringify(rewards.spectatorRewardJson) : null;
  if (pollsConfigJson !== undefined) data.pollsConfigJson = rewards.pollsConfigJson ? JSON.stringify(rewards.pollsConfigJson) : null;
  if (seriesEventConfigJson !== undefined) data.seriesEventConfigJson = seriesEventConfigJson || null;

  // Teilnehmer aus Event entfernen (Moderator-Aktion)
  if (removeUserId) {
    await prisma.eventRegistration.deleteMany({ where: { eventId, userId: removeUserId } });
    return NextResponse.json({ ok: true });
  }

  // Status wird aus einem bereits abgeschlossenen Zustand VOR die Spielphase zurückgesetzt (z.B.
  // "finished"/"umfrage" → "active"/"open"): ALLE vorher vergebenen Punkte/Belohnungen dieses
  // Abschlusses rückgängig machen (inkl. Teilnahme-/Platzierungs-/Zuschauer-Basis-Belohnungen) und
  // completionData löschen, damit sie nicht doppelt vergeben werden, wenn das Event beim nächsten Mal
  // erneut abgeschlossen wird.
  // Ein Wechsel INNERHALB der bereits abgeschlossenen Zustände ("finished" <-> "umfrage") ist davon
  // bewusst ausgenommen — die Spielphase gilt in beiden Fällen weiterhin als abgeschlossen, daher bleibt
  // completionData (inkl. Finaler Platzierung, Begründung und Disqualifikationen) unangetastet erhalten.
  if (data.status !== undefined) {
    const current = await prisma.event.findUnique({ where: { id: eventId }, select: { status: true, completionData: true } });
    const revertsPastGamePhase = data.status === "active" || data.status === "open";
    if (current?.completionData && current.status !== data.status && revertsPastGamePhase) {
      await revertEventCompletion(eventId, { includeBaseRewards: true });
    }
  }

  // Wenn seriesScope === "all", Titel + Beschreibung für alle Events der Reihe übernehmen
  if (seriesScope === "all") {
    const current = await prisma.event.findUnique({ where: { id: eventId }, select: { seriesId: true } });
    if (current?.seriesId) {
      const seriesUpdate: { title?: string; description?: string | null } = {};
      if (data.title       !== undefined) seriesUpdate.title       = data.title;
      if (data.description !== undefined) seriesUpdate.description = data.description;
      if (Object.keys(seriesUpdate).length > 0) {
        await prisma.event.updateMany({
          where: { seriesId: current.seriesId },
          data: seriesUpdate,
        });
      }
      // Weitere Felder (status, pointReward etc.) nur für dieses Event
      const singleFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (!Object.keys(seriesUpdate).includes(k)) singleFields[k] = v;
      }
      if (Object.keys(singleFields).length > 0) {
        await prisma.event.update({ where: { id: eventId }, data: singleFields });
      }
      return NextResponse.json({ ok: true, scope: "all" });
    }
  }

  // OMA Blocks: Challenge braucht ein Ende — vor dem Speichern prüfen (siehe Block unten)
  const blocks = blocksBody !== undefined ? sanitizeBlocksEventConfig(blocksBody, !isModerator) : null;
  if (blocks?.kind === "challenge") {
    const effectiveEnd = endAt !== undefined ? data.endAt : (await prisma.event.findUnique({ where: { id: eventId }, select: { endAt: true } }))?.endAt;
    if (!effectiveEnd) return NextResponse.json({ error: "Eine OMA-Blocks-Challenge braucht ein Ende" }, { status: 400 });
  }

  const event = await prisma.event.update({ where: { id: eventId }, data });

  // OMA-Blocks-Einstellungen (nur bei game "OMA Blocks", siehe EventEditClient.tsx). Die Art lässt sich
  // nicht wechseln; ein Turnier ist nur vor dem Start änderbar, eine Challenge bis zur Abrechnung.
  if (blocks && event.game === BLOCKS_GAME) {
    const [tournament, challenge] = await Promise.all([
      prisma.blocksTournament.findUnique({ where: { eventId }, select: { id: true } }),
      prisma.blocksChallenge.findUnique({ where: { eventId }, select: { id: true } }),
    ]);
    if (tournament) {
      await prisma.blocksTournament.updateMany({
        where: { id: tournament.id, stage: "pending" },
        data: { groupRounds: blocks.groupRounds, finalRounds: blocks.finalRounds, advancePerGroup: blocks.advancePerGroup },
      });
    } else if (challenge) {
      await prisma.blocksChallenge.updateMany({
        where: { id: challenge.id, finalizedAt: null },
        data: {
          metric: blocks.metric,
          goal: blocks.goal,
          minContribution: blocks.minContribution,
          rewardCoins: blocks.rewardCoins,
          rewardRankPoints: blocks.rewardRankPoints,
        },
      });
    } else if (blocks.kind === "tournament") {
      await prisma.blocksTournament.create({
        data: { eventId, groupRounds: blocks.groupRounds, finalRounds: blocks.finalRounds, advancePerGroup: blocks.advancePerGroup },
      });
    } else {
      await prisma.blocksChallenge.create({
        data: {
          eventId,
          metric: blocks.metric,
          goal: blocks.goal,
          minContribution: blocks.minContribution,
          rewardCoins: blocks.rewardCoins,
          rewardRankPoints: blocks.rewardRankPoints,
        },
      });
    }
  }

  // OMA-Gems-Turnier-Einstellungen (nur relevant, wenn dieses Event game === "OMA Gems" ist,
  // siehe EventEditClient.tsx). Boss-Team wird nur neu erzeugt, wenn sich Schwierigkeit oder
  // Monster-Auswahl ändert UND noch keine Versuche existieren — sonst bleiben laufende
  // Angriffe fair vergleichbar.
  // gemsDifficulty wird nur mitgeschickt, wenn das Event ein OMA-Gems-Turnier ist UND das
  // generische Ende-Feld gesetzt ist (siehe EventEditClient.tsx) — das Turnier-Ende selbst
  // liegt jetzt auf Event.endAt (oben in `data` mit übernommen), GemsTournament.endAt wird
  // für neue/aktualisierte Turniere bewusst nicht mehr geschrieben (deprecated).
  if (gemsDifficulty !== undefined) {
    const difficulty: NpcDifficulty = GEMS_DIFFICULTIES.includes(gemsDifficulty) ? gemsDifficulty : "MEDIUM";
    const maxAttemptsPerUser = Number(gemsMaxAttempts) > 0 ? Number(gemsMaxAttempts) : 3;
    const monsterCardIds: string[] | undefined =
      Array.isArray(gemsMonsterIds) && gemsMonsterIds.every((id) => typeof id === "string")
        ? gemsMonsterIds
        : undefined;
    const monsterCardIdsJson = monsterCardIds?.length ? JSON.stringify(monsterCardIds) : null;
    const existing = await prisma.gemsTournament.findUnique({ where: { eventId } });
    if (existing) {
      const attemptCount = await prisma.gemsTournamentAttempt.count({ where: { tournamentId: existing.id } });
      const difficultyChanged = existing.difficulty !== difficulty;
      const monstersChanged = (existing.monsterCardIdsJson ?? null) !== monsterCardIdsJson;
      await prisma.gemsTournament.update({
        where: { id: existing.id },
        data: {
          difficulty,
          maxAttemptsPerUser,
          ...((difficultyChanged || monstersChanged) && attemptCount === 0
            ? {
                bossTeamJson: JSON.stringify(generateGemsTournamentBossTeam(difficulty, monsterCardIds)),
                monsterCardIdsJson,
              }
            : {}),
        },
      });
    } else {
      await prisma.gemsTournament.create({
        data: {
          eventId,
          difficulty,
          maxAttemptsPerUser,
          bossTeamJson: JSON.stringify(generateGemsTournamentBossTeam(difficulty, monsterCardIds)),
          monsterCardIdsJson,
        },
      });
    }
  }

  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId fehlt" }, { status: 400 });
  // Mods immer; Ersteller/Captains nur, solange noch nichts ausgezahlt wurde (kein Abschluss) —
  // sonst müssten Belohnungen zurückgebucht werden, das bleibt Mods vorbehalten.
  const currentUser = await requireEventManager(eventId);
  if (!hasMinRole(currentUser.role, "moderator")) {
    const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { completionData: true } });
    if (ev?.completionData) {
      return NextResponse.json({ error: "Abgeschlossene Events kann nur ein Mod löschen." }, { status: 403 });
    }
  }

  await deleteEventRecord(eventId);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireModeratorOrSquadCaptain, hasMinRole } from "@/lib/roles";
import { getCommunityLimits, seriesConfigLimits } from "@/lib/community-event-limits";
import { assertCreatorQuota, CreatorLimitError, initialApprovalStatus } from "@/lib/community-events";
import { capCaptainRewardFields, capMatchResultPoints, capPlacementRewardsJson } from "@/lib/captain-reward-limits";
import { isOpenSeasonEvent, parseSeriesCompletion, parseTournamentTemplate, serializeTournamentTemplate, templateEventFields } from "@/lib/series-seasons";
import { prisma } from "@/lib/prisma";
import { calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";
import { createPollsForEvent } from "@/lib/event-polls";
import { allowedCoverUrl } from "@/lib/event-cover-presets";
import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";

export async function GET() {
  const series = await prisma.eventSeries.findMany({
    where: { hidden: false },
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return NextResponse.json(series);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.json();
  // Jeder eingeloggte User darf Reihen anlegen (Community-Reihen). Eine Squad-Bindung nur an eigene
  // Squads (Captain). Nicht-Moderatoren: Limit aktiver Reihen, gekappte Belohnungen, Discord/Push
  // erst nach Mod-Freigabe.
  const currentUser = rawBody.squadId ? await requireModeratorOrSquadCaptain(rawBody.squadId) : await getSessionUser();
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const isModerator = hasMinRole(currentUser.role, "moderator");
  const limits = isModerator ? null : await getCommunityLimits();
  if (limits) {
    try {
      await assertCreatorQuota(currentUser.id, "series", limits);
    } catch (err) {
      if (err instanceof CreatorLimitError) return NextResponse.json({ error: err.message }, { status: err.status });
      throw err;
    }
    // Ankündigungskanal legen nur Mods fest
    delete rawBody.discordChannelId;
  }
  // Belohnungen — die Reihe selbst darf bis zur höchsten Endwertungs-Grenze konfiguriert werden
  // (beim Saisonabschluss nach Terminanzahl skaliert gekappt), jeder Termin bekommt die Reihen-
  // Termin-Grenzen (siehe lib/community-event-limits.ts).
  const body = limits ? capCaptainRewardFields(rawBody, seriesConfigLimits(limits)) : rawBody;
  const eventPlacementJson = (json: string | null) =>
    limits && json ? (capPlacementRewardsJson(json, limits.seriesEvent) as string | null) : json;
  const {
    name, description,
    category, genre, fixedGame, fixedFormat, discordChannelId,
    recurrenceType, recurrenceMonthlyMode,
    placementRewardsJson, pollsConfigJson, seriesStatConfig,
    startDate, endDate, firstEventEndAt, hidden, registrationLocked, squadId,
    spectatorMode, spectatorRewardJson,
    groupId, tournamentTemplateJson,
  } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const coverUrl = allowedCoverUrl(rawBody.coverImageUrl, isModerator);
  if (startDate && firstEventEndAt && new Date(firstEventEndAt) <= new Date(startDate)) {
    return NextResponse.json({ error: "Ende muss nach dem Start liegen" }, { status: 400 });
  }

  const placementJson     = placementRewardsJson != null ? JSON.stringify(placementRewardsJson) : null;
  const pollsJson         = pollsConfigJson      != null ? JSON.stringify(pollsConfigJson)      : null;
  const spectatorJson     = spectatorRewardJson  != null ? JSON.stringify(spectatorRewardJson)  : null;
  const spectatorEnabled  = spectatorMode === true;
  // Turniervorlage für alle Termine der Reihe (Gruppenphase, Check-in, Punktemodus)
  const template = parseTournamentTemplate(
    typeof tournamentTemplateJson === "string" ? tournamentTemplateJson : tournamentTemplateJson ? JSON.stringify(tournamentTemplateJson) : null,
  );
  if (limits && template.matchResultPoints) template.matchResultPoints = capMatchResultPoints(template.matchResultPoints, limits.seriesEvent);
  const templateJson = serializeTournamentTemplate(template);
  const templateFields = body.eventType === "tournament"
    ? templateEventFields(template, fixedFormat, seriesEventStatFieldsFromConfig(typeof seriesStatConfig === "string" ? seriesStatConfig : seriesStatConfig ? JSON.stringify(seriesStatConfig) : null))
    : {};

  try {
    // Neue Saison einer bestehenden Saison-Gruppe: höchstens EINE aktive Saison je Gruppe, Saisonnummer
    // = höchste Nummer der Gruppe + 1 (nicht die der zufällig gewählten Vorgängersaison). Die Advisory-
    // Lock serialisiert gleichzeitige Anlagen (Doppelklick, zwei Tabs) für dieselbe Gruppe.
    let movedEvents = 0;
    const series = await prisma.$transaction(async (tx) => {
      let season: { groupId: string; seasonNumber: number; icon: string | null; coverImageUrl: string | null; rules: string | null; statAliasesJson: string | null; createdById: string | null; approved: boolean } | null = null;
      // Beim Abschluss der Vorsaison zum Verschieben vorgemerkte offene Termine
      const moves: { fromSeriesId: string; completion: string; eventIds: string[] }[] = [];
      if (groupId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(groupId)}))`;
        const groupSeasons = await tx.eventSeries.findMany({
          where: { groupId: String(groupId) },
          select: { id: true, status: true, seasonNumber: true, icon: true, coverImageUrl: true, rules: true, squadId: true, createdById: true, approvalStatus: true, statAliasesJson: true, seriesCompletionData: true },
          orderBy: { seasonNumber: { sort: "desc", nulls: "last" } },
        });
        if (groupSeasons.length === 0) throw new SeasonError("Saison-Gruppe nicht gefunden", 404);
        if (!isModerator && !groupSeasons.some(g => (g.squadId && g.squadId === squadId) || g.createdById === currentUser.id)) {
          throw new SeasonError("Keine Berechtigung für diese Saison-Gruppe", 403);
        }
        if (groupSeasons.some(g => g.status === "active")) {
          throw new SeasonError("Für diese Reihe läuft bereits eine aktive Saison — erst abschließen, dann eine neue starten.", 409);
        }
        const latest = groupSeasons[0];
        season = {
          groupId: String(groupId),
          seasonNumber: Math.max(0, ...groupSeasons.map(g => g.seasonNumber ?? 1)) + 1,
          // Aussehen und Regelwerk der letzten Saison übernehmen (der Assistent fragt sie nicht ab)
          icon: latest.icon, coverImageUrl: latest.coverImageUrl, rules: latest.rules,
          statAliasesJson: latest.statAliasesJson,
          // Community-Reihe: Ersteller bleibt über alle Saisons derselbe (auch wenn ein Mod die neue
          // Saison anlegt); einmal freigegeben bleibt freigegeben
          createdById: latest.createdById,
          approved: groupSeasons.some(g => g.approvalStatus === "approved"),
        };
        for (const g of groupSeasons) {
          const ids = parseSeriesCompletion(g.seriesCompletionData).pendingMoveEventIds ?? [];
          if (ids.length > 0 && g.seriesCompletionData) moves.push({ fromSeriesId: g.id, completion: g.seriesCompletionData, eventIds: ids });
        }
      }
      const created = await tx.eventSeries.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          category: category ?? null,
          genre: genre ?? null,
          fixedGame: fixedGame?.trim() || null,
          fixedFormat: fixedFormat || null,
          discordChannelId: discordChannelId?.trim() || null,
          recurrenceType: recurrenceType ?? null,
          recurrenceMonthlyMode: recurrenceMonthlyMode ?? null,
          placementRewardsJson: placementJson,
          pollsConfigJson: pollsJson,
          seriesStatConfig: seriesStatConfig ?? null,
          hidden: hidden ?? false,
          registrationLocked: registrationLocked ?? false,
          // OMA Original legen nur Mods fest; Termine der Reihe erben es (lib/oma-original.ts)
          omaOriginal: isModerator && rawBody.omaOriginal === true,
          squadId: squadId || null,
          createdById: season ? season.createdById : currentUser.id,
          // Neue Saison einer bereits freigegebenen Community-Reihe braucht keine erneute Freigabe
          approvalStatus: limits && season?.approved ? "approved" : initialApprovalStatus(isModerator),
          groupId: season?.groupId ?? null,
          seasonNumber: season?.seasonNumber ?? null,
          ...(season && { icon: season.icon, coverImageUrl: season.coverImageUrl, rules: season.rules, statAliasesJson: season.statAliasesJson }),
          // Eigenes Reihen-Bild aus dem Wizard (Vorlage, Upload oder URL) — sonst das der Vorsaison
          ...(coverUrl && { coverImageUrl: coverUrl }),
          tournamentTemplateJson: templateJson,
        },
      });
      // Vorgemerkte Termine in die neue Saison übernehmen — nur solche, die noch offen sind
      for (const m of moves) {
        const candidates = await tx.event.findMany({
          where: { id: { in: m.eventIds }, seriesId: m.fromSeriesId },
          select: { id: true, status: true, completionData: true },
        });
        const movable = candidates.filter(isOpenSeasonEvent).map(e => e.id);
        if (movable.length > 0) {
          await tx.event.updateMany({ where: { id: { in: movable } }, data: { seriesId: created.id } });
          movedEvents += movable.length;
        }
        const completion = parseSeriesCompletion(m.completion);
        await tx.eventSeries.update({
          where: { id: m.fromSeriesId },
          data: { seriesCompletionData: JSON.stringify({ ...completion, pendingMoveEventIds: null }) },
        });
      }
      return created;
    });

    // Bulk-Event-Erstellung wenn startDate vorhanden
    let eventsCreated = 0;
    if (startDate) {
      const start = new Date(startDate);
      const end   = endDate ? new Date(endDate) : null;
      // Dauer des ersten Termins (falls Ende mitgegeben) — wird von calcNextDate auf jeden
      // weiteren generierten Termin übertragen, damit die Serie ihre Spannweite behält.
      const firstEnd = firstEventEndAt ? new Date(firstEventEndAt) : null;
      const durationMs = firstEnd ? firstEnd.getTime() - start.getTime() : undefined;

      if (recurrenceType && recurrenceType !== "none" && end) {
        const dates: (Date & { endAt?: Date })[] = [Object.assign(new Date(start), firstEnd ? { endAt: firstEnd } : {})];
        let current: Date = start;
        while (true) {
          const next = calcNextDate(
            current,
            recurrenceType as RecurrenceType,
            (recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode,
            start,
            durationMs,
          );
          if (next > end) break;
          dates.push(next);
          current = next;
        }

        for (let i = 0; i < dates.length; i++) {
          const createdEvent = await prisma.event.create({
            data: {
              title: `${name.trim()} #${i + 1}`,
              startAt: dates[i],
              endAt: dates[i].endAt ?? null,
              seriesId: series.id,
              createdById: series.createdById,
              approvalStatus: series.approvalStatus,
              category: category ?? "casual",
              genre: genre ?? null,
              game: fixedGame?.trim() || null,
              format: fixedFormat || null,
              discordChannelId: discordChannelId?.trim() || null,
              type: body.eventType ?? "community",
              pointReward: 0,
              placementRewardsJson: eventPlacementJson(placementJson),
              pollsConfigJson: pollsJson,
              spectatorMode: spectatorEnabled,
              spectatorRewardJson: spectatorEnabled ? spectatorJson : null,
              ...templateFields,
            },
          });
          await createPollsForEvent(createdEvent.id, createdEvent.startAt, pollsConfigJson);
          eventsCreated++;
        }
      } else if (!recurrenceType || recurrenceType === "none") {
        const createdEvent = await prisma.event.create({
          data: {
            title: `${name.trim()} #1`,
            startAt: start,
            endAt: firstEnd,
            seriesId: series.id,
            createdById: series.createdById,
            approvalStatus: series.approvalStatus,
            category: category ?? "casual",
            genre: genre ?? null,
            game: fixedGame?.trim() || null,
            format: fixedFormat || null,
            discordChannelId: discordChannelId?.trim() || null,
            type: body.eventType ?? "community",
            pointReward: 0,
            placementRewardsJson: eventPlacementJson(placementJson),
            pollsConfigJson: pollsJson,
            spectatorMode: spectatorEnabled,
            spectatorRewardJson: spectatorEnabled ? spectatorJson : null,
            ...templateFields,
          },
        });
        await createPollsForEvent(createdEvent.id, createdEvent.startAt, pollsConfigJson);
        eventsCreated = 1;
      }
    }

    return NextResponse.json({ ...series, eventsCreated, movedEvents });
  } catch (err) {
    if (err instanceof SeasonError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[POST /api/events/series]", err);
    return NextResponse.json(
      { error: "Interner Fehler", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

class SeasonError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireModeratorOrSquadCaptain, hasMinRole } from "@/lib/roles";
import { capCaptainRewardFields, capMatchResultPoints } from "@/lib/captain-reward-limits";
import { isOpenSeasonEvent, parseSeriesCompletion, parseTournamentTemplate, serializeTournamentTemplate, templateEventFields } from "@/lib/series-seasons";
import { prisma } from "@/lib/prisma";
import { calcNextDate } from "@/lib/recurrence";
import type { RecurrenceType, MonthlyMode } from "@/lib/recurrence";
import { createPollsForEvent } from "@/lib/event-polls";

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
  // Moderator/Admin dürfen immer. Reine Squad-Captains nur, wenn die neue Reihe direkt auf ihr
  // eigenes Squad beschränkt wird — eine offene Community-Reihe bleibt Moderatoren/Admins vorbehalten.
  const currentUser = rawBody.squadId ? await requireModeratorOrSquadCaptain(rawBody.squadId) : await requireRole("moderator");
  // Belohnungen — für Captains auf die Standard-Obergrenzen gekappt (siehe captain-reward-limits.ts)
  const body = hasMinRole(currentUser.role, "moderator") ? rawBody : capCaptainRewardFields(rawBody);
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
  if (!hasMinRole(currentUser.role, "moderator") && template.matchResultPoints) template.matchResultPoints = capMatchResultPoints(template.matchResultPoints);
  const templateJson = serializeTournamentTemplate(template);
  const templateFields = body.eventType === "tournament" ? templateEventFields(template, fixedFormat) : {};

  try {
    // Neue Saison einer bestehenden Saison-Gruppe: höchstens EINE aktive Saison je Gruppe, Saisonnummer
    // = höchste Nummer der Gruppe + 1 (nicht die der zufällig gewählten Vorgängersaison). Die Advisory-
    // Lock serialisiert gleichzeitige Anlagen (Doppelklick, zwei Tabs) für dieselbe Gruppe.
    let movedEvents = 0;
    const series = await prisma.$transaction(async (tx) => {
      let season: { groupId: string; seasonNumber: number; icon: string | null; coverImageUrl: string | null; rules: string | null; statAliasesJson: string | null } | null = null;
      // Beim Abschluss der Vorsaison zum Verschieben vorgemerkte offene Termine
      const moves: { fromSeriesId: string; completion: string; eventIds: string[] }[] = [];
      if (groupId) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${String(groupId)}))`;
        const groupSeasons = await tx.eventSeries.findMany({
          where: { groupId: String(groupId) },
          select: { id: true, status: true, seasonNumber: true, icon: true, coverImageUrl: true, rules: true, squadId: true, statAliasesJson: true, seriesCompletionData: true },
          orderBy: { seasonNumber: { sort: "desc", nulls: "last" } },
        });
        if (groupSeasons.length === 0) throw new SeasonError("Saison-Gruppe nicht gefunden", 404);
        if (!hasMinRole(currentUser.role, "moderator") && !groupSeasons.some(g => g.squadId && g.squadId === squadId)) {
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
          squadId: squadId || null,
          groupId: season?.groupId ?? null,
          seasonNumber: season?.seasonNumber ?? null,
          ...(season && { icon: season.icon, coverImageUrl: season.coverImageUrl, rules: season.rules, statAliasesJson: season.statAliasesJson }),
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
              category: category ?? "casual",
              genre: genre ?? null,
              game: fixedGame?.trim() || null,
              format: fixedFormat || null,
              discordChannelId: discordChannelId?.trim() || null,
              type: body.eventType ?? "community",
              pointReward: 0,
              placementRewardsJson: placementJson,
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
            category: category ?? "casual",
            genre: genre ?? null,
            game: fixedGame?.trim() || null,
            format: fixedFormat || null,
            discordChannelId: discordChannelId?.trim() || null,
            type: body.eventType ?? "community",
            pointReward: 0,
            placementRewardsJson: placementJson,
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

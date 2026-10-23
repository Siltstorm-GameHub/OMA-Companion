import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCaptainedSquadIds, getSessionUser, hasMinRole } from "@/lib/roles";
import { capCaptainRewardFields } from "@/lib/captain-reward-limits";
import { EventCategory, EventGenre } from "@prisma/client";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { createPollsForEvent } from "@/lib/event-polls";
import { generateGemsTournamentBossTeam } from "@/lib/gems/gems-tournament";
import type { NpcDifficulty } from "@/lib/gems/npc-battle-types";

const GEMS_DIFFICULTIES: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];
// Standard-Coverbild für OMA-Gems-Turniere, falls der Admin kein eigenes hochlädt —
// es gibt kein "Spiel-Cover" für OMA Gems (kein echtes Steam-Spiel), ohne das würde
// sonst der generische OMA-Companion-Platzhalter (EventCoverDefault) angezeigt.
const GEMS_TOURNAMENT_DEFAULT_COVER = "/gems-assets/gems-tournament-cover.png";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const genre = searchParams.get("genre");

  const where: Record<string, unknown> = { hidden: false };
  if (status) where.status = status;
  if (category) where.category = category;
  if (genre) where.genre = genre;

  const events = await prisma.event.findMany({
    where,
    include: { _count: { select: { registrations: { where: { role: "player" } } } } },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const body = await req.json();
  const {
    title, description, game, genre, category, startAt, endAt, maxPlayers, type, seriesId,
    discordChannelId, spectatorMode, hidden, registrationLocked, squadId,
    gemsDifficulty, gemsMaxAttempts, gemsMonsterIds,
    format: bodyFormat, statFields: bodyStatFields, statConfig: bodyStatConfig,
  } = body;

  const series = seriesId
    ? await prisma.eventSeries.findUnique({
        where: { id: seriesId },
        select: { fixedFormat: true, placementRewardsJson: true, seriesStatConfig: true, coverImageUrl: true, squadId: true },
      })
    : null;
  if (seriesId && !series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 400 });

  // Moderator/Admin dürfen immer Events erstellen. Reine Squad-Captains (globale Rolle "user") nur,
  // wenn das Event direkt auf ihr eigenes Squad beschränkt wird (squadId gesetzt + sie sind dessen
  // Captain) — ein Community-weites Event ohne Squad-Bindung bleibt Moderatoren/Admins vorbehalten.
  const currentUser = await getSessionUser();
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const isModerator = hasMinRole(currentUser.role, "moderator");
  if (!isModerator) {
    // Event-Squad UND (falls angehängt) Reihen-Squad müssen eigene Squads sein — sonst könnte ein
    // Captain sein Event mit eigener squadId in die Reihe eines fremden Squads hängen.
    const captained = await getCaptainedSquadIds(currentUser.id);
    if (squadId && !captained.includes(squadId)) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    if (series && (!series.squadId || !captained.includes(series.squadId))) {
      return NextResponse.json({ error: "Keine Berechtigung für diese Eventreihe" }, { status: 403 });
    }
    if (!squadId && !series?.squadId) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  // Belohnungen — für Captains auf die Standard-Obergrenzen gekappt (siehe captain-reward-limits.ts)
  const { spectatorRewardJson, pollsConfigJson, placementRewardsJson } = isModerator ? body : capCaptainRewardFields(body);

  if (typeof title !== "string" || !title.trim() || !startAt) {
    return NextResponse.json({ error: "Titel und Datum sind Pflichtfelder" }, { status: 400 });
  }

  const startDate = new Date(startAt);
  const endDate = endAt ? new Date(endAt) : null;
  if (isNaN(startDate.getTime()) || (endDate && isNaN(endDate.getTime()))) {
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  }
  if (endDate && endDate <= startDate) {
    return NextResponse.json({ error: "Ende muss nach dem Start liegen" }, { status: 400 });
  }
  const maxPlayersValue = maxPlayers === null || maxPlayers === undefined || maxPlayers === "" ? null : Number(maxPlayers);
  if (maxPlayersValue !== null && (!Number.isInteger(maxPlayersValue) || maxPlayersValue < 2)) {
    return NextResponse.json({ error: "Max. Spieler muss eine ganze Zahl ab 2 sein" }, { status: 400 });
  }
  if (category && !(Object.values(EventCategory) as string[]).includes(category)) {
    return NextResponse.json({ error: "Unbekannte Kategorie" }, { status: 400 });
  }
  if (genre && !(Object.values(EventGenre) as string[]).includes(genre)) {
    return NextResponse.json({ error: "Unbekanntes Genre" }, { status: 400 });
  }
  const newSeriesName = typeof body.newSeries?.name === "string" ? body.newSeries.name.trim() : "";
  const newSeriesDescription = typeof body.newSeries?.description === "string" ? body.newSeries.description.trim() || null : null;
  if (body.newSeries && !newSeriesName) {
    return NextResponse.json({ error: "Name der neuen Eventreihe fehlt" }, { status: 400 });
  }
  if (newSeriesName && seriesId) {
    return NextResponse.json({ error: "Entweder bestehende oder neue Eventreihe angeben, nicht beides" }, { status: 400 });
  }
  if (game === "OMA Gems" && !endDate) {
    return NextResponse.json({ error: "Ein OMA-Gems-Turnier braucht ein Ende (Turnierschluss)" }, { status: 400 });
  }

  // Inherit tournament settings from series if linking to one
  let seriesFormat: string | null = null;
  let seriesPointsConfig: string | null = null;
  let seriesStatFields: string | null = null;
  let seriesCoverImageUrl: string | null = null;
  if (series) {
    seriesCoverImageUrl = series?.coverImageUrl ?? null;
    if (series?.fixedFormat) seriesFormat = series.fixedFormat;
    if (series?.placementRewardsJson && series.fixedFormat !== "liga") {
      try {
        const { placements } = JSON.parse(series.placementRewardsJson) as {
          placements: { place: number; coins: number; rankPoints: number }[];
        };
        if (placements?.length) {
          const cfg: Record<string, { coins: number; points: number }> = {};
          for (const p of placements) cfg[String(p.place)] = { coins: p.coins, points: p.rankPoints };
          seriesPointsConfig = JSON.stringify(cfg);
        }
      } catch { /* skip */ }
    }
    if (series?.seriesStatConfig) {
      try {
        const { stats, eventStatFields } = JSON.parse(series.seriesStatConfig) as {
          stats?: { field: string; isWinnerStat?: boolean; isMatchWinStat?: boolean }[];
          eventStatFields?: string[];
        };
        // Bevorzugt die explizit gepflegten Event-Stat-Felder, sonst Fallback auf die Reihen-Stats
        // (ohne Sieger-Stats und Match-Win-Stats, die automatisch/aus dem Match-Win-Haken gesetzt werden)
        const fields = eventStatFields?.length
          ? eventStatFields.filter(Boolean)
          : (stats?.filter(s => !s.isWinnerStat && !s.isMatchWinStat && s.field).map(s => s.field) ?? []);
        if (fields.length) seriesStatFields = JSON.stringify(fields);
      } catch { /* skip */ }
    }
  }

  // Turnier-Einstellungen aus dem Wizard (Einzel-Event): Format, Stat-Felder und Punkte je Stat.
  // Bei Events in einer Reihe mit festem Format gewinnt die Reihe (siehe oben).
  const VALID_FORMATS = ["single_elimination", "group_knockout", "round_robin", "liga", "coop_stats", "avg_stats", "ffa"];
  const eventFormat = seriesFormat ?? (typeof bodyFormat === "string" && VALID_FORMATS.includes(bodyFormat) ? bodyFormat : null);
  let eventStatFields = seriesStatFields;
  let eventStatConfigJson: string | null = null;
  if (!seriesFormat && eventFormat) {
    let raw: unknown = bodyStatFields;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
    if (Array.isArray(raw)) {
      const fields = [...new Set(raw.filter((f): f is string => typeof f === "string").map(f => f.trim()).filter(Boolean))];
      if (fields.length) eventStatFields = JSON.stringify(fields);
      const stats = Array.isArray(bodyStatConfig?.stats)
        ? (bodyStatConfig.stats as { field?: unknown; pointsPer?: unknown }[])
            .filter(r => typeof r.field === "string" && fields.includes(r.field) && Number.isFinite(Number(r.pointsPer)) && Number(r.pointsPer) !== 0)
            .map(r => ({ field: r.field as string, pointsPer: Number(r.pointsPer) }))
        : [];
      if (stats.length) eventStatConfigJson = JSON.stringify({ stats });
    }
  }

  // Derive participation coin default (10) from placementRewardsJson or series config
  const rewardsData = placementRewardsJson
    ? JSON.stringify(placementRewardsJson)
    : seriesId
      ? series?.placementRewardsJson ?? null
      : JSON.stringify({ participationCoins: 10, placements: [{ place: 1, coins: 500, rankPoints: 3 }, { place: 2, coins: 250, rankPoints: 2 }, { place: 3, coins: 100, rankPoints: 1 }] });

  // "Neue Reihe" aus dem Wizard: Reihe und Event entstehen gemeinsam in einer Transaktion. Vorher legte
  // der Wizard die Reihe vorab separat an — scheiterte danach das Event, blieb eine leere Reihe zurück,
  // und jeder weitere Versuch erzeugte eine weitere.
  const event = await prisma.$transaction(async (tx) => {
    const createdSeriesId = newSeriesName
      ? (await tx.eventSeries.create({
          data: {
            name: newSeriesName,
            description: newSeriesDescription,
            category: category || "casual",
            // Captains brauchen die Squad-Bindung, um die Reihe später selbst verwalten zu können
            squadId: isModerator ? null : (squadId || null),
          },
        })).id
      : null;
    return tx.event.create({
    data: {
      title: title.trim(),
      description,
      game,
      genre:           genre || null,
      category:        category || "casual",
      startAt: startDate,
      endAt: endDate,
      maxPlayers: maxPlayersValue,
      type:            type ?? "community",
      seriesId:        seriesId || createdSeriesId,
      discordChannelId: discordChannelId || null,
      hidden:          hidden ? true : false,
      registrationLocked: registrationLocked ? true : false,
      squadId:         squadId || null,
      spectatorMode:   spectatorMode ? true : false,
      spectatorRewardJson: spectatorRewardJson ? JSON.stringify(spectatorRewardJson) : null,
      pollsConfigJson: pollsConfigJson ? JSON.stringify(pollsConfigJson) : null,
      placementRewardsJson: rewardsData,
      ...(game === "OMA Gems" && { coverImageUrl: GEMS_TOURNAMENT_DEFAULT_COVER }),
      ...(eventFormat        && { format:       eventFormat }),
      ...(seriesPointsConfig && { pointsConfig: seriesPointsConfig }),
      ...(eventStatFields    && { statFields:   eventStatFields }),
      ...(eventStatConfigJson && { statConfigJson: eventStatConfigJson }),
    },
    });
  });

  await createPollsForEvent(event.id, event.startAt, pollsConfigJson);

  // OMA-Gems-Turnier: automatisch angehängt, sobald game === "OMA Gems" gewählt wurde und ein
  // Turnierende mitgeschickt wurde (siehe EventSetupWizard.tsx). Das Boss-Team wird EINMALIG
  // erzeugt und persistiert, damit alle Teilnehmer exakt dasselbe Gegner-Team bekommen.
  if (game === "OMA Gems" && endDate) {
    const difficulty: NpcDifficulty = GEMS_DIFFICULTIES.includes(gemsDifficulty) ? gemsDifficulty : "MEDIUM";
    const maxAttemptsPerUser = Number(gemsMaxAttempts) > 0 ? Number(gemsMaxAttempts) : 3;
    const monsterCardIds: string[] | undefined =
      Array.isArray(gemsMonsterIds) && gemsMonsterIds.every((id) => typeof id === "string")
        ? gemsMonsterIds
        : undefined;
    await prisma.gemsTournament.create({
      data: {
        eventId: event.id,
        // GemsTournament.endAt bewusst NICHT gesetzt (deprecated) — das Turnierende liegt
        // jetzt auf Event.endAt (siehe endDate oben).
        difficulty,
        maxAttemptsPerUser,
        bossTeamJson: JSON.stringify(generateGemsTournamentBossTeam(difficulty, monsterCardIds)),
        monsterCardIdsJson: monsterCardIds?.length ? JSON.stringify(monsterCardIds) : null,
      },
    });
  }

  let participationCoins = 10;
  try {
    const parsedRewards = rewardsData ? JSON.parse(rewardsData) as { participationCoins?: number } : null;
    if (parsedRewards?.participationCoins != null) participationCoins = parsedRewards.participationCoins;
  } catch { /* skip */ }

  // Unsichtbar erstellte Events sind noch nicht veröffentlicht — keine Discord-Ankündigung/
  // Scheduled Event/Push-Benachrichtigung, bis der Admin sie sichtbar schaltet.
  if (!event.hidden) {
    // Discord Scheduled Event automatisch anlegen
    const discordEventId = await createDiscordScheduledEvent({
      title: title.trim(),
      startAt:     startDate,
      description: description ?? null,
      game:        game ?? null,
      coverImageUrl:       event.coverImageUrl,
      seriesCoverImageUrl,
    });
    if (discordEventId) {
      await prisma.event.update({
        where: { id: event.id },
        data: { discordEventId },
      });
      event.discordEventId = discordEventId;
    }

    // Discord-Ankündigung — Message-ID speichern für späteres Löschen
    const discordMessageId = await announceNewEvent({
      eventId:          event.id,
      title:            event.title,
      game:             event.game,
      format:           event.format,
      genre:            event.genre,
      startAt:          event.startAt,
      maxPlayers:       event.maxPlayers,
      pointReward:      participationCoins,
      teilnehmer:       0,
      discordChannelId: event.discordChannelId,
    });
    if (discordMessageId) {
      await prisma.event.update({
        where: { id: event.id },
        data:  { discordMessageId },
      });
      event.discordMessageId = discordMessageId;
    }

    // Push + In-App + Discord-DM (Discord-Kanal-Post übernimmt bereits announceNewEvent oben, inkl. Coverbild)
    dispatchEventNotification("event_new", { id: event.id }, {
      placeholders: {
        "{eventName}": event.title,
        "{game}":      event.game ?? "–",
        "{date}":      event.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
      },
      skipDiscordChannel: true,
    }).catch(() => {});
  }

  return NextResponse.json(event, { status: 201 });
}

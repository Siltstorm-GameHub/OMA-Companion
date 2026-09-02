import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { createPollsForEvent } from "@/lib/event-polls";
import { generateGemsTournamentBossTeam } from "@/lib/battle-cards/gems-tournament";
import type { NpcDifficulty } from "@/lib/battle-cards/npc-battle-types";

const GEMS_DIFFICULTIES: NpcDifficulty[] = ["EASY", "MEDIUM", "HARD"];
// Standard-Coverbild für OMA-Gems-Turniere, falls der Admin kein eigenes hochlädt —
// es gibt kein "Spiel-Cover" für OMA Gems (kein echtes Steam-Spiel), ohne das würde
// sonst der generische OMA-Companion-Platzhalter (EventCoverDefault) angezeigt.
const GEMS_TOURNAMENT_DEFAULT_COVER = "/battle-cards/gems-tournament-cover.png";

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
    title, description, game, genre, category, startAt, maxPlayers, type, seriesId,
    discordChannelId, spectatorMode, spectatorRewardJson, pollsConfigJson,
    placementRewardsJson, hidden, registrationLocked, squadId,
    gemsEndAt, gemsDifficulty, gemsMaxAttempts, gemsMonsterIds,
  } = body;

  // Moderator/Admin dürfen immer Events erstellen. Reine Squad-Captains (globale Rolle "user") nur,
  // wenn das Event direkt auf ihr eigenes Squad beschränkt wird (squadId gesetzt + sie sind dessen
  // Captain) — ein Community-weites Event ohne Squad-Bindung bleibt Moderatoren/Admins vorbehalten.
  const currentUser = await getSessionUser();
  if (!currentUser) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!hasMinRole(currentUser.role, "moderator")) {
    // Bei Anhängen an eine bestehende Reihe zählt deren Squad-Bindung, sonst die des Events selbst.
    const relevantSquadId = squadId || (seriesId
      ? (await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { squadId: true } }))?.squadId
      : null);
    if (!relevantSquadId) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    const membership = await prisma.squadMembership.findUnique({
      where: { squadId_userId: { squadId: relevantSquadId, userId: currentUser.id } },
    });
    if (membership?.role !== "captain") return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  if (!title || !startAt) {
    return NextResponse.json({ error: "Titel und Datum sind Pflichtfelder" }, { status: 400 });
  }

  const startDate = new Date(startAt);

  // Inherit tournament settings from series if linking to one
  let seriesFormat: string | null = null;
  let seriesPointsConfig: string | null = null;
  let seriesStatFields: string | null = null;
  let seriesCoverImageUrl: string | null = null;
  if (seriesId) {
    const series = await prisma.eventSeries.findUnique({
      where: { id: seriesId },
      select: { fixedFormat: true, placementRewardsJson: true, seriesStatConfig: true, coverImageUrl: true },
    });
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

  // Derive participation coin default (10) from placementRewardsJson or series config
  const rewardsData = placementRewardsJson
    ? JSON.stringify(placementRewardsJson)
    : seriesId
      ? (await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { placementRewardsJson: true } }))?.placementRewardsJson ?? null
      : JSON.stringify({ participationCoins: 10, placements: [{ place: 1, coins: 500, rankPoints: 3 }, { place: 2, coins: 250, rankPoints: 2 }, { place: 3, coins: 100, rankPoints: 1 }] });

  const event = await prisma.event.create({
    data: {
      title,
      description,
      game,
      genre:           genre || null,
      category:        category || "casual",
      startAt: startDate,
      maxPlayers: maxPlayers ? Number(maxPlayers) : null,
      type:            type ?? "community",
      seriesId:        seriesId || null,
      discordChannelId: discordChannelId || null,
      hidden:          hidden ? true : false,
      registrationLocked: registrationLocked ? true : false,
      squadId:         squadId || null,
      spectatorMode:   spectatorMode ? true : false,
      spectatorRewardJson: spectatorRewardJson ? JSON.stringify(spectatorRewardJson) : null,
      pollsConfigJson: pollsConfigJson ? JSON.stringify(pollsConfigJson) : null,
      placementRewardsJson: rewardsData,
      ...(game === "OMA Gems" && { coverImageUrl: GEMS_TOURNAMENT_DEFAULT_COVER }),
      ...(seriesFormat       && { format:       seriesFormat }),
      ...(seriesPointsConfig && { pointsConfig: seriesPointsConfig }),
      ...(seriesStatFields   && { statFields:   seriesStatFields }),
    },
  });

  await createPollsForEvent(event.id, event.startAt, pollsConfigJson);

  // OMA-Gems-Turnier: automatisch angehängt, sobald game === "OMA Gems" gewählt wurde und ein
  // Turnierende mitgeschickt wurde (siehe EventSetupWizard.tsx). Das Boss-Team wird EINMALIG
  // erzeugt und persistiert, damit alle Teilnehmer exakt dasselbe Gegner-Team bekommen.
  if (game === "OMA Gems" && gemsEndAt) {
    const difficulty: NpcDifficulty = GEMS_DIFFICULTIES.includes(gemsDifficulty) ? gemsDifficulty : "MEDIUM";
    const maxAttemptsPerUser = Number(gemsMaxAttempts) > 0 ? Number(gemsMaxAttempts) : 3;
    const monsterCardIds: string[] | undefined =
      Array.isArray(gemsMonsterIds) && gemsMonsterIds.every((id) => typeof id === "string")
        ? gemsMonsterIds
        : undefined;
    await prisma.gemsTournament.create({
      data: {
        eventId: event.id,
        endAt: new Date(gemsEndAt),
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
      title,
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

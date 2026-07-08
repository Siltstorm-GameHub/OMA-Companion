import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { createPollsForEvent, parsePollsConfigJson } from "@/lib/event-polls";

/**
 * GET /api/admin/event-series        → Liste aller Reihen (mit Event-Zähler + nächstes Event)
 * GET /api/admin/event-series?id=xxx → Einzelne Reihe mit Details
 */
export async function GET(req: NextRequest) {
  await requireRole("moderator");
  const id = new URL(req.url).searchParams.get("id");

  if (!id) {
    const allSeries = await prisma.eventSeries.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { events: true } },
        events: {
          where: { startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
          take: 1,
          select: { startAt: true, status: true },
        },
      },
    });
    return NextResponse.json(allSeries);
  }

  const series = await prisma.eventSeries.findUnique({
    where: { id },
    include: {
      _count: { select: { events: true } },
      events: {
        orderBy: { startAt: "desc" },
        select: {
          id: true, title: true, startAt: true, status: true,
          _count: { select: { registrations: true } },
          maxPlayers: true,
        },
      },
    },
  });
  if (!series) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(series);
}

/**
 * PATCH /api/admin/event-series
 * Body: {
 *   seriesId: string,
 *   name?: string,
 *   description?: string | null,
 *   fixedGame?: string | null,
 *   fixedFormat?: string | null,
 *   propagateGame?: boolean,   // updateMany events.game
 *   propagateFormat?: boolean, // updateMany tournaments.format
 * }
 */
export async function PATCH(req: NextRequest) {
  await requireRole("moderator");
  const body = await req.json();
  const { seriesId, propagateGame, propagateFormat, propagatePolls, propagateStatFields, ...fields } = body;
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });

  // Alten Namen merken, um die Event-Titel unten ggf. anzupassen
  const oldSeries = fields.name !== undefined
    ? await prisma.eventSeries.findUnique({ where: { id: seriesId }, select: { name: true } })
    : null;

  // 1) Reihe selbst aktualisieren
  const series = await prisma.eventSeries.update({
    where: { id: seriesId },
    data: {
      ...(fields.name                 !== undefined && { name:                 fields.name }),
      ...(fields.description          !== undefined && { description:          fields.description }),
      ...(fields.icon                 !== undefined && { icon:                 fields.icon || null }),
      ...(fields.genre                !== undefined && { genre:                fields.genre }),
      ...(fields.platform             !== undefined && { platform:             fields.platform }),
      ...(fields.fixedGame            !== undefined && { fixedGame:            fields.fixedGame }),
      ...(fields.fixedFormat          !== undefined && { fixedFormat:          fields.fixedFormat }),
      ...(fields.discordChannelId     !== undefined && { discordChannelId:     fields.discordChannelId }),
      ...(fields.recurrenceType       !== undefined && { recurrenceType:       fields.recurrenceType || null }),
      ...(fields.recurrenceMonthlyMode !== undefined && { recurrenceMonthlyMode: fields.recurrenceMonthlyMode || null }),
      ...(fields.seriesStatConfig      !== undefined && { seriesStatConfig:      fields.seriesStatConfig }),
      ...(fields.legacyStandings       !== undefined && { legacyStandings:       fields.legacyStandings }),
      ...(fields.placementRewardsJson  !== undefined && { placementRewardsJson:  fields.placementRewardsJson }),
      ...(fields.pollsConfigJson        !== undefined && { pollsConfigJson:       fields.pollsConfigJson }),
      ...(fields.category              !== undefined && { category:              fields.category || null }),
      ...(fields.hidden                !== undefined && { hidden:                fields.hidden }),
    },
  });

  // 1b) Event-Titel anpassen, wenn sich der Reihen-Name geändert hat: ALLE Events der Reihe werden
  // umbenannt (auch bereits bestehende) — nur die Nummerierung "#<N>" am Ende des Titels bleibt erhalten,
  // der Rest des Titels wird durch den neuen Reihennamen ersetzt.
  if (oldSeries && oldSeries.name !== fields.name) {
    const seriesEvents = await prisma.event.findMany({ where: { seriesId }, select: { id: true, title: true } });
    for (const ev of seriesEvents) {
      const numberSuffix = ev.title.match(/\s*#\d+\s*$/)?.[0] ?? "";
      const newTitle = `${fields.name}${numberSuffix}`;
      if (newTitle !== ev.title) {
        await prisma.event.update({ where: { id: ev.id }, data: { title: newTitle } });
      }
    }
  }

  // 2) Optional: Spiel auf alle Events der Reihe übertragen
  if (propagateGame && fields.fixedGame !== undefined) {
    await prisma.event.updateMany({
      where: { seriesId },
      data:  { game: fields.fixedGame || null },
    });
  }

  // 3) Optional: Turnier-Einstellungen auf alle Events übertragen (Format + Punkte)
  if (propagateFormat && fields.fixedFormat) {
    // Convert placementRewardsJson → pointsConfig shape
    let pointsConfigJson: string | null = null;
    if (fields.fixedFormat !== "liga" && fields.placementRewardsJson) {
      try {
        const { placements } = JSON.parse(fields.placementRewardsJson) as {
          placements: { place: number; coins: number; rankPoints: number }[];
        };
        if (placements?.length) {
          const cfg: Record<string, { coins: number; points: number }> = {};
          for (const p of placements) cfg[String(p.place)] = { coins: p.coins, points: p.rankPoints };
          pointsConfigJson = JSON.stringify(cfg);
        }
      } catch { /* skip */ }
    }
    await prisma.event.updateMany({
      where: { seriesId },
      data:  {
        format: fields.fixedFormat,
        ...(pointsConfigJson !== null && { pointsConfig: pointsConfigJson }),
      },
    });
  }

  // 3b) Optional: Getrackte Stats je Event (seriesStatConfig.eventStatFields / stats) auf alle
  //     noch nicht abgeschlossenen Events der Reihe übertragen — abgeschlossene ("finished") Events bleiben unverändert.
  //     Nur bei explizitem Opt-in, sonst würde jedes Speichern der Reihe (z.B. nur Name geändert) die
  //     individuell pro Event gepflegten Stat-Felder überschreiben/zurücksetzen.
  if (propagateStatFields && fields.seriesStatConfig !== undefined) {
    let statFieldsJson: string | null = null;
    if (fields.seriesStatConfig) {
      try {
        const { stats, eventStatFields } = JSON.parse(fields.seriesStatConfig) as {
          stats?: { field: string; isWinnerStat?: boolean; isMatchWinStat?: boolean }[];
          eventStatFields?: string[];
        };
        // Bevorzugt die explizit gepflegten Event-Stat-Felder, sonst Fallback auf die Reihen-Stats
        // (ohne Sieger-Stats und Match-Win-Stats, die automatisch/aus dem Match-Win-Haken gesetzt werden)
        const fieldNames = eventStatFields?.length
          ? eventStatFields.filter(Boolean)
          : (stats?.filter(s => !s.isWinnerStat && !s.isMatchWinStat && s.field).map(s => s.field) ?? []);
        statFieldsJson = fieldNames.length ? JSON.stringify(fieldNames) : null;
      } catch { /* skip */ }
    }
    await prisma.event.updateMany({
      where: { seriesId, status: { not: "finished" } },
      data:  { statFields: statFieldsJson },
    });
  }

  // 4) hidden auf alle Events der Reihe übertragen
  if (fields.hidden !== undefined) {
    await prisma.event.updateMany({
      where: { seriesId },
      data:  { hidden: fields.hidden },
    });
  }

  // 5) Umfragen auf alle kommenden Events übertragen (nur open/active Status)
  if (propagatePolls && fields.pollsConfigJson !== undefined) {
    await prisma.event.updateMany({
      where: { seriesId, status: { in: ["open", "active"] } },
      data:  { pollsConfigJson: fields.pollsConfigJson },
    });
    // Echte EventPoll-Datensätze nachziehen — nur für Events, die noch keine haben, damit
    // bereits laufende Abstimmungen nicht dupliziert/überschrieben werden.
    const pollsConfig = parsePollsConfigJson(fields.pollsConfigJson);
    if (pollsConfig.length > 0) {
      const eventsMissingPolls = await prisma.event.findMany({
        where: { seriesId, status: { in: ["open", "active"] }, polls: { none: {} } },
        select: { id: true, startAt: true },
      });
      for (const ev of eventsMissingPolls) {
        await createPollsForEvent(ev.id, ev.startAt, pollsConfig);
      }
    }
  }

  // 6) Discord-Kanal auf alle Events der Reihe übertragen (immer automatisch)
  if (fields.discordChannelId !== undefined) {
    await prisma.event.updateMany({
      where: { seriesId },
      data:  { discordChannelId: fields.discordChannelId || null },
    });
  }

  return NextResponse.json({ ok: true, series });
}

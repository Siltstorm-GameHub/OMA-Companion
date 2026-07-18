import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { createDiscordScheduledEvent, announceNewEvent } from "@/lib/discord-events";
import { dispatchEventNotification } from "@/lib/notify-dispatch";
import { createPollsForEvent, parsePollsConfigJson } from "@/lib/event-polls";

/**
 * POST /api/admin/event-series/generate
 * Calculates the next date and creates a new event in the series.
 * Body: { seriesId: string, overrideDate?: string }
 * overrideDate: optionaler, manuell gewählter Termin (ISO-String) — überschreibt den aus der
 * Wiederholungsregel berechneten Vorschlag, ohne die Regel selbst zu verändern.
 */
export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { seriesId, overrideDate } = await req.json();
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });

  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        select: {
          startAt: true, title: true, maxPlayers: true, pointReward: true, type: true,
          discordChannelId: true, game: true, pollsConfigJson: true, category: true, genre: true,
          spectatorMode: true, spectatorRewardJson: true, seriesEventConfigJson: true,
        },
      },
    },
  });

  // Fortlaufende Nummerierung ("Turnier #5" → "Turnier #6") — bleibt unverändert, falls kein
  // "#<Zahl>"-Suffix erkannt wird, damit Reihen ohne diese Konvention nicht verändert werden.
  function nextTitle(lastTitle: string): string {
    const m = lastTitle.match(/^(.*#)(\d+)(\s*)$/);
    return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : lastTitle;
  }

  // Convert series placementRewardsJson → event pointsConfig shape
  function derivedPointsConfig(): string | null {
    if (series?.fixedFormat === "liga") return null; // liga uses win/draw, not placements
    if (!series?.placementRewardsJson) return null;
    try {
      const { placements } = JSON.parse(series.placementRewardsJson) as {
        placements: { place: number; coins: number; rankPoints: number }[];
      };
      if (!placements?.length) return null;
      const cfg: Record<string, { coins: number; points: number }> = {};
      for (const p of placements) cfg[String(p.place)] = { coins: p.coins, points: p.rankPoints };
      return JSON.stringify(cfg);
    } catch { return null; }
  }

  // Extract stat field names from seriesStatConfig
  function derivedStatFields(): string | null {
    if (!series?.seriesStatConfig) return null;
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
      return fields.length ? JSON.stringify(fields) : null;
    } catch { return null; }
  }

  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  if (!series.recurrenceType) return NextResponse.json({ error: "Keine Wiederholung konfiguriert" }, { status: 400 });
  if (series.events.length === 0) return NextResponse.json({ error: "Reihe hat noch keine Events" }, { status: 400 });

  const referenceEvent = series.events[0];  // ältestes Event = Referenz für Monthly-Modus
  const lastEvent      = series.events[series.events.length - 1];

  const nextDate = overrideDate
    ? new Date(overrideDate)
    : calcNextDate(
        new Date(lastEvent.startAt),
        series.recurrenceType as RecurrenceType,
        (series.recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode,
        new Date(referenceEvent.startAt),
      );
  if (isNaN(nextDate.getTime())) return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });

  const game            = series.fixedGame ?? lastEvent.game ?? null;
  const discordChannelId = series.discordChannelId ?? lastEvent.discordChannelId ?? null;
  // Umfragen-Konfiguration erben: Reihe hat Vorrang, sonst vom letzten Event übernehmen
  const pollsConfigJson = series.pollsConfigJson ?? lastEvent.pollsConfigJson ?? null;
  // Kategorie/Genre sind Reihen-weite Einstellungen (kein "fixed*"-Override-Konzept wie bei Spiel/Format) —
  // die Reihe ist hier die führende Quelle, mit dem letzten Event nur als Fallback.
  const category = series.category ?? lastEvent.category;
  const genre    = series.genre    ?? lastEvent.genre    ?? null;

  const newEvent = await prisma.event.create({
    data: {
      title: nextTitle(lastEvent.title),
      game,
      genre,
      category,
      startAt: nextDate,
      maxPlayers:  lastEvent.maxPlayers,
      pointReward: lastEvent.pointReward,
      type:        lastEvent.type,
      discordChannelId,
      seriesId,
      // Zuschauer-Modus und Sieger-Ermittlung sind reine Event-Einstellungen (keine Reihen-Felder) —
      // vom letzten Event übernehmen, damit sie nicht bei jeder Generierung verloren gehen.
      spectatorMode:         lastEvent.spectatorMode,
      spectatorRewardJson:   lastEvent.spectatorRewardJson,
      ...(lastEvent.seriesEventConfigJson && { seriesEventConfigJson: lastEvent.seriesEventConfigJson }),
      ...(series.fixedFormat && { format: series.fixedFormat }),
      ...(derivedPointsConfig() !== null && { pointsConfig: derivedPointsConfig() }),
      ...(derivedStatFields()  !== null && { statFields:   derivedStatFields()  }),
      ...(pollsConfigJson && { pollsConfigJson }),
    },
  });

  // Legt die echten, abstimmbaren EventPoll-Datensätze an — ohne diesen Schritt gäbe es nur
  // die Konfiguration, aber keine Umfrage, auf die tatsächlich abgestimmt werden könnte.
  await createPollsForEvent(newEvent.id, newEvent.startAt, parsePollsConfigJson(pollsConfigJson));

  // Discord Scheduled Event + Kanal-Ankündigung (mit Coverbild)
  const [discordEventId, discordMessageId] = await Promise.all([
    createDiscordScheduledEvent({
      title:       newEvent.title,
      startAt:     newEvent.startAt,
      description: null,
      game,
    }),
    announceNewEvent({
      title:            newEvent.title,
      game,
      format:           newEvent.format,
      genre,
      startAt:          newEvent.startAt,
      maxPlayers:       newEvent.maxPlayers,
      pointReward:      newEvent.pointReward,
      teilnehmer:       0,
      discordChannelId,
    }),
  ]);

  // IDs zurückschreiben
  if (discordEventId || discordMessageId) {
    await prisma.event.update({
      where: { id: newEvent.id },
      data: {
        ...(discordEventId   && { discordEventId }),
        ...(discordMessageId && { discordMessageId }),
      },
    });
  }

  // Push + In-App + Discord-DM (Discord-Kanal-Post übernimmt bereits announceNewEvent oben)
  dispatchEventNotification("event_new", { id: newEvent.id }, {
    placeholders: {
      "{eventName}": newEvent.title,
      "{game}":      game ?? "–",
      "{date}":      newEvent.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
    },
    skipDiscordChannel: true,
  }).catch(() => {});

  return NextResponse.json({ ok: true, event: newEvent });
}

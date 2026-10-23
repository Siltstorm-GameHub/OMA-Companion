import { NextRequest, NextResponse, after } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { publishEvent } from "@/lib/event-publish";
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
          startAt: true, endAt: true, title: true, maxPlayers: true, pointReward: true, type: true,
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
  if (!series.recurrenceType && !overrideDate) return NextResponse.json({ error: "Keine Wiederholung konfiguriert — bitte Datum angeben" }, { status: 400 });

  const hasEvents      = series.events.length > 0;
  const referenceEvent = hasEvents ? series.events[0] : null;                       // ältestes Event = Referenz für Monthly-Modus
  const lastEvent       = hasEvents ? series.events[series.events.length - 1] : null;

  // Dauer des letzten Events (falls dessen endAt gesetzt war) — wird auf den neu generierten
  // Termin übertragen, damit die Serie ihre Spannweite behält (z.B. "Mo 18:00–So 23:59").
  const durationMs = lastEvent?.endAt
    ? new Date(lastEvent.endAt).getTime() - new Date(lastEvent.startAt).getTime()
    : undefined;

  const nextDate = overrideDate
    ? new Date(overrideDate)
    : calcNextDate(
        new Date(lastEvent!.startAt),
        series.recurrenceType as RecurrenceType,
        (series.recurrenceMonthlyMode ?? "dayOfMonth") as MonthlyMode,
        new Date(referenceEvent!.startAt),
        durationMs,
      );
  if (isNaN(nextDate.getTime())) return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  // Bei manuell überschriebenem Termin (overrideDate) trägt calcNextDate nicht das .endAt an —
  // Dauer hier stattdessen direkt auf den manuellen Termin anwenden.
  const nextEndAt = (nextDate as Date & { endAt?: Date }).endAt
    ?? (overrideDate && durationMs ? new Date(nextDate.getTime() + durationMs) : null);

  const game            = series.fixedGame ?? lastEvent?.game ?? null;
  const discordChannelId = series.discordChannelId ?? lastEvent?.discordChannelId ?? null;
  // Umfragen-Konfiguration erben: Reihe hat Vorrang, sonst vom letzten Event übernehmen
  const pollsConfigJson = series.pollsConfigJson ?? lastEvent?.pollsConfigJson ?? null;
  // Kategorie/Genre sind Reihen-weite Einstellungen (kein "fixed*"-Override-Konzept wie bei Spiel/Format) —
  // die Reihe ist hier die führende Quelle, mit dem letzten Event nur als Fallback.
  const category = series.category ?? lastEvent?.category ?? undefined;
  const genre    = series.genre    ?? lastEvent?.genre    ?? null;

  // Erstes Event der Reihe: kein Vorlagen-Event vorhanden, aus dem Standardwerte übernommen
  // werden könnten — Titel/Kapazität etc. fallen daher auf sinnvolle Defaults zurück.
  const newEvent = await prisma.event.create({
    data: {
      title: lastEvent ? nextTitle(lastEvent.title) : series.name,
      game,
      genre,
      category,
      startAt: nextDate,
      endAt: nextEndAt,
      maxPlayers:  lastEvent?.maxPlayers  ?? null,
      pointReward: lastEvent?.pointReward ?? 50,
      type:        lastEvent?.type        ?? "community",
      discordChannelId,
      seriesId,
      // Zuschauer-Modus und Sieger-Ermittlung sind reine Event-Einstellungen (keine Reihen-Felder) —
      // vom letzten Event übernehmen, damit sie nicht bei jeder Generierung verloren gehen.
      spectatorMode:         lastEvent?.spectatorMode       ?? false,
      spectatorRewardJson:   lastEvent?.spectatorRewardJson ?? null,
      ...(lastEvent?.seriesEventConfigJson && { seriesEventConfigJson: lastEvent.seriesEventConfigJson }),
      ...(series.fixedFormat && { format: series.fixedFormat }),
      ...(derivedStatFields()  !== null && { statFields:   derivedStatFields()  }),
      ...(pollsConfigJson && { pollsConfigJson }),
    },
  });

  // Legt die echten, abstimmbaren EventPoll-Datensätze an — ohne diesen Schritt gäbe es nur
  // die Konfiguration, aber keine Umfrage, auf die tatsächlich abgestimmt werden könnte.
  await createPollsForEvent(newEvent.id, newEvent.startAt, parsePollsConfigJson(pollsConfigJson));

  // Discord Scheduled Event + Kanal-Ankündigung + Push — gemeinsamer, fehlertoleranter Ablauf
  // (siehe lib/event-publish.ts), läuft nach der Antwort
  after(() => publishEvent(newEvent.id));

  return NextResponse.json({ ok: true, event: newEvent });
}

import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import { publishEvent } from "@/lib/event-publish";
import { createPollsForEvent, parsePollsConfigJson } from "@/lib/event-polls";
import { parseTournamentTemplate, templateEventFields } from "@/lib/series-seasons";
import { parseGameVoteConfig } from "@/lib/game-vote/rules";
import { createGameVote } from "@/lib/game-vote/service";
import { applyPlannedGoal } from "@/lib/goal-plan";

export type GenerateResult =
  | { ok: true; event: Awaited<ReturnType<typeof prisma.event.create>>; gameVote: { shortened?: boolean } | { error?: string } | null }
  | { ok: false; status: number; error: string };

/**
 * Legt den nächsten Termin einer Eventreihe an (Datum aus der Wiederholungsregel oder overrideDate),
 * übernimmt die Einstellungen des letzten Termins bzw. der Reihe und veröffentlicht ihn. Genutzt vom
 * Knopf "Nächsten Termin generieren" (generate/route.ts) und von der Zyklus-Automatik (lib/series-cycles.ts).
 * overrideDate: optionaler, manuell gewählter Termin — überschreibt den Vorschlag der Regel.
 * publish: false = nicht ankündigen (Aufrufer kümmert sich selbst darum)
 */
export async function generateNextSeriesEvent(seriesId: string, overrideDate?: string | Date | null, publish = true): Promise<GenerateResult> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        select: {
          startAt: true, endAt: true, title: true, maxPlayers: true, pointReward: true, type: true,
          discordChannelId: true, game: true, pollsConfigJson: true, category: true, genre: true,
          spectatorMode: true, spectatorRewardJson: true, seriesEventConfigJson: true, format: true,
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

  if (!series) return { ok: false, status: 404, error: "Eventreihe nicht gefunden" };
  if (series.status === "archived") {
    return { ok: false, status: 409, error: "Diese Saison ist abgeschlossen — neue Termine gehören in die aktuelle Saison." };
  }
  if (!series.recurrenceType && !overrideDate) return { ok: false, status: 400, error: "Keine Wiederholung konfiguriert — bitte Datum angeben" };

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
  if (isNaN(nextDate.getTime())) return { ok: false, status: 400, error: "Ungültiges Datum" };
  // Bei manuell überschriebenem Termin (overrideDate) trägt calcNextDate nicht das .endAt an —
  // Dauer hier stattdessen direkt auf den manuellen Termin anwenden.
  const nextEndAt = (nextDate as Date & { endAt?: Date }).endAt
    ?? (overrideDate && durationMs ? new Date(nextDate.getTime() + durationMs) : null);

  // Spielwahl (lib/game-vote): Termin entsteht als Platzhalter ohne Spiel, Mitglieder wählen es
  const gameVote        = parseGameVoteConfig(series.gameVoteJson).enabled;
  const game            = gameVote ? null : series.fixedGame ?? lastEvent?.game ?? null;
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
      // Turniervorlage der Reihe (Gruppenphase, Check-in, Punktemodus) — siehe lib/series-seasons.ts
      ...templateEventFields(parseTournamentTemplate(series.tournamentTemplateJson), series.fixedFormat ?? lastEvent?.format, seriesEventStatFieldsFromConfig(series.seriesStatConfig)),
      ...(derivedStatFields()  !== null && { statFields:   derivedStatFields()  }),
      ...(pollsConfigJson && { pollsConfigJson }),
    },
  });

  // Legt die echten, abstimmbaren EventPoll-Datensätze an — ohne diesen Schritt gäbe es nur
  // die Konfiguration, aber keine Umfrage, auf die tatsächlich abgestimmt werden könnte.
  await createPollsForEvent(newEvent.id, newEvent.startAt, parsePollsConfigJson(pollsConfigJson));

  // Geplantes Community-Ziel für diesen Zyklus übernehmen (lib/goal-plan.ts)
  await applyPlannedGoal(newEvent.id);

  // Spielwahl vor der Ankündigung anlegen, damit Discord "Wird per Abstimmung gewählt" zeigt
  const vote = gameVote ? await createGameVote(newEvent.id) : null;

  // Discord Scheduled Event + Kanal-Ankündigung + Push — gemeinsamer, fehlertoleranter Ablauf
  // (siehe lib/event-publish.ts), läuft nach der Antwort
  if (publish) after(() => publishEvent(newEvent.id));

  return { ok: true, event: newEvent, gameVote: vote?.ok ? { shortened: vote.shortened } : vote ? { error: vote.error } : null };
}

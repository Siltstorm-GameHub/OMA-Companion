import { seriesEventStatFieldsFromConfig, seriesTermStatFields } from "@/lib/series-stat-fields";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-publish";
import { parseTournamentTemplate, templateEventFields } from "@/lib/series-seasons";
import { parseGameVoteConfig } from "@/lib/game-vote/rules";
import { createGameVote } from "@/lib/game-vote/service";
import { parseTermTemplate, templateTermFields } from "@/lib/series-term-template";

export type GenerateResult =
  | { ok: true; event: Awaited<ReturnType<typeof prisma.event.create>>; gameVote: { shortened?: boolean } | { error?: string } | null }
  | { ok: false; status: number; error: string };

/** Ein anzulegender Termin: Zeitraum und Soll-Platz in der Regel (null = Sondertermin). */
export type SeriesTerm = { startAt: Date; endAt: Date | null; slotIndex: number | null };

/**
 * Legt einen Termin einer Eventreihe an — der einzige Weg dafür (Vorlauf-Automatik in
 * lib/series-schedule-server.ts, Knopf "Sondertermin" in generate/route.ts). Zeitraum und Platz kommen
 * vom Aufrufer (aus der Regel bzw. von Hand), Einstellungen wie Spieler-Limit, Zuschauer und
 * Sieger-Ermittlung vom letzten Termin der Reihe, Spiel/Format/Kategorie/Umfragen/Turniervorlage von
 * der Reihe. Das Community-Ziel erbt der Termin live von der Reihe (lib/event-goal.ts).
 * publish: false = nicht ankündigen (Aufrufer kümmert sich selbst darum)
 */
export async function createSeriesTerm(seriesId: string, term: SeriesTerm, publish = true): Promise<GenerateResult> {
  const series = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        orderBy: { startAt: "asc" },
        select: {
          startAt: true, title: true, maxPlayers: true, pointReward: true, type: true,
          discordChannelId: true, game: true, pollsConfigJson: true, category: true, genre: true,
          spectatorMode: true, spectatorRewardJson: true, seriesEventConfigJson: true, format: true,
          placementRewardsJson: true,
        },
      },
    },
  });

  if (!series) return { ok: false, status: 404, error: "Eventreihe nicht gefunden" };
  if (series.status === "archived") {
    return { ok: false, status: 409, error: "Diese Saison ist abgeschlossen — neue Termine gehören in die aktuelle Saison." };
  }
  if (isNaN(term.startAt.getTime())) return { ok: false, status: 400, error: "Ungültiges Datum" };
  if (term.endAt && term.endAt <= term.startAt) return { ok: false, status: 400, error: "Das Ende muss nach dem Start liegen" };

  // Fortlaufende Nummerierung ("Turnier #5" → "Turnier #6") — bleibt unverändert, falls kein
  // "#<Zahl>"-Suffix erkannt wird, damit Reihen ohne diese Konvention nicht verändert werden.
  function nextTitle(lastTitle: string): string {
    const m = lastTitle.match(/^(.*#)(\d+)(\s*)$/);
    return m ? `${m[1]}${Number(m[2]) + 1}${m[3]}` : lastTitle;
  }

  const lastEvent = series.events.length > 0 ? series.events[series.events.length - 1] : null;

  // Spielwahl (lib/game-vote): Termin entsteht als Platzhalter ohne Spiel, Mitglieder wählen es
  const gameVote        = parseGameVoteConfig(series.gameVoteJson).enabled;
  const game            = gameVote ? null : series.fixedGame ?? lastEvent?.game ?? null;
  const discordChannelId = series.discordChannelId ?? lastEvent?.discordChannelId ?? null;
  // Umfragen-Konfiguration erben: Reihe hat Vorrang, sonst vom letzten Event übernehmen
  const pollsConfigJson = series.pollsConfigJson ?? lastEvent?.pollsConfigJson ?? null;
  const category = series.category ?? lastEvent?.category ?? undefined;
  const genre    = series.genre    ?? lastEvent?.genre    ?? null;
  // Stat-Felder aus der Reihen-Konfiguration — gleiche Regel wie beim Übertragen (series-stat-fields.ts)
  const termFields = seriesTermStatFields(series.seriesStatConfig);
  const statFields = termFields.length ? JSON.stringify(termFields) : null;
  // Termin-Vorlage der Reihe (lib/series-term-template.ts) — ältere Reihen ohne Vorlage: vom letzten Termin
  const termTemplate = parseTermTemplate(series.termTemplateJson);
  const tplFields = termTemplate ? templateTermFields(termTemplate) : {
    maxPlayers: lastEvent?.maxPlayers ?? null,
    spectatorMode: lastEvent?.spectatorMode ?? false,
    spectatorRewardJson: lastEvent?.spectatorRewardJson ?? null,
  };

  let newEvent;
  try {
    newEvent = await prisma.event.create({
      data: {
        title: lastEvent ? nextTitle(lastEvent.title) : `${series.name} #1`,
        game,
        genre,
        category,
        startAt: term.startAt,
        endAt: term.endAt,
        slotIndex: term.slotIndex,
        maxPlayers:  tplFields.maxPlayers,
        pointReward: lastEvent?.pointReward ?? 0,
        type:        lastEvent?.type        ?? "community",
        discordChannelId,
        seriesId,
        // Community-Reihe: Ersteller und Freigabe-Stand der Reihe; ausgeblendete Reihe → Termin ausgeblendet
        // (sonst würde er angekündigt, siehe lib/event-publish.ts)
        createdById: series.createdById,
        approvalStatus: series.approvalStatus,
        hidden: series.hidden,
        // Spieler-Limit und Zuschauer aus der Termin-Vorlage; Sieger-Ermittlung und Platzierungs-
        // Belohnungen (Turnier-Einstellungen des Termins) weiter vom letzten Termin.
        spectatorMode:         tplFields.spectatorMode,
        spectatorRewardJson:   tplFields.spectatorRewardJson,
        ...(lastEvent?.seriesEventConfigJson && { seriesEventConfigJson: lastEvent.seriesEventConfigJson }),
        ...(lastEvent?.placementRewardsJson && { placementRewardsJson: lastEvent.placementRewardsJson }),
        ...(series.fixedFormat && { format: series.fixedFormat }),
        // Turniervorlage der Reihe (Gruppenphase, Check-in, Punktemodus) — siehe lib/series-seasons.ts
        ...templateEventFields(parseTournamentTemplate(series.tournamentTemplateJson), series.fixedFormat ?? lastEvent?.format, seriesEventStatFieldsFromConfig(series.seriesStatConfig)),
        ...(statFields !== null && { statFields }),
        ...(pollsConfigJson && { pollsConfigJson }),
      },
    });
  } catch (err) {
    // Platz schon belegt (gleichzeitiger Lauf von Cron und Speichern) — kein Fehler, nur nichts zu tun
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, status: 409, error: "Für diesen Platz gibt es schon einen Termin" };
    }
    throw err;
  }

  // Umfragen werden erst zum Ende der Spielphase angelegt (Abschluss bzw. Widget-Knopf, lib/event-polls.ts →
  // startPollsForEvent) — so gelten spätere Änderungen an der Einstellung und die Dauer zählt ab dann.

  // Spielwahl vor der Ankündigung anlegen, damit Discord "Wird per Abstimmung gewählt" zeigt
  const vote = gameVote ? await createGameVote(newEvent.id) : null;

  // Discord Scheduled Event + Kanal-Ankündigung + Push — gemeinsamer, fehlertoleranter Ablauf
  // (siehe lib/event-publish.ts), läuft nach der Antwort
  if (publish) after(() => publishEvent(newEvent.id));

  return { ok: true, event: newEvent, gameVote: vote?.ok ? { shortened: vote.shortened } : vote ? { error: vote.error } : null };
}

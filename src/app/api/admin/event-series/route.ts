import { eventGenreForGameName } from "@/lib/games/event-genre-server";
import { normalizeCategory } from "@/lib/event-category";
import { getCommunityLimits, seriesConfigLimits } from "@/lib/community-event-limits";
import { isPresetCover } from "@/lib/event-cover-presets";
import { freezeGoalForStartedEvent, parseOwnGoalConfig, withGoalMode } from "@/lib/event-goal";
import { GOAL_FORMATS } from "@/lib/community-goal";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireRole, requireSeriesManager, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { capCaptainRewardFields, capMatchResultPoints, capSpectatorRewardJson } from "@/lib/captain-reward-limits";
import { parseTermTemplate, sanitizeTermTemplate, templateTermFields } from "@/lib/series-term-template";
import { mergeTermStatFields, seriesTermStatFields } from "@/lib/series-stat-fields";
import { parseStatAliases, parseTournamentTemplate, serializeTournamentTemplate, templateEventFields } from "@/lib/series-seasons";
import { discardUnusedPolls } from "@/lib/event-polls";

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
 * }
 * Das Formular schickt beim Speichern immer alle Felder mit. Übertragen auf die noch offenen Termine
 * (nicht beendet/abgesagt; "closed" heißt nur "voll") wird deshalb nur, was sich gegenüber dem
 * gespeicherten Stand WIRKLICH geändert hat — sonst würde jedes Speichern eigene Werte einzelner
 * Termine (Spiel bei wechselnden Spielen, Zusatz-Stats, Umfragen, Kanal) still überschreiben.
 */
const OPEN_EVENT_STATUS_FILTER = { notIn: ["finished", "archived", "cancelled"] };

/** Gleicher Inhalt? JSON-Text normalisiert verglichen (leer/"[]"/null zählen als gleich). */
function sameJson(a: unknown, b: unknown): boolean {
  const norm = (v: unknown) => {
    if (v == null || v === "") return "null";
    try { const p = typeof v === "string" ? JSON.parse(v) : v; return Array.isArray(p) && p.length === 0 ? "null" : JSON.stringify(p); }
    catch { return String(v); }
  };
  return norm(a) === norm(b);
}
const SEASON_LOCKED_FIELDS = ["seriesStatConfig", "legacyStandings", "placementRewardsJson", "pollsConfigJson", "fixedGame", "fixedFormat"] as const;

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { seriesId, ...fields } = body;
  if (!seriesId) return NextResponse.json({ error: "seriesId fehlt" }, { status: 400 });

  const currentUser = await requireSeriesManager(seriesId);
  // Captains dürfen die Squad-Bindung ihrer Reihe nur auf ein eigenes Squad setzen, nicht entfernen
  // oder auf ein fremdes Squad umbiegen.
  if (!hasMinRole(currentUser.role, "moderator") && "squadId" in fields) {
    const captainedSquadIds = await getCaptainedSquadIds(currentUser.id);
    if (!fields.squadId || !captainedSquadIds.includes(fields.squadId)) delete fields.squadId;
  }
  // Belohnungen — für Nicht-Moderatoren auf die Community-Obergrenzen gekappt (Reihen-Konfiguration,
  // siehe lib/community-event-limits.ts). Ankündigungskanal und Freigabe bleiben Mods vorbehalten.
  const limits = hasMinRole(currentUser.role, "moderator") ? null : await getCommunityLimits();
  if (limits) {
    Object.assign(fields, capCaptainRewardFields(fields, seriesConfigLimits(limits)));
    delete fields.discordChannelId;
    delete fields.omaOriginal;
    // Cover: nur Vorlagen (oder entfernen) — eine eigene URL bleibt unverändert stehen
    if (fields.coverImageUrl && !isPresetCover(fields.coverImageUrl)) delete fields.coverImageUrl;
    // Altstand (Legacy-Punkte für beliebige Mitglieder) pflegen nur Mods
    delete fields.legacyStandings;
  }
  delete fields.hiddenByModAt;
  delete fields.approvalNote;
  // Terminplanung ändert nur die eigene Route (event-series/schedule) — dort wird zugeordnet und geprüft
  delete fields.scheduleMode;
  delete fields.scheduleJson;
  delete fields.recurrenceType;
  delete fields.recurrenceMonthlyMode;
  delete fields.cycleConfigJson;

  const current = await prisma.eventSeries.findUnique({
    where: { id: seriesId },
    select: {
      name: true, status: true, groupId: true, tournamentTemplateJson: true, hidden: true, hiddenByModAt: true,
      // Vergleichswerte: übertragen wird nur bei einer echten Änderung (siehe oben)
      fixedGame: true, fixedFormat: true, seriesStatConfig: true, pollsConfigJson: true, discordChannelId: true, category: true, genre: true,
    },
  });
  if (!current) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  // Von einem Mod ausgeblendet: nur Mods dürfen die Reihe wieder einblenden. Nur ein echter Wechsel
  // sichtbar → ausgeblendet durch einen Mod sperrt den Ersteller aus.
  let hiddenByModAt: Date | null | undefined;
  if (fields.hidden !== undefined) {
    fields.hidden = fields.hidden === true;
    if (!fields.hidden && limits && current.hiddenByModAt) {
      return NextResponse.json({ error: "Ein Mod hat diese Reihe ausgeblendet. Nur ein Mod kann sie wieder einblenden." }, { status: 403 });
    }
    if (!limits && fields.hidden && !current.hidden) hiddenByModAt = new Date();
    if (!limits && !fields.hidden) hiddenByModAt = null;
  }

  // Abgeschlossene Saison: Punkteregeln, Altstand, Belohnungen, Umfragen, Spiel und Format sind
  // eingefroren (die Endtabelle und Auszahlung beruhen darauf). Name, Texte und Aussehen bleiben änderbar.
  if (current.status === "archived") {
    for (const key of SEASON_LOCKED_FIELDS) delete fields[key];
  }

  // Turniervorlage für neue Termine — normalisiert, für Captains auf die Standard-Obergrenzen gekappt
  if (fields.tournamentTemplateJson !== undefined) {
    const t = parseTournamentTemplate(fields.tournamentTemplateJson);
    if (limits && t.matchResultPoints) t.matchResultPoints = capMatchResultPoints(t.matchResultPoints, limits.seriesEvent);
    fields.tournamentTemplateJson = serializeTournamentTemplate(t);
  }

  // Termin-Vorlage (lib/series-term-template.ts) — normalisiert, Zuschauer-Belohnung für Mitglieder gekappt
  if (fields.termTemplateJson !== undefined) {
    let raw: unknown = fields.termTemplateJson;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = null; } }
    const tpl = sanitizeTermTemplate(raw);
    if (tpl && limits) {
      const capped = capSpectatorRewardJson(JSON.stringify(tpl.spectatorReward), limits.seriesEvent);
      if (typeof capped === "string") tpl.spectatorReward = sanitizeTermTemplate({ spectatorReward: JSON.parse(capped) })!.spectatorReward;
    }
    fields.termTemplateJson = tpl ? JSON.stringify(tpl) : null;
  }

  // Stat-Aliase der All-Time-Tabelle gelten für die ganze Saison-Gruppe
  if (fields.statAliasesJson !== undefined) {
    const aliases = parseStatAliases(fields.statAliasesJson);
    const json = Object.keys(aliases).length > 0 ? JSON.stringify(aliases) : null;
    await prisma.eventSeries.updateMany({
      where: current.groupId ? { groupId: current.groupId } : { id: seriesId },
      data: { statAliasesJson: json },
    });
    delete fields.statAliasesJson;
  }

  // Alten Namen merken, um die Event-Titel unten ggf. anzupassen
  const oldSeries = fields.name !== undefined ? current : null;

  // Festes Spiel gewechselt und kein Genre gesetzt → Genre aus der Spieleliste
  const gameChanged = fields.fixedGame !== undefined && (fields.fixedGame || null) !== (current.fixedGame ?? null);
  const derivedGenre = gameChanged && fields.fixedGame && !fields.genre ? await eventGenreForGameName(fields.fixedGame) : null;

  // 1) Reihe selbst aktualisieren
  const series = await prisma.eventSeries.update({
    where: { id: seriesId },
    data: {
      ...(fields.name                 !== undefined && { name:                 fields.name }),
      ...(fields.description          !== undefined && { description:          fields.description }),
      ...(fields.rules                !== undefined && { rules:                fields.rules }),
      ...(fields.icon                 !== undefined && { icon:                 fields.icon || null }),
      ...(fields.coverImageUrl        !== undefined && { coverImageUrl:        fields.coverImageUrl || null }),
      ...(fields.genre                !== undefined && { genre:                fields.genre || null }),
      ...(derivedGenre && { genre: derivedGenre }),
      ...(fields.platform             !== undefined && { platform:             fields.platform }),
      ...(fields.fixedGame            !== undefined && { fixedGame:            fields.fixedGame }),
      ...(fields.fixedFormat          !== undefined && { fixedFormat:          fields.fixedFormat }),
      ...(fields.discordChannelId     !== undefined && { discordChannelId:     fields.discordChannelId }),
      ...(fields.seriesStatConfig      !== undefined && { seriesStatConfig:      fields.seriesStatConfig }),
      ...(fields.legacyStandings       !== undefined && { legacyStandings:       fields.legacyStandings }),
      ...(fields.placementRewardsJson  !== undefined && { placementRewardsJson:  fields.placementRewardsJson }),
      ...(fields.pollsConfigJson        !== undefined && { pollsConfigJson:       fields.pollsConfigJson }),
      ...(fields.category              !== undefined && { category:              normalizeCategory(fields.category) ?? "fun" }),
      ...(fields.hidden                !== undefined && { hidden:                fields.hidden }),
      ...(hiddenByModAt                !== undefined && { hiddenByModAt }),
      ...(fields.registrationLocked    !== undefined && { registrationLocked:    fields.registrationLocked }),
      // OMA Original — nur Mods (für Captains oben entfernt), siehe lib/oma-original.ts
      ...(fields.omaOriginal           !== undefined && { omaOriginal:           fields.omaOriginal === true }),
      ...(fields.squadId               !== undefined && { squadId:               fields.squadId || null }),
      ...(fields.tournamentTemplateJson !== undefined && { tournamentTemplateJson: fields.tournamentTemplateJson }),
      ...(fields.termTemplateJson      !== undefined && { termTemplateJson:      fields.termTemplateJson }),
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

  // 1c) Community-Ziel der Reihe — Termine erben es live (lib/event-goal.ts).
  //   - Ändert sich das Reihen-Ziel (geändert, neu hinzugekommen oder entfernt), behalten bereits
  //     GESTARTETE Termine (laufend oder beendet), die bisher geerbt haben, was für sie galt: das alte
  //     Ziel bzw. "kein Ziel" wird dort eingefroren (freezeGoalForStartedEvent). Kommende Termine, die
  //     erben, übernehmen das neue automatisch.
  //   - Kommende Termine mit eigenem Ziel (oder "kein Ziel") bleiben, wie sie sind — außer mit
  //     applyGoalToOpenEvents (Rückfrage beim Speichern bzw. Knopf "Abweichungen zurücksetzen"):
  //     dann folgen auch sie wieder dem Ziel der Reihe.
  const oldTemplateGoal = parseTournamentTemplate(current.tournamentTemplateJson).communityGoal ?? null;
  const newTemplateGoal = parseTournamentTemplate(series.tournamentTemplateJson).communityGoal ?? null;
  const goalNow = new Date();
  if (JSON.stringify(oldTemplateGoal) !== JSON.stringify(newTemplateGoal)) {
    const started = await prisma.event.findMany({
      where: { seriesId, format: { in: [...GOAL_FORMATS] }, startAt: { lte: goalNow } },
      select: { id: true, statConfigJson: true },
    });
    for (const ev of started) {
      const next = freezeGoalForStartedEvent(ev.statConfigJson, oldTemplateGoal);
      if (next === undefined) continue; // hat schon eine eigene Einstellung
      await prisma.event.update({ where: { id: ev.id }, data: { statConfigJson: next } });
    }
  }
  if (fields.applyGoalToOpenEvents === true) {
    const upcoming = await prisma.event.findMany({
      where: { seriesId, format: { in: [...GOAL_FORMATS] }, startAt: { gt: goalNow }, status: OPEN_EVENT_STATUS_FILTER },
      select: { id: true, statConfigJson: true },
    });
    for (const ev of upcoming) {
      const own = parseOwnGoalConfig(ev.statConfigJson);
      if (!own.goal && !own.off) continue;
      await prisma.event.update({
        where: { id: ev.id },
        data: { statConfigJson: withGoalMode(ev.statConfigJson, "inherit", null) },
      });
    }
  }

  // 1d) Turniervorlage (Check-in, Gruppenphase, Liga-Punkte) — bisher nur beim Anlegen kopiert. Bei einer
  //     Änderung auf kommende, noch nicht ausgeloste Termine übertragen; laufende bleiben unverändert.
  if (fields.tournamentTemplateJson !== undefined) {
    const oldT = parseTournamentTemplate(current.tournamentTemplateJson);
    const newT = parseTournamentTemplate(series.tournamentTemplateJson);
    const key = (t: typeof newT) => JSON.stringify({ g: t.groupStage ?? null, c: t.checkInEnabled ? (t.checkInMinutes ?? null) : false, m: t.matchResultPoints ?? null });
    if (key(oldT) !== key(newT)) {
      const upcoming = await prisma.event.findMany({
        where: { seriesId, startAt: { gt: goalNow }, status: OPEN_EVENT_STATUS_FILTER, matches: { none: {} } },
        select: { id: true, format: true },
      });
      for (const ev of upcoming) {
        const f = templateEventFields(newT, ev.format);
        await prisma.event.update({
          where: { id: ev.id },
          data: {
            checkInEnabled: f.checkInEnabled ?? false,
            ...(f.checkInMinutes && { checkInMinutes: f.checkInMinutes }),
            ...(f.groupStageJson && { groupStageJson: f.groupStageJson }),
            ...(f.pointsConfig && { pointsConfig: f.pointsConfig }),
          },
        });
      }
    }
  }

  // 2) Neues festes Spiel auf alle noch offenen Termine übertragen. Wechsel auf "verschiedene Spiele"
  //    (kein festes Spiel) lässt die Spiele der Termine stehen.
  if (gameChanged && fields.fixedGame) {
    await prisma.event.updateMany({
      where: { seriesId, status: OPEN_EVENT_STATUS_FILTER },
      data:  { game: fields.fixedGame, ...(derivedGenre && { genre: derivedGenre }) },
    });
  }

  // 2b) Kategorie und Genre der Reihe auf die offenen Termine übertragen (Übersicht und Filter lesen die des Termins)
  const categoryChanged = fields.category !== undefined && series.category !== current.category;
  const genreChanged = series.genre !== current.genre;
  if (categoryChanged || genreChanged) {
    await prisma.event.updateMany({
      where: { seriesId, status: OPEN_EVENT_STATUS_FILTER },
      data: { ...(categoryChanged && { category: series.category }), ...(genreChanged && { genre: series.genre }) },
    });
  }

  // 3) Turnierformat auf alle noch offenen Events übertragen. Platzierungsbelohnungen werden nicht
  //    mehr in Event.pointsConfig kopiert — sie kommen beim Abschluss aus placementRewardsJson
  //    (Event, sonst Reihe), siehe lib/placement-rewards.ts.
  if (fields.fixedFormat && fields.fixedFormat !== current.fixedFormat) {
    await prisma.event.updateMany({
      where: { seriesId, status: OPEN_EVENT_STATUS_FILTER },
      data:  { format: fields.fixedFormat },
    });
  }

  // 3b) Getrackte Stats je Event (seriesStatConfig.eventStatFields / stats) auf alle noch offenen
  //     Events der Reihe übertragen — abgeschlossene Events bleiben unverändert.
  //     Nur wenn sich die Felder der Reihe ändern; Zusatz-Stats einzelner Termine bleiben erhalten.
  if (fields.seriesStatConfig !== undefined) {
    const oldFields = seriesTermStatFields(current.seriesStatConfig);
    const newFields = seriesTermStatFields(fields.seriesStatConfig);
    if (JSON.stringify(oldFields) !== JSON.stringify(newFields)) {
      const openEvents = await prisma.event.findMany({ where: { seriesId, status: OPEN_EVENT_STATUS_FILTER }, select: { id: true, statFields: true } });
      for (const ev of openEvents) {
        let own: string[] | null = null;
        try { own = ev.statFields ? JSON.parse(ev.statFields) as string[] : null; } catch { own = null; }
        const merged = mergeTermStatFields(own, oldFields, newFields);
        const json = merged.length ? JSON.stringify(merged) : null;
        if (json !== ev.statFields) await prisma.event.update({ where: { id: ev.id }, data: { statFields: json } });
      }
    }
  }

  // 4) hidden auf alle Events der Reihe übertragen
  if (fields.hidden !== undefined) {
    await prisma.event.updateMany({
      // Abgesagte Termine bleiben ausgeblendet (lib/event-cancel.ts)
      where: { seriesId, status: { not: "cancelled" } },
      data:  { hidden: fields.hidden, ...(hiddenByModAt !== undefined && { hiddenByModAt }) },
    });
  }

  // 5) Umfragen auf alle noch offenen Events übertragen — nur bei einer echten Änderung
  if (fields.pollsConfigJson !== undefined && sameJson(fields.pollsConfigJson, current.pollsConfigJson) === false) {
    await prisma.event.updateMany({
      where: { seriesId, status: OPEN_EVENT_STATUS_FILTER },
      data:  { pollsConfigJson: fields.pollsConfigJson },
    });
    // Früher vorab angelegte, unbenutzte Umfragen verwerfen — sie entstehen zum Ende der Spielphase
    // neu, dann mit der neuen Einstellung (lib/event-polls.ts → startPollsForEvent)
    const openEvents = await prisma.event.findMany({ where: { seriesId, status: OPEN_EVENT_STATUS_FILTER }, select: { id: true } });
    for (const ev of openEvents) await discardUnusedPolls(ev.id);
  }

  // 5b) Termin-Vorlage auf kommende, noch nicht gestartete Termine übertragen (auf Wunsch)
  if (fields.termTemplateJson && fields.applyTermTemplateToUpcoming === true) {
    const tpl = parseTermTemplate(fields.termTemplateJson);
    if (tpl) {
      await prisma.event.updateMany({
        where: { seriesId, startAt: { gt: new Date() }, status: { in: ["open", "closed"] } },
        data: templateTermFields(tpl),
      });
    }
  }

  // 6) Discord-Kanal auf alle Events der Reihe übertragen — bei einer Änderung des Reihen-Kanals
  if (fields.discordChannelId !== undefined && (fields.discordChannelId || null) !== (current.discordChannelId ?? null)) {
    await prisma.event.updateMany({
      where: { seriesId },
      data:  { discordChannelId: fields.discordChannelId || null },
    });
  }

  revalidateTag("dashboard-global", { expire: 0 });

  return NextResponse.json({ ok: true, series });
}

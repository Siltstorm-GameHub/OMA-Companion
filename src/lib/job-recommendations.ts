import { prisma } from "./prisma";
import { getWeekBounds } from "./community-job-service";
import { getCurrentSteamSales, getRecentSteamReleases, type SteamFeedItem } from "./steam-feed";

/**
 * Handlungsempfehlungen fürs Büro: interne Vorschläge (Events ohne Beitrag)
 * + Realwelt-Bezug (Steam). Siehe Plan-Abschnitt "Empfehlungen". Zählt auch
 * für das Benachrichtigungs-Badge auf dem Profil-Reiter.
 */

const LOOKBACK_DAYS = 14;
const LOOKAHEAD_DAYS = 14;

export interface EventRecommendation {
  eventId: string;
  title: string;
  startAt: Date;
  reason: string;
  /** Ziel-URL innerhalb der App, z.B. die Event-Detailseite — leer, wenn kein sinnvolles Ziel existiert. */
  url?: string;
  /** Kurzer Dringlichkeits-Hinweis ("vor 3 Tagen", "läuft in 2 Tagen ab", "in 5 Tagen") — leer bei zeitlosen Hinweisen. */
  urgency?: string;
  /** true = kurz vor Ablauf des Empfehlungs-Fensters, wird in der UI hervorgehoben. */
  urgent?: boolean;
  /** true = `eventId` ist ein echtes Event (Formular wird damit vorbelegt) — sonst ein Hinweis ohne Event-Bezug. */
  eventScoped?: boolean;
  /** Vorlage für einen Rückblick (Journalist): der Editor füllt Titel/Text aus den Community-Daten. */
  recap?: "week" | "month";
  /** Fotograf: Upload erfüllt diesen Bildwunsch (Formular wird vorbelegt). */
  photoRequestId?: string;
  /** Marketing: echtes Event, auf das sich die Empfehlung bezieht (eventId ist dann nur der Ausblend-Schlüssel). */
  scopeEventId?: string;
  /** Marketing: Werbetext-Baustein, mit dem das Formular startet (announce | reminder | lastspots | today). */
  postTemplate?: string;
  /** Fotograf: Monats-Collage aus den beliebtesten Bildern erstellen. */
  collage?: boolean;
  /** true = kein "Erstellen"-Button (z.B. "Anwesenheit eintragen" — dort gibt es nichts zu erstellen). */
  noCreate?: boolean;
}

export interface JobRecommendations {
  events: EventRecommendation[];
  steamSales: SteamFeedItem[];
  steamReleases: SteamFeedItem[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/** Für Empfehlungen zu bereits vergangenen Events, die aus dem LOOKBACK_DAYS-Fenster fallen. */
function pastEventUrgency(startAt: Date): { urgency: string; urgent: boolean } {
  const ageDays = Math.max(0, daysBetween(new Date(), startAt));
  const daysLeft = LOOKBACK_DAYS - ageDays;
  if (daysLeft <= 3) return { urgency: daysLeft <= 0 ? "Läuft heute ab" : `Läuft in ${daysLeft}d ab`, urgent: true };
  return { urgency: ageDays === 0 ? "Heute" : `vor ${ageDays}d`, urgent: false };
}

/** Für Empfehlungen zu bevorstehenden Events (z.B. noch keine Werbung). */
function upcomingEventUrgency(startAt: Date): { urgency: string; urgent: boolean } {
  const daysUntil = Math.max(0, daysBetween(startAt, new Date()));
  if (daysUntil === 0) return { urgency: "Heute", urgent: true };
  if (daysUntil === 1) return { urgency: "Morgen", urgent: true };
  return { urgency: `in ${daysUntil}d`, urgent: daysUntil <= 3 };
}

async function eventsWithoutReports(): Promise<EventRecommendation[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  const events = await prisma.event.findMany({
    where: {
      hidden: false, status: "finished", startAt: { gte: since },
      jobReports: { none: { hiddenByAdminAt: null, isDraft: false } },
    },
    orderBy: { startAt: "desc" },
    take: 10,
    include: { _count: { select: { registrations: true } } },
  });
  // Events mit vielen Teilnehmern zuerst — dort lohnt ein Bericht am meisten.
  return events
    .sort((a, b) => b._count.registrations - a._count.registrations)
    .map(e => ({
      eventId: e.id, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`,
      reason: e._count.registrations > 0 ? `Noch kein Bericht · ${e._count.registrations} Teilnehmer` : "Noch kein Bericht",
      ...pastEventUrgency(e.startAt),
    }));
}

/** Berliner Kalenderdatum (Jahr/Monat/Tag) und Anzahl Tage des Monats. */
function berlinDateParts(d: Date): { year: number; month: number; day: number; daysInMonth: number } {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(d);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
  const year = get("year"), month = get("month"), day = get("day");
  return { year, month, day, daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

/**
 * Journalist-Empfehlungen: Events ohne Bericht (nach Teilnehmerzahl), Events heute, alte Entwürfe,
 * Berichte ohne Titelbild, neue Ergänzungen zu eigenen Berichten, kurze Berichte anderer zum Ergänzen
 * und am Monatsende der Monatsrückblick.
 */
async function journalistRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const now = new Date();
  const recs: EventRecommendation[] = await eventsWithoutReports();

  const endOfToday = new Date(now.getTime() + 24 * 3_600_000);
  const [todayEvents, oldDrafts, noCover, contributions, others] = await Promise.all([
    prisma.event.findMany({
      where: { hidden: false, startAt: { gte: now, lte: endOfToday } }, orderBy: { startAt: "asc" }, take: 3,
    }),
    prisma.jobReport.findMany({
      where: { authorId: userId, isDraft: true, updatedAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } },
      orderBy: { updatedAt: "asc" }, take: 3, select: { id: true, title: true, updatedAt: true },
    }),
    prisma.jobReport.findMany({
      where: { authorId: userId, isDraft: false, coverAssetId: null, publishedAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      orderBy: { publishedAt: "desc" }, take: 3, select: { id: true, title: true },
    }),
    prisma.jobReportContribution.findMany({
      where: { report: { authorId: userId, isDraft: false }, authorId: { not: userId }, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } },
      select: { report: { select: { id: true, title: true } } },
    }),
    prisma.jobReport.findMany({
      where: { authorId: { not: userId }, isDraft: false, hiddenByAdminAt: null, publishedAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
      orderBy: { publishedAt: "desc" }, take: 20,
      select: { id: true, title: true, bodyMarkdown: true, contributions: { where: { authorId: userId }, select: { id: true } } },
    }),
  ]);

  for (const e of todayEvents) {
    recs.push({
      eventId: e.id, title: e.title, startAt: e.startAt, reason: "Heute — Vorbericht schreiben",
      url: `/tournament/${e.id}`, eventScoped: true, urgency: "Heute", urgent: true,
    });
  }
  for (const d of oldDrafts) {
    const age = Math.max(7, daysBetween(now, d.updatedAt));
    recs.push({
      eventId: `journalist-draft-${d.id}`, title: d.title, startAt: d.updatedAt, reason: `Entwurf liegt seit ${age} Tagen`,
      url: "/profile", noCreate: true, urgency: `vor ${age}d`, urgent: false,
    });
  }
  for (const r of noCover) {
    recs.push({
      eventId: `journalist-nocover-${r.id}`, title: r.title, startAt: now, reason: "Noch kein Titelbild",
      url: `/community-board/report/${r.id}`, noCreate: true,
    });
  }
  const contribByReport = new Map<string, { title: string; count: number }>();
  for (const c of contributions) {
    const cur = contribByReport.get(c.report.id) ?? { title: c.report.title, count: 0 };
    cur.count += 1;
    contribByReport.set(c.report.id, cur);
  }
  for (const [id, v] of contribByReport) {
    recs.push({
      eventId: `journalist-contrib-${id}`, title: v.title, startAt: now,
      reason: `${v.count} neue ${v.count === 1 ? "Ergänzung" : "Ergänzungen"} — vielleicht überarbeiten`,
      url: `/community-board/report/${id}`, noCreate: true,
    });
  }
  for (const r of others.filter(x => x.bodyMarkdown.length < 700 && x.contributions.length === 0).slice(0, 3)) {
    recs.push({
      eventId: `journalist-short-${r.id}`, title: r.title, startAt: now, reason: "Kurzer Bericht — vielleicht ergänzen?",
      url: `/community-board/report/${r.id}`, noCreate: true,
    });
  }

  const { year, month, day, daysInMonth } = berlinDateParts(now);
  if (day >= daysInMonth - 2) {
    recs.push({
      eventId: `journalist-recap-month-${year}-${month}`, title: "Monatsrückblick", startAt: now,
      reason: "Der Monat endet bald — die Vorlage füllt sich aus den Community-Daten", url: "/profile", recap: "month",
    });
  }
  return recs;
}

const MANY_PARTICIPANTS = 8;
const FEW_ASSETS = 3;

/**
 * Fotograf-Empfehlungen: beendete Events ohne/mit wenigen Bildern (nach Teilnehmerzahl), Events heute,
 * Bildwünsche, die seit über 3 Tagen offen sind, eigene Bilder ohne Bildunterschrift und
 * zum Monatsende die Monats-Collage.
 */
async function fotografRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000);
  const visibleAssets = { where: { hiddenByAdminAt: null } };

  const [finished, todayEvents, staleRequests, noCaption, recentCollage] = await Promise.all([
    prisma.event.findMany({
      where: { hidden: false, status: "finished", startAt: { gte: since } },
      orderBy: { startAt: "desc" }, take: 15,
      include: { _count: { select: { registrations: true, jobMediaAssets: visibleAssets } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, status: { not: "finished" }, startAt: { gte: new Date(now.getTime() - 6 * 3_600_000), lte: new Date(now.getTime() + 24 * 3_600_000) } },
      orderBy: { startAt: "asc" }, take: 3,
    }),
    prisma.photoRequest.findMany({
      where: { status: "OPEN", createdAt: { lt: new Date(now.getTime() - 3 * 86_400_000) } },
      orderBy: { createdAt: "asc" }, take: 3,
    }),
    prisma.jobMediaAsset.count({ where: { authorId: userId, hiddenByAdminAt: null, caption: null, type: { not: "CLIP" } } }),
    prisma.jobMediaAsset.count({
      where: { authorId: userId, type: "COLLAGE", caption: { startsWith: "Bilder des Monats" }, createdAt: { gte: new Date(now.getTime() - 10 * 86_400_000) } },
    }),
  ]);

  const recs: EventRecommendation[] = [];

  // Beendete Events: ganz ohne Bilder, oder viele Teilnehmer und nur wenige Bilder — größte Events zuerst.
  const lacking = finished
    .filter(e => e._count.jobMediaAssets === 0 || (e._count.registrations >= MANY_PARTICIPANTS && e._count.jobMediaAssets < FEW_ASSETS))
    .sort((a, b) => b._count.registrations - a._count.registrations)
    .slice(0, 10);
  for (const e of lacking) {
    const n = e._count.jobMediaAssets;
    const people = e._count.registrations;
    recs.push({
      eventId: e.id, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`,
      reason: n === 0
        ? (people > 0 ? `Noch keine Fotos/Clips · ${people} Teilnehmer` : "Noch keine Fotos/Clips")
        : `Nur ${n} ${n === 1 ? "Bild" : "Bilder"} bei ${people} Teilnehmern`,
      ...pastEventUrgency(e.startAt),
    });
  }

  for (const e of todayEvents) {
    recs.push({
      eventId: e.id, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`, eventScoped: true,
      reason: "Heute — Screenshots und Clips festhalten", urgency: "Heute", urgent: true,
    });
  }

  if (staleRequests.length > 0) {
    const events = await prisma.event.findMany({
      where: { id: { in: staleRequests.map(r => r.eventId).filter((x): x is string => !!x) } }, select: { id: true, title: true },
    });
    const titleById = new Map(events.map(e => [e.id, e.title]));
    for (const r of staleRequests) {
      const age = daysBetween(now, r.createdAt);
      recs.push({
        eventId: `fotograf-request-${r.id}`, title: r.description.slice(0, 80), startAt: r.createdAt,
        reason: `Bildwunsch offen${r.eventId && titleById.get(r.eventId) ? ` · ${titleById.get(r.eventId)}` : ""}`,
        photoRequestId: r.id, urgency: `seit ${age}d`, urgent: age >= 7,
      });
    }
  }

  if (noCaption > 0) {
    recs.push({
      eventId: `fotograf-nocaption-${noCaption}`, title: `${noCaption} ${noCaption === 1 ? "Bild" : "Bilder"} ohne Bildunterschrift`, startAt: now,
      reason: "Mit Beschreibung werden Bilder besser gefunden und genutzt", url: "/profile", noCreate: true,
    });
  }

  // Monatsende (letzte 3 Tage) bzw. Monatsanfang (erste 3 Tage → Vormonat): Monats-Collage.
  const { year, month, day, daysInMonth } = berlinDateParts(now);
  if ((day >= daysInMonth - 2 || day <= 3) && recentCollage === 0) {
    recs.push({
      eventId: `fotograf-collage-${year}-${month}-${day <= 3 ? "prev" : "cur"}`, title: "Bilder des Monats", startAt: now,
      reason: "Collage aus den beliebtesten Bildern der Community erstellen", collage: true, url: "/profile",
    });
  }
  return recs;
}

/**
 * Coach-Empfehlungen (grobe Heuristiken, kein Muss für v1):
 *  - kein anstehender eigener Termin
 *  - neue Spieler (< 14 Tage dabei) ohne jede Trainings-Anmeldung
 *  - anstehende Events (Spiel bekannt) ohne Vorbereitungs-Training
 *  - eigener Termin in den nächsten 48h ohne Anmeldungen
 *  - vergangener eigener Termin (14 Tage) mit noch nicht eingetragener Anwesenheit
 */
async function coachRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const now = new Date();
  const recs: EventRecommendation[] = [];

  const [upcomingOwn, newcomers, eventsWithoutTraining, emptySoon, unmarkedPast, openHelp] = await Promise.all([
    prisma.coachTrainingSession.count({ where: { coachId: userId, startAt: { gte: now } } }),
    prisma.user.count({
      where: {
        id: { not: userId },
        createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) },
        coachTrainingSignups: { none: {} },
      },
    }),
    prisma.event.findMany({
      where: { hidden: false, game: { not: null }, startAt: { gte: now, lte: new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000) } },
      orderBy: { startAt: "asc" }, take: 20,
    }),
    prisma.coachTrainingSession.findMany({
      where: { coachId: userId, startAt: { gte: now, lte: new Date(now.getTime() + 2 * 86_400_000) }, signups: { none: {} } },
      orderBy: { startAt: "asc" }, take: 5,
    }),
    prisma.coachTrainingSession.findMany({
      where: {
        coachId: userId, startAt: { lt: now, gte: new Date(now.getTime() - 14 * 86_400_000) },
        signups: { some: { attended: null } },
      },
      orderBy: { startAt: "desc" }, take: 5,
    }),
    prisma.coachHelpRequest.count({ where: { coachId: userId, status: "OPEN" } }),
  ]);

  if (openHelp > 0) {
    recs.push({
      eventId: "coach-open-help", title: openHelp === 1 ? "1 offene Hilfe-Anfrage" : `${openHelp} offene Hilfe-Anfragen`,
      startAt: now, reason: "Jemand wartet auf deine Antwort", url: "/profile", noCreate: true, urgent: true,
    });
  }

  if (upcomingOwn === 0) {
    recs.push({
      eventId: "coach-no-upcoming-session", title: "Noch kein Trainings-Termin geplant",
      startAt: now, reason: "Lege einen neuen Trainings-Termin an, um neuen Spielern zu helfen",
      url: "/profile", // führt zurück ins eigene Büro, wo der Termin angelegt wird
    });
  }

  if (newcomers > 0) {
    recs.push({
      eventId: "coach-newcomers", title: newcomers === 1 ? "1 neuer Spieler ohne Training" : `${newcomers} neue Spieler ohne Training`,
      startAt: now, reason: "Lade sie zu einem Einsteiger-Termin ein", url: "/profile",
    });
  }

  if (eventsWithoutTraining.length > 0) {
    const covered = await prisma.coachTrainingSession.findMany({
      where: { eventId: { in: eventsWithoutTraining.map(e => e.id) } }, select: { eventId: true },
    });
    const coveredIds = new Set(covered.map(c => c.eventId));
    for (const e of eventsWithoutTraining.filter(ev => !coveredIds.has(ev.id)).slice(0, 5)) {
      recs.push({
        eventId: e.id, title: e.title, startAt: e.startAt, reason: `Noch kein Vorbereitungs-Training${e.game ? ` (${e.game})` : ""}`,
        url: `/tournament/${e.id}`, eventScoped: true, ...upcomingEventUrgency(e.startAt),
      });
    }
  }

  for (const s of emptySoon) {
    recs.push({
      eventId: `coach-empty-${s.id}`, title: s.title, startAt: s.startAt, reason: "Noch keine Anmeldungen",
      url: "/profile", noCreate: true, ...upcomingEventUrgency(s.startAt),
    });
  }

  for (const s of unmarkedPast) {
    recs.push({
      eventId: `coach-attendance-${s.id}`, title: s.title, startAt: s.startAt, reason: "Anwesenheit noch nicht eingetragen",
      url: "/profile", noCreate: true, ...pastEventUrgency(s.startAt),
    });
  }

  return recs;
}

/** Visionär hat diese Woche noch keine Idee eingereicht — analog zum Coach-Hinweis oben. */
async function visionaerRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const { weekStart, weekEnd } = getWeekBounds(new Date());
  const submittedThisWeek = await prisma.communityIdea.count({
    where: { authorId: userId, createdAt: { gte: weekStart, lt: weekEnd } },
  });
  if (submittedThisWeek > 0) return [];
  return [{
    eventId: "visionaer-no-idea-this-week", title: "Diese Woche noch keine Idee eingereicht",
    startAt: new Date(), reason: "Reiche eine neue Idee ein, damit die Community sie bewerten kann",
    url: "/profile",
  }];
}

const FEW_REGISTRATIONS = 5;

/**
 * Marketing-Empfehlungen: Events ohne Werbe-Post (14 Tage), Erinnerung kurz vor dem Start, wenige
 * Anmeldungen, eigene Posts ohne Bild und wiederkehrende Events, deren Vorgänger beworben wurde.
 */
async function marketingRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const now = new Date();
  const recs: EventRecommendation[] = [];
  const seenEvents = new Set<string>();

  const until = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000);
  const noPost = await prisma.event.findMany({
    where: { hidden: false, startAt: { gte: now, lte: until }, marketingPosts: { none: { hiddenByAdminAt: null } } },
    orderBy: { startAt: "asc" }, take: 10,
  });
  for (const e of noPost) {
    seenEvents.add(e.id);
    recs.push({
      eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch keine Werbung", url: `/tournament/${e.id}`,
      ...upcomingEventUrgency(e.startAt),
    });
  }

  const soon = new Date(now.getTime() + 48 * 3_600_000);
  const [reminderCandidates, fewRegistrations, noImage, seriesCandidates, precedents] = await Promise.all([
    prisma.event.findMany({
      where: { hidden: false, startAt: { gte: now, lte: soon }, marketingPosts: { some: { hiddenByAdminAt: null } } },
      orderBy: { startAt: "asc" }, take: 5,
      select: { id: true, title: true, startAt: true, marketingPosts: { where: { hiddenByAdminAt: null }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, status: { not: "finished" }, startAt: { gte: now, lte: new Date(now.getTime() + 3 * 86_400_000) } },
      orderBy: { startAt: "asc" }, take: 10,
      select: { id: true, title: true, startAt: true, _count: { select: { registrations: true } } },
    }),
    prisma.marketingPost.findMany({
      where: {
        authorId: userId, hiddenByAdminAt: null, imageUrl: null, assetId: null,
        createdAt: { gte: new Date(now.getTime() - 14 * 86_400_000) }, event: { startAt: { gte: now } },
      },
      orderBy: { createdAt: "desc" }, take: 3, select: { id: true, caption: true, event: { select: { title: true, startAt: true } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, startAt: { gt: until, lte: new Date(now.getTime() + 30 * 86_400_000) }, marketingPosts: { none: { hiddenByAdminAt: null } } },
      orderBy: { startAt: "asc" }, take: 15, select: { id: true, title: true, startAt: true, game: true, seriesId: true },
    }),
    prisma.event.findMany({
      where: { hidden: false, startAt: { lt: now, gte: new Date(now.getTime() - 90 * 86_400_000) }, marketingPosts: { some: { hiddenByAdminAt: null } } },
      select: { game: true, seriesId: true },
    }),
  ]);

  // Erinnerung: Event heute/morgen, der letzte Post ist älter als 3 Tage.
  for (const e of reminderCandidates) {
    const last = e.marketingPosts[0]?.createdAt;
    if (!last || now.getTime() - last.getTime() < 3 * 86_400_000) continue;
    const age = daysBetween(now, last);
    seenEvents.add(e.id);
    recs.push({
      eventId: `marketing-remind-${e.id}`, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`,
      reason: `Letzter Post vor ${age} Tagen — Erinnerung schreiben`, scopeEventId: e.id,
      postTemplate: e.startAt.getTime() - now.getTime() < 24 * 3_600_000 ? "today" : "reminder",
      ...upcomingEventUrgency(e.startAt),
    });
  }

  // Wenige Anmeldungen kurz vor dem Start (nur, wenn es nicht schon eine der Empfehlungen oben gibt).
  for (const e of fewRegistrations) {
    if (seenEvents.has(e.id) || e._count.registrations >= FEW_REGISTRATIONS) continue;
    const n = e._count.registrations;
    recs.push({
      eventId: `marketing-few-${e.id}`, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`,
      reason: n === 0 ? "Noch keine Anmeldungen — kurz vor dem Start" : `Nur ${n} ${n === 1 ? "Anmeldung" : "Anmeldungen"} — kurz vor dem Start`,
      scopeEventId: e.id, postTemplate: "lastspots", ...upcomingEventUrgency(e.startAt),
    });
  }

  for (const p of noImage) {
    recs.push({
      eventId: `marketing-noimage-${p.id}`, title: p.event.title, startAt: p.event.startAt,
      reason: "Dein Post hat noch kein Bild — Bilder bringen mehr Aufmerksamkeit", url: "/profile", noCreate: true,
    });
  }

  // Wiederkehrende Events (gleiche Reihe bzw. gleiches Spiel), deren Vorgänger beworben wurde.
  const seriesIds = new Set(precedents.map(p => p.seriesId).filter((x): x is string => !!x));
  const games = new Set(precedents.map(p => p.game?.toLowerCase().trim()).filter((x): x is string => !!x));
  for (const e of seriesCandidates) {
    const match = (e.seriesId && seriesIds.has(e.seriesId)) || (e.game && games.has(e.game.toLowerCase().trim()));
    if (!match) continue;
    recs.push({
      eventId: e.id, title: e.title, startAt: e.startAt, url: `/tournament/${e.id}`,
      reason: `Wiederkehrendes Event${e.game ? ` (${e.game})` : ""} — das letzte Mal wurde geworben`,
      ...upcomingEventUrgency(e.startAt),
    });
    if (recs.length > 20) break;
  }
  return recs;
}

/** Spiele, die in der Community zuletzt tatsächlich gespielt wurden (Event.game der letzten 120 Tage). */
async function getCommunityPlayedGameNames(): Promise<string[]> {
  const since = new Date(Date.now() - 120 * 86_400_000);
  const rows = await prisma.event.findMany({
    where: { game: { not: null }, startAt: { gte: since } },
    select: { game: true },
    distinct: ["game"],
    take: 50,
  });
  return rows.map(r => (r.game ?? "").toLowerCase().trim()).filter(g => g.length >= 3);
}

/**
 * Sortiert Steam-Items so, dass in der Community gespielte Spiele nach vorne
 * rutschen (Teilstring-Abgleich auf den Namen) — ohne die übrigen Treffer
 * komplett zu verdrängen: Steams eigene Reihenfolge bleibt innerhalb beider
 * Gruppen erhalten, danach wird auf `limit` gekappt.
 */
function prioritizeByCommunityGames<T extends { name: string }>(items: T[], communityGames: string[], limit: number): T[] {
  if (communityGames.length === 0) return items.slice(0, limit);
  const matches: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const nameLower = item.name.toLowerCase();
    const isMatch = communityGames.some(g => nameLower.includes(g) || g.includes(nameLower));
    (isMatch ? matches : rest).push(item);
  }
  return [...matches, ...rest].slice(0, limit);
}

async function getDismissedItemKeys(userId: string, jobKey: string): Promise<Set<string>> {
  const rows = await prisma.jobRecommendationDismissal.findMany({
    where: { userId, jobKey }, select: { itemKey: true },
  });
  return new Set(rows.map(r => r.itemKey));
}

export async function dismissRecommendation(userId: string, jobKey: string, itemKey: string): Promise<void> {
  await prisma.jobRecommendationDismissal.upsert({
    where: { userId_jobKey_itemKey: { userId, jobKey, itemKey } },
    create: { userId, jobKey, itemKey },
    update: {},
  });
}

export async function getRecommendationsForJob(jobKey: string, userId: string): Promise<JobRecommendations> {
  let events: EventRecommendation[] = [];
  if (jobKey === "journalist") events = await journalistRecommendationsFor(userId);
  else if (jobKey === "fotograf") events = await fotografRecommendationsFor(userId);
  else if (jobKey === "marketing_manager") events = await marketingRecommendationsFor(userId);
  else if (jobKey === "coach") events = await coachRecommendationsFor(userId);
  else if (jobKey === "visionaer") events = await visionaerRecommendationsFor(userId);

  const dismissed = await getDismissedItemKeys(userId, jobKey);
  events = events.filter(e => !dismissed.has(e.eventId));

  // Steam-Realwelt-Bezug ist vor allem für Journalist/Visionär/Marketing Manager relevant.
  const wantsSteam = ["journalist", "visionaer", "marketing_manager"].includes(jobKey);
  let steamSales: SteamFeedItem[] = [];
  let steamReleases: SteamFeedItem[] = [];
  if (wantsSteam) {
    const [rawSales, rawReleases, communityGames] = await Promise.all([
      getCurrentSteamSales(15), getRecentSteamReleases(10), getCommunityPlayedGameNames(),
    ]);
    steamSales = prioritizeByCommunityGames(rawSales, communityGames, 5);
    // Absichtlich weniger Neuveröffentlichungen als Sales: die Liste rutscht sonst schnell in
    // kleine Nischentitel ab, die in Steams "New & Trending" auch ohne Community-Bezug auftauchen.
    steamReleases = prioritizeByCommunityGames(rawReleases, communityGames, 3);
  }

  return { events, steamSales, steamReleases };
}

export async function getRecommendationCount(jobKey: string, userId: string): Promise<number> {
  const recs = await getRecommendationsForJob(jobKey, userId);
  return recs.events.length;
}

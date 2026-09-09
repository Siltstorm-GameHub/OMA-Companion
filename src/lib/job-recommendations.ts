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
      jobReports: { none: { hiddenByAdminAt: null } },
    },
    orderBy: { startAt: "desc" },
    take: 10,
  });
  return events.map(e => ({
    eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch kein Bericht", url: `/tournament/${e.id}`,
    ...pastEventUrgency(e.startAt),
  }));
}

async function eventsWithoutAssets(): Promise<EventRecommendation[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  const events = await prisma.event.findMany({
    where: {
      hidden: false, status: "finished", startAt: { gte: since },
      jobMediaAssets: { none: { hiddenByAdminAt: null } },
    },
    orderBy: { startAt: "desc" },
    take: 10,
  });
  return events.map(e => ({
    eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch keine Fotos/Clips", url: `/tournament/${e.id}`,
    ...pastEventUrgency(e.startAt),
  }));
}

/**
 * Coach hat aktuell keinen anstehenden Trainings-Termin — sanfter Anstoß,
 * einen anzulegen. Keine externen Datensignale nötig (siehe Plan: "grobe
 * Heuristik, kein Muss für v1"), bewusst simpel gehalten.
 */
async function coachRecommendationsFor(userId: string): Promise<EventRecommendation[]> {
  const upcoming = await prisma.coachTrainingSession.count({
    where: { coachId: userId, startAt: { gte: new Date() } },
  });
  if (upcoming > 0) return [];
  return [{
    eventId: "coach-no-upcoming-session", title: "Noch kein Trainings-Termin geplant",
    startAt: new Date(), reason: "Lege einen neuen Trainings-Termin an, um neuen Spielern zu helfen",
    url: "/profile", // führt zurück ins eigene Büro, wo der Termin angelegt wird
  }];
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

async function upcomingEventsWithoutMarketingPost(): Promise<EventRecommendation[]> {
  const until = new Date(Date.now() + LOOKAHEAD_DAYS * 86_400_000);
  const events = await prisma.event.findMany({
    where: {
      hidden: false, startAt: { gte: new Date(), lte: until },
      marketingPosts: { none: { hiddenByAdminAt: null } },
    },
    orderBy: { startAt: "asc" },
    take: 10,
  });
  return events.map(e => ({
    eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch keine Werbung", url: `/tournament/${e.id}`,
    ...upcomingEventUrgency(e.startAt),
  }));
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
  if (jobKey === "journalist") events = await eventsWithoutReports();
  else if (jobKey === "fotograf") events = await eventsWithoutAssets();
  else if (jobKey === "marketing_manager") events = await upcomingEventsWithoutMarketingPost();
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

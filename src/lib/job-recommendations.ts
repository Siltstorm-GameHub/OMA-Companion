import { prisma } from "./prisma";
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
}

export interface JobRecommendations {
  events: EventRecommendation[];
  steamSales: SteamFeedItem[];
  steamReleases: SteamFeedItem[];
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
  return events.map(e => ({ eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch kein Bericht" }));
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
  return events.map(e => ({ eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch keine Fotos/Clips" }));
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
  return events.map(e => ({ eventId: e.id, title: e.title, startAt: e.startAt, reason: "Noch keine Werbung" }));
}

export async function getRecommendationsForJob(jobKey: string): Promise<JobRecommendations> {
  const [steamSales, steamReleases] = await Promise.all([
    getCurrentSteamSales(), getRecentSteamReleases(),
  ]);

  let events: EventRecommendation[] = [];
  if (jobKey === "journalist") events = await eventsWithoutReports();
  else if (jobKey === "fotograf") events = await eventsWithoutAssets();
  else if (jobKey === "marketing_manager") events = await upcomingEventsWithoutMarketingPost();

  // Steam-Realwelt-Bezug ist vor allem für Journalist/Visionär/Marketing Manager relevant.
  const wantsSteam = ["journalist", "visionaer", "marketing_manager"].includes(jobKey);

  return {
    events,
    steamSales: wantsSteam ? steamSales : [],
    steamReleases: wantsSteam ? steamReleases : [],
  };
}

export async function getRecommendationCount(jobKey: string): Promise<number> {
  const recs = await getRecommendationsForJob(jobKey);
  return recs.events.length;
}

import { prisma } from "./prisma";
import { getDailyContributionLimit } from "./community-job-config";
import { startOfBerlinDay } from "./time";
import { COMMUNITY_JOBS, CONTENT_AREAS, CONTENT_CREATOR_KEY } from "./community-jobs";

/**
 * Offene Community-Jobs: Es gibt keine Mitgliedschaft mehr — jeder eingeloggte,
 * nicht gelöschte User darf alle Jobs ausüben. Statt Slots/Verträgen begrenzt ein
 * Tageslimit, wie viele Beiträge pro Berliner Kalendertag (über alle Jobs) fürs
 * Gehalt zählen. Weitere Beiträge sind erlaubt, Stimmen darauf zählen aber nicht.
 */

export type ContributionKind =
  | "report" | "contribution" | "asset" | "marketing_post" | "idea" | "guide" | "training";

/** Darf dieser User die Community-Jobs nutzen? (Gelöschte/anonymisierte Konten nicht.) */
export async function canWorkCommunityJobs(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { deletedAt: true } }).catch(() => null);
  return !!user && !user.deletedAt;
}

export interface DailyContributionUsage { used: number; limit: number; remaining: number }

export async function getDailyContributionUsage(userId: string, now: Date = new Date()): Promise<DailyContributionUsage> {
  const [used, limit] = await Promise.all([
    prisma.communityJobContribution.count({
      where: { userId, counted: true, createdAt: { gte: startOfBerlinDay(now) } },
    }),
    getDailyContributionLimit(),
  ]);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/** Setzt `countsForScore=false` auf die Inhalte, wenn sie über dem Tageslimit eingereicht wurden. */
async function markNotCounted(kind: ContributionKind, ids: string[]): Promise<void> {
  const where = { id: { in: ids } };
  const data = { countsForScore: false };
  switch (kind) {
    case "report": await prisma.jobReport.updateMany({ where, data }); break;
    case "contribution": await prisma.jobReportContribution.updateMany({ where, data }); break;
    case "asset": await prisma.jobMediaAsset.updateMany({ where, data }); break;
    case "marketing_post": await prisma.marketingPost.updateMany({ where, data }); break;
    case "idea": await prisma.communityIdea.updateMany({ where, data }); break;
    case "guide": await prisma.coachGuide.updateMany({ where, data }); break;
    case "training": await prisma.coachTrainingSession.updateMany({ where, data }); break;
  }
}

/**
 * Bucht einen Beitrag gegen das Tageslimit. Mehrere `entityIds` (Mehrfach-Upload,
 * Termin-Serie) zählen zusammen als EIN Beitrag. Gibt zurück, ob er fürs Gehalt zählt.
 * Fehler dürfen das eigentliche Veröffentlichen nie blockieren.
 */
export async function recordContribution(
  userId: string, jobKey: string, kind: ContributionKind, entityIds: string[],
): Promise<{ counted: boolean; usage: DailyContributionUsage }> {
  try {
    const before = await getDailyContributionUsage(userId);
    const counted = before.remaining > 0;
    await prisma.communityJobContribution.create({ data: { userId, jobKey, kind, entityIds, counted } });
    if (!counted && entityIds.length > 0) await markNotCounted(kind, entityIds);
    const used = before.used + (counted ? 1 : 0);
    return { counted, usage: { used, limit: before.limit, remaining: Math.max(0, before.limit - used) } };
  } catch {
    return { counted: true, usage: { used: 0, limit: 0, remaining: 0 } };
  }
}

/** Hinweistext für die API-Antwort, wenn ein Beitrag über dem Tageslimit lag. */
export function overLimitNotice(result: { counted: boolean; usage: DailyContributionUsage }): string | undefined {
  if (result.counted) return undefined;
  return `Tageslimit erreicht (${result.usage.limit} Beiträge): Dieser Beitrag ist veröffentlicht, zählt aber nicht fürs Gehalt.`;
}

/**
 * Wer in einem Job zuletzt beigetragen hat — Empfänger für Bild-/Werbe-Anfragen,
 * Anzeige im Katalog. Ersetzt die frühere Liste der "Job-Inhaber".
 */
export async function getRecentJobContributors(jobKey: string, days = 30, kinds?: ContributionKind[]): Promise<string[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.communityJobContribution.findMany({
    where: { jobKey, createdAt: { gte: since }, ...(kinds ? { kind: { in: kinds } } : {}) },
    select: { userId: true }, distinct: ["userId"],
  });
  return rows.map(r => r.userId);
}

/**
 * Alle User, für die im Gehaltslauf ein Score dieses Jobs berechnet werden muss:
 * jeder, der je in diesem Job beigetragen hat (Ledger) — plus ehemalige Inhaber aus
 * der Zeit vor den offenen Jobs, deren alte Inhalte weiterhin Stimmen bekommen.
 */
export async function getPayoutCandidates(jobKey: string): Promise<string[]> {
  const [ledger, legacy] = await Promise.all([
    prisma.communityJobContribution.findMany({ where: { jobKey }, select: { userId: true }, distinct: ["userId"] }),
    // Content Creator: ehemalige Journalisten, Fotografen und Marketing Manager zählen mit (alte Inhalte bekommen weiter Stimmen).
    prisma.communityJobMember.findMany({
      where: { jobKey: jobKey === CONTENT_CREATOR_KEY ? { in: CONTENT_AREAS.map(a => a.key) } : jobKey },
      select: { userId: true }, distinct: ["userId"],
    }),
  ]);
  const extra = jobKey === "coach"
    ? await prisma.user.findMany({
        where: { OR: [{ coachSpecialties: { isEmpty: false } }, { coachAvailableUntil: { not: null } }] },
        select: { id: true },
      }).then(rows => rows.map(r => r.id))
    : [];
  return [...new Set([...ledger.map(r => r.userId), ...legacy.map(r => r.userId), ...extra])];
}

/**
 * Coaches, die man finden/bewerten/um Hilfe bitten kann: wer Spezialgebiete gesetzt
 * hat, gerade verfügbar ist oder in den letzten 60 Tagen als Coach beigetragen hat.
 */
export async function listKnownCoaches(): Promise<{ userId: string; username: string | null; availableUntil: string | null; specialties: string[] }[]> {
  const recent = await getRecentJobContributors("coach", 60);
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: recent } },
        { coachSpecialties: { isEmpty: false } },
        { coachAvailableUntil: { gt: now } },
      ],
    },
    select: { id: true, username: true, name: true, coachAvailableUntil: true, coachSpecialties: true },
  });
  return users.map(u => ({
    userId: u.id,
    username: u.username ?? u.name,
    availableUntil: u.coachAvailableUntil && u.coachAvailableUntil > now ? u.coachAvailableUntil.toISOString() : null,
    specialties: u.coachSpecialties,
  }));
}

/** Liest und prüft den `jobKey`-Query-Parameter der Büro-Routen (offene Jobs: der Job kommt vom gewählten Tab). */
export function jobKeyFromRequest(req: Request): string | null {
  const jobKey = new URL(req.url).searchParams.get("jobKey");
  return jobKey && COMMUNITY_JOBS.some(j => j.key === jobKey) ? jobKey : null;
}

/**
 * Wie {@link jobKeyFromRequest}, aber für Werkzeuge/Empfehlungen je Inhaltstyp: Beim Content Creator
 * entscheidet zusätzlich `area` (journalist | fotograf | marketing_manager) — ohne `area` bleibt es beim Job.
 */
export function workKeyFromRequest(req: Request): string | null {
  const jobKey = jobKeyFromRequest(req);
  if (jobKey !== CONTENT_CREATOR_KEY) return jobKey;
  const area = new URL(req.url).searchParams.get("area");
  return area && CONTENT_AREAS.some(a => a.key === area) ? area : jobKey;
}

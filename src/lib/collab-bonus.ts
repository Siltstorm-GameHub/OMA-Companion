import { prisma } from "./prisma";
import type { Bonus } from "./score-engine";

/**
 * Zusammenarbeits-Bonus: Wird der Beitrag eines Jobs von einem ANDEREN Job aufgegriffen, gibt es Wochenpunkte.
 *  - Fotograf: Bild wird von anderen als Titelbild, im Werbe-Post oder in einer Anleitung genutzt.
 *  - Marketing Manager: Werbe-Post wird in einem fremden Bericht referenziert oder erfüllt eine Werbe-Anfrage eines Coaches.
 *  - Journalist: Aus dem Bericht entsteht eine Idee eines Visionärs.
 *  - Coach: Ein Werbe-Post zu einem Trainings-Termin auf seine Anfrage hin.
 *  - Visionär: Eine Idee wird "Wird umgesetzt" bzw. "Umgesetzt".
 *
 * Bewusst klein gehalten: höchstens {@link MAX_COLLAB_USES} Aufgriffe pro Woche, Eigennutzung zählt nicht, und der Bonus
 * greift nur, wenn schon Bewertungen der Community da sind (siehe {@link withCollabBonus}) — so bringt reines
 * gegenseitiges Nutzen allein weder Stufe noch Gehalt.
 */

export const COLLAB_POINTS = 2;
export const MAX_COLLAB_USES = 3;
export const IDEA_RESULT_POINTS = 5;
export const MAX_IDEA_RESULTS = 2;

const BLOB_URL = /https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s)]+/gi;

export async function collabBonusScore(jobKey: string, userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const inWeek = { gte: weekStart, lt: weekEnd };
  const visible = { hiddenByAdminAt: null };

  switch (jobKey) {
    case "fotograf": {
      const [reports, posts, guides] = await Promise.all([
        prisma.jobReport.count({ where: { isDraft: false, ...visible, publishedAt: inWeek, authorId: { not: userId }, coverAsset: { authorId: userId } } }),
        prisma.marketingPost.count({ where: { ...visible, createdAt: inWeek, authorId: { not: userId }, asset: { authorId: userId } } }),
        guidesUsingAssetsOf(userId, weekStart, weekEnd),
      ]);
      return Math.min(reports + posts + guides, MAX_COLLAB_USES) * COLLAB_POINTS;
    }
    case "marketing_manager": {
      const [reports, promos] = await Promise.all([
        prisma.jobReport.count({ where: { isDraft: false, ...visible, publishedAt: inWeek, authorId: { not: userId }, referencedMarketingPost: { authorId: userId } } }),
        countFulfilledPromotions({ postAuthorId: userId }, weekStart, weekEnd),
      ]);
      return Math.min(reports + promos, MAX_COLLAB_USES) * COLLAB_POINTS;
    }
    case "journalist": {
      const own = await prisma.jobReport.findMany({ where: { authorId: userId, isDraft: false }, select: { id: true } });
      if (own.length === 0) return 0;
      const fromOwn = await prisma.communityIdea.count({
        where: { ...visible, createdAt: inWeek, authorId: { not: userId }, sourceReportId: { in: own.map(r => r.id) } },
      });
      return Math.min(fromOwn, MAX_COLLAB_USES) * COLLAB_POINTS;
    }
    case "coach": {
      const promos = await countFulfilledPromotions({ requesterId: userId }, weekStart, weekEnd);
      return Math.min(promos, MAX_COLLAB_USES) * COLLAB_POINTS;
    }
    case "visionaer": {
      const results = await prisma.communityIdea.count({
        where: { authorId: userId, ...visible, lifecycle: { in: ["PLANNED", "DONE"] }, lifecycleAt: inWeek },
      });
      return Math.min(results, MAX_IDEA_RESULTS) * IDEA_RESULT_POINTS;
    }
    default:
      return 0;
  }
}

/** Bonus nur dazurechnen, wenn schon Bewertungen der Community vorliegen. */
export async function withCollabBonus(jobKey: string, userId: string, weekStart: Date, weekEnd: Date, baseScore: number): Promise<number> {
  if (baseScore <= 0) return baseScore;
  return baseScore + (await collabBonusScore(jobKey, userId, weekStart, weekEnd));
}

/** Anzahl fremder Anleitungen der Woche, die ein Bild dieses Fotografen einbetten. */
async function guidesUsingAssetsOf(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const guides = await prisma.coachGuide.findMany({
    where: { hiddenByAdminAt: null, createdAt: { gte: weekStart, lt: weekEnd }, authorId: { not: userId }, bodyMarkdown: { contains: "![" } },
    select: { bodyMarkdown: true }, take: 200,
  });
  if (guides.length === 0) return 0;
  const urlsPerGuide = guides.map(g => new Set(g.bodyMarkdown.match(BLOB_URL) ?? []));
  const all = [...new Set(urlsPerGuide.flatMap(s => [...s]))];
  if (all.length === 0) return 0;
  const mine = new Set((await prisma.jobMediaAsset.findMany({ where: { authorId: userId, url: { in: all } }, select: { url: true } })).map(a => a.url));
  return urlsPerGuide.filter(urls => [...urls].some(u => mine.has(u))).length;
}

async function countFulfilledPromotions(who: { postAuthorId?: string; requesterId?: string }, weekStart: Date, weekEnd: Date): Promise<number> {
  const requests = await prisma.promotionRequest.findMany({
    where: { status: "FULFILLED", fulfilledAt: { gte: weekStart, lt: weekEnd }, ...(who.requesterId ? { requesterId: who.requesterId } : {}) },
    select: { postId: true },
  });
  const postIds = requests.map(r => r.postId).filter((x): x is string => !!x);
  if (postIds.length === 0) return 0;
  if (!who.postAuthorId) return postIds.length;
  return prisma.marketingPost.count({ where: { id: { in: postIds }, authorId: who.postAuthorId, hiddenByAdminAt: null } });
}

/** Zusammenarbeits-Bonus als Zeile fürs Score-Protokoll — leer, solange noch keine Bewertungen der Community vorliegen. */
export async function collabBonuses(jobKey: string, userId: string, weekStart: Date, weekEnd: Date, base: number): Promise<Bonus[]> {
  if (base <= 0) return [];
  const points = await collabBonusScore(jobKey, userId, weekStart, weekEnd);
  return points > 0 ? [{ key: "collab", label: jobKey === "visionaer" ? "Ideen in Umsetzung/umgesetzt" : "Zusammenarbeit mit anderen Jobs", points }] : [];
}

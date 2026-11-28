/**
 * Zusätzliche Kacheln für "Heute für dich" auf der Übersicht (lib/home-tasks.ts) — statt eigener Bausteine:
 *  - Ideen kurz vor dem Ziel (1–2 Unterstützer fehlen, du hast noch nicht unterstützt)
 *  - Event-Vorschlag sucht jemanden, der organisiert (mit Interessierten, nicht dein eigener)
 *  - Neu umgesetzt auf der Roadmap (letzte 3 Tage, wegklickbar)
 *  - OMA Blocks: dein Monatsplatz in den letzten Tagen der Monatswertung
 * Nur Server; jede Quelle scheitert für sich (dann fehlt nur die Kachel).
 */

import { prisma } from "./prisma";
import { countSupporters, IDEA_SUPPORT_THRESHOLD, SUPPORT_KINDS } from "./idea-lifecycle";
import { getBlocksPlace } from "./blocks/scores";
import { seasonDaysLeft, seasonKey } from "./month-season";

export interface CommunityTaskInputs {
  ideasNearGoal: { count: number; href: string } | null;
  proposalOpen: { id: string; title: string; interested: number } | null;
  roadmapNew: { key: string; title: string; href: string } | null;
  blocks: { place: number; daysLeft: number } | null;
}

const DAY = 86_400_000;

async function ideasNearGoal(userId: string, now: Date): Promise<CommunityTaskInputs["ideasNearGoal"]> {
  const ideas = await prisma.communityIdea.findMany({
    where: { lifecycle: "OPEN", hiddenByAdminAt: null, createdAt: { gte: new Date(now.getTime() - 60 * DAY) }, authorId: { not: userId } },
    select: { id: true, interests: { select: { userId: true, kind: true } } },
    orderBy: { createdAt: "desc" }, take: 150,
  });
  const near = ideas.filter(i => {
    const n = countSupporters(i.interests);
    const mine = i.interests.some(x => x.userId === userId && (SUPPORT_KINDS as readonly string[]).includes(x.kind));
    return !mine && n >= IDEA_SUPPORT_THRESHOLD - 2 && n < IDEA_SUPPORT_THRESHOLD;
  });
  if (near.length === 0) return null;
  return { count: near.length, href: near.length === 1 ? `/community-board/idea/${near[0].id}` : "/community-board?ansicht=ziel" };
}

async function proposalOpen(userId: string, now: Date): Promise<CommunityTaskInputs["proposalOpen"]> {
  const rows = await prisma.eventProposal.findMany({
    where: { status: "OPEN", organizerId: null, hiddenByAdminAt: null, authorId: { not: userId }, createdAt: { gte: new Date(now.getTime() - 14 * DAY) } },
    select: { id: true, title: true, _count: { select: { interests: true } } },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  const best = rows.filter(r => r._count.interests >= 2).sort((a, b) => b._count.interests - a._count.interests)[0];
  return best ? { id: best.id, title: best.title, interested: best._count.interests } : null;
}

async function roadmapNew(now: Date): Promise<CommunityTaskInputs["roadmapNew"]> {
  const since = new Date(now.getTime() - 3 * DAY);
  const [item, idea] = await Promise.all([
    prisma.roadmapItem.findFirst({ where: { status: "DONE", doneAt: { gte: since } }, orderBy: { doneAt: "desc" }, select: { id: true, title: true, doneAt: true } }),
    prisma.communityIdea.findFirst({
      where: { lifecycle: "DONE", hiddenByAdminAt: null, lifecycleAt: { gte: since } },
      orderBy: { lifecycleAt: "desc" }, select: { id: true, title: true, lifecycleAt: true },
    }),
  ]);
  if (!item && !idea) return null;
  if (item && (!idea || (item.doneAt?.getTime() ?? 0) >= (idea.lifecycleAt?.getTime() ?? 0))) {
    return { key: `rm-item-${item.id}`, title: item.title, href: `/community-board/roadmap#item-${item.id}` };
  }
  return { key: `rm-idea-${idea!.id}`, title: idea!.title, href: `/community-board/idea/${idea!.id}` };
}

async function blocksPlace(userId: string): Promise<CommunityTaskInputs["blocks"]> {
  const daysLeft = seasonDaysLeft();
  if (daysLeft > 3) return null;
  const place = await getBlocksPlace(userId, seasonKey());
  return place ? { place: place.place, daysLeft } : null;
}

export async function loadCommunityTaskInputs(userId: string | undefined, now: Date): Promise<CommunityTaskInputs> {
  if (!userId) return { ideasNearGoal: null, proposalOpen: null, roadmapNew: null, blocks: null };
  const [a, b, c, d] = await Promise.all([
    ideasNearGoal(userId, now).catch(() => null),
    proposalOpen(userId, now).catch(() => null),
    roadmapNew(now).catch(() => null),
    blocksPlace(userId).catch(() => null),
  ]);
  return { ideasNearGoal: a, proposalOpen: b, roadmapNew: c, blocks: d };
}

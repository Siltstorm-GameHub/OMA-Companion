/**
 * Roadmap (/community-board/roadmap): was aus den Ideen der Community wird und woran das Team arbeitet.
 *  - Ideen erscheinen über ihren Team-Status: In Prüfung · Wird umgesetzt · Umgesetzt (Abgelehnt eingeklappt mit Begründung)
 *  - Eigene Punkte des Teams (RoadmapItem): "in Arbeit" (PLANNED) oder "umgesetzt" (DONE)
 *  - Zu jedem Punkt kann das Team Infos mit Screenshots posten (RoadmapUpdate)
 * Die frühere Spiele-Wunschliste ist entfallen (Spiele-Wünsche laufen über OMA GameSwipe).
 */

import { prisma } from "./prisma";
import { getWeekBounds } from "./community-job-service";
import { topIdeasBetween, ideaPath, setIdeaLifecycle } from "./visionaer-service";
import { countSupporters, isIdeaCategory, summarizeStars } from "./idea-lifecycle";
import { dispatchNotification } from "./notify-dispatch";

export const ROADMAP_ITEM_STATUSES = ["PLANNED", "DONE"] as const;
export type RoadmapItemStatus = (typeof ROADMAP_ITEM_STATUSES)[number];
export type RoadmapColumn = "REVIEW" | "PLANNED" | "DONE" | "REJECTED";
export type RoadmapItemType = "idea" | "item";

export const ROADMAP_UPDATE_MAX_IMAGES = 6;
const BLOB_IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export interface RoadmapEntry {
  type: RoadmapItemType;
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  column: RoadmapColumn;
  /** Zeitpunkt des letzten Statuswechsels (Ideen) bzw. Umsetzung/Anlage (Team-Punkte) */
  at: string | null;
  note: string | null;
  /** Ideengeber (nur Ideen) */
  author: string | null;
  supporters: number;
  stars: { count: number; average: number } | null;
  updates: number;
  /** Zeitpunkt der neuesten Info (für "Neu seit deinem letzten Besuch") */
  lastUpdateAt: string | null;
  href: string | null;
  /** Team-Punkte: verknüpfte Ideen und ob man folgt */
  linkedIdeas?: { id: string; title: string; author: string | null; supporters: number }[];
  following?: boolean;
  followers?: number;
}

export async function getRoadmap(viewerId: string) {
  const now = new Date();
  const { weekStart } = getWeekBounds(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [ideas, items, topWeek, topMonth] = await Promise.all([
    prisma.communityIdea.findMany({
      where: { hiddenByAdminAt: null, lifecycle: { in: ["REVIEW", "PLANNED", "DONE", "REJECTED"] } },
      orderBy: { lifecycleAt: "desc" }, take: 200,
      select: {
        id: true, title: true, description: true, category: true, lifecycle: true, lifecycleNote: true, lifecycleAt: true,
        author: { select: { username: true, name: true } },
        votes: { select: { stars: true } },
        interests: { select: { userId: true, kind: true } },
      },
    }),
    prisma.roadmapItem.findMany({ orderBy: [{ doneAt: "desc" }, { createdAt: "desc" }], take: 200 }),
    topIdeasBetween(weekStart, now, 5),
    topIdeasBetween(monthStart, now, 5),
  ]);

  const ids = [...ideas.map(i => i.id), ...items.map(i => i.id)];
  const updateCounts = ids.length > 0
    ? await prisma.roadmapUpdate.groupBy({ by: ["itemType", "itemId"], where: { itemId: { in: ids } }, _count: { _all: true }, _max: { createdAt: true } })
    : [];
  const statsOf = (type: RoadmapItemType, id: string) => updateCounts.find(u => u.itemType === type && u.itemId === id);
  const countOf = (type: RoadmapItemType, id: string) => statsOf(type, id)?._count._all ?? 0;
  const lastOf = (type: RoadmapItemType, id: string) => statsOf(type, id)?._max.createdAt?.toISOString() ?? null;

  // Ideen, die mit einem Team-Punkt umgesetzt werden, stehen in dessen Karte statt einzeln
  const linked = new Set(items.flatMap(i => i.ideaIds));
  const linkedRows = linked.size > 0
    ? await prisma.communityIdea.findMany({
        where: { id: { in: [...linked] } },
        select: { id: true, title: true, author: { select: { username: true, name: true } }, interests: { select: { userId: true, kind: true } } },
      })
    : [];

  const entries: RoadmapEntry[] = [
    ...ideas.filter(i => !linked.has(i.id)).map(i => {
      const s = summarizeStars(i.votes.map(v => v.stars));
      return {
        type: "idea" as const, id: i.id, title: i.title, description: i.description.slice(0, 280), category: i.category,
        column: i.lifecycle as RoadmapColumn, at: i.lifecycleAt?.toISOString() ?? null, note: i.lifecycleNote,
        author: i.author.username ?? i.author.name ?? null, supporters: countSupporters(i.interests),
        stars: s.count > 0 ? { count: s.count, average: s.average } : null, updates: countOf("idea", i.id),
        lastUpdateAt: lastOf("idea", i.id), href: ideaPath(i.id),
      };
    }),
    ...items.map(i => ({
      type: "item" as const, id: i.id, title: i.title, description: i.description, category: i.category,
      column: (i.status === "DONE" ? "DONE" : "PLANNED") as RoadmapColumn,
      at: (i.doneAt ?? i.createdAt).toISOString(), note: null, author: null, stars: null,
      updates: countOf("item", i.id), lastUpdateAt: lastOf("item", i.id), href: null,
      linkedIdeas: i.ideaIds.flatMap(id => {
        const r = linkedRows.find(x => x.id === id);
        return r ? [{ id: r.id, title: r.title, author: r.author.username ?? r.author.name ?? null, supporters: countSupporters(r.interests) }] : [];
      }),
      supporters: i.ideaIds.reduce((sum, id) => sum + countSupporters(linkedRows.find(x => x.id === id)?.interests ?? []), 0),
      following: i.followerIds.includes(viewerId),
      followers: i.followerIds.length,
    })),
  ].sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));

  return { entries, topWeek, topMonth };
}

// ── Team-Punkte ───────────────────────────────────────────────────────────────

type Result<T = object> = ({ ok: true } & T) | { error: string };

function cleanItem(data: { title?: unknown; description?: unknown; category?: unknown; status?: unknown }) {
  const out: { title?: string; description?: string | null; category?: string | null; status?: RoadmapItemStatus } = {};
  if (data.title !== undefined) out.title = String(data.title).trim().slice(0, 120);
  if (data.description !== undefined) out.description = String(data.description ?? "").trim().slice(0, 2000) || null;
  if (data.category !== undefined) out.category = isIdeaCategory(data.category) ? data.category : null;
  if (data.status !== undefined) {
    if (!(ROADMAP_ITEM_STATUSES as readonly string[]).includes(String(data.status))) return { error: "Ungültiger Status" } as const;
    out.status = data.status as RoadmapItemStatus;
  }
  return out;
}

export async function createRoadmapItem(actorId: string, data: Record<string, unknown>): Promise<Result<{ id: string }>> {
  const c = cleanItem(data);
  if ("error" in c) return { error: c.error as string };
  if (!c.title) return { error: "Titel fehlt" };
  const status = c.status ?? "PLANNED";
  const item = await prisma.roadmapItem.create({
    data: { title: c.title, description: c.description ?? null, category: c.category ?? null, status, createdById: actorId, doneAt: status === "DONE" ? new Date() : null },
  });
  return { ok: true, id: item.id };
}

export async function updateRoadmapItem(id: string, data: Record<string, unknown>, actorId?: string): Promise<Result> {
  const c = cleanItem(data);
  if ("error" in c) return { error: c.error as string };
  if (c.title !== undefined && !c.title) return { error: "Titel fehlt" };
  const current = await prisma.roadmapItem.findUnique({ where: { id } });
  if (!current) return { error: "Punkt nicht gefunden" };
  await prisma.roadmapItem.update({
    where: { id },
    data: {
      ...c,
      ...(c.status && c.status !== current.status ? { doneAt: c.status === "DONE" ? new Date() : null } : {}),
    },
  });
  if (c.status && c.status !== current.status) {
    const title = c.title ?? current.title;
    for (const ideaId of current.ideaIds) {
      await setIdeaLifecycle(actorId ?? current.createdById, ideaId, c.status, ideaNoteFor(c.status, title)).catch(() => {});
    }
    if (c.status === "DONE") {
      const to = current.followerIds.filter(u => u !== actorId);
      if (to.length > 0) {
        dispatchNotification("roadmap_update", {
          users: to, placeholders: { "{title}": title, "{text}": "Ist umgesetzt! 🎉", "{url}": `/community-board/roadmap#item-${id}` },
        }).catch(() => {});
      }
    }
  }
  return { ok: true };
}

const ideaNoteFor = (status: string, title: string) =>
  status === "DONE" ? `Umgesetzt als „${title}“ — Details auf der Roadmap.` : `Wird umgesetzt als „${title}“ — Stand auf der Roadmap.`;

// ── Ideen mit Team-Punkten verknüpfen ─────────────────────────────────────────

export async function linkIdeaToItem(actorId: string, itemId: string, ideaId: string): Promise<Result> {
  const [item, idea] = await Promise.all([
    prisma.roadmapItem.findUnique({ where: { id: itemId } }),
    prisma.communityIdea.findUnique({ where: { id: ideaId }, select: { id: true, hiddenByAdminAt: true } }),
  ]);
  if (!item) return { error: "Punkt nicht gefunden" };
  if (!idea || idea.hiddenByAdminAt) return { error: "Idee nicht gefunden" };
  if (item.ideaIds.includes(ideaId)) return { ok: true };
  // Eine Idee gehört höchstens zu einem Punkt
  const others = await prisma.roadmapItem.findMany({ where: { ideaIds: { has: ideaId } }, select: { id: true, ideaIds: true } });
  for (const o of others) await prisma.roadmapItem.update({ where: { id: o.id }, data: { ideaIds: o.ideaIds.filter(x => x !== ideaId) } });
  await prisma.roadmapItem.update({ where: { id: itemId }, data: { ideaIds: [...item.ideaIds, ideaId] } });
  const res = await setIdeaLifecycle(actorId, ideaId, item.status, ideaNoteFor(item.status, item.title));
  return "error" in res ? res : { ok: true };
}

export async function unlinkIdeaFromItem(itemId: string, ideaId: string): Promise<Result> {
  const item = await prisma.roadmapItem.findUnique({ where: { id: itemId }, select: { ideaIds: true } });
  if (!item) return { error: "Punkt nicht gefunden" };
  await prisma.roadmapItem.update({ where: { id: itemId }, data: { ideaIds: item.ideaIds.filter(x => x !== ideaId) } });
  return { ok: true };
}

/** Ideen für die Verknüpfung suchen (Titel enthält q), ohne Abgelehnte */
export async function searchIdeasForLinking(q: string) {
  const term = q.trim().slice(0, 60);
  if (term.length < 2) return [];
  const rows = await prisma.communityIdea.findMany({
    where: { hiddenByAdminAt: null, lifecycle: { not: "REJECTED" }, title: { contains: term, mode: "insensitive" } },
    orderBy: { createdAt: "desc" }, take: 8,
    select: { id: true, title: true, lifecycle: true, interests: { select: { userId: true, kind: true } } },
  });
  return rows.map(r => ({ id: r.id, title: r.title, lifecycle: r.lifecycle, supporters: countSupporters(r.interests) }));
}

// ── Folgen ("Auf dem Laufenden bleiben") ──────────────────────────────────────

export async function setFollowItem(userId: string, itemId: string, on: boolean): Promise<Result> {
  const item = await prisma.roadmapItem.findUnique({ where: { id: itemId }, select: { followerIds: true } });
  if (!item) return { error: "Punkt nicht gefunden" };
  const next = on ? [...new Set([...item.followerIds, userId])] : item.followerIds.filter(u => u !== userId);
  await prisma.roadmapItem.update({ where: { id: itemId }, data: { followerIds: next } });
  return { ok: true };
}

/** Jüngste Änderung auf der Roadmap (umgesetzt, neuer Status, neue Info) — für "Neu seit deinem letzten Besuch" */
export async function latestRoadmapChange(): Promise<string | null> {
  const [item, idea, update] = await Promise.all([
    prisma.roadmapItem.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.communityIdea.findFirst({
      where: { hiddenByAdminAt: null, lifecycle: { in: ["REVIEW", "PLANNED", "DONE"] }, lifecycleAt: { not: null } },
      orderBy: { lifecycleAt: "desc" }, select: { lifecycleAt: true },
    }),
    prisma.roadmapUpdate.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const times = [item?.updatedAt, idea?.lifecycleAt, update?.createdAt].filter((d): d is Date => !!d).map(d => d.getTime());
  return times.length > 0 ? new Date(Math.max(...times)).toISOString() : null;
}

export async function deleteRoadmapItem(id: string): Promise<Result> {
  await prisma.roadmapUpdate.deleteMany({ where: { itemType: "item", itemId: id } });
  await prisma.roadmapItem.delete({ where: { id } }).catch(() => null);
  return { ok: true };
}

// ── Infos/Updates mit Screenshots ─────────────────────────────────────────────

export function isRoadmapItemType(v: unknown): v is RoadmapItemType {
  return v === "idea" || v === "item";
}

export async function listRoadmapUpdates(itemType: RoadmapItemType, itemId: string) {
  const rows = await prisma.roadmapUpdate.findMany({
    where: { itemType, itemId }, orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, username: true, name: true, image: true } } },
  });
  return rows.map(r => ({
    id: r.id, bodyMarkdown: r.bodyMarkdown, imageUrls: r.imageUrls, createdAt: r.createdAt.toISOString(),
    author: { id: r.author.id, name: r.author.username ?? r.author.name ?? "Team", image: r.author.image },
  }));
}

export async function addRoadmapUpdate(actorId: string, itemType: RoadmapItemType, itemId: string, body: string, imageUrls: unknown): Promise<Result<{ id: string }>> {
  const text = body.trim().slice(0, 4000);
  const images = Array.isArray(imageUrls)
    ? imageUrls.filter((u): u is string => typeof u === "string" && BLOB_IMAGE_HOST.test(u)).slice(0, ROADMAP_UPDATE_MAX_IMAGES)
    : [];
  if (!text && images.length === 0) return { error: "Text oder Screenshot fehlt" };

  let title: string | null = null;
  let followers: string[] = [];
  if (itemType === "idea") {
    const idea = await prisma.communityIdea.findUnique({
      where: { id: itemId }, select: { title: true, authorId: true, interests: { select: { userId: true } }, votes: { select: { voterId: true } } },
    });
    if (!idea) return { error: "Idee nicht gefunden" };
    title = idea.title;
    followers = [...new Set([idea.authorId, ...idea.interests.map(i => i.userId), ...idea.votes.map(v => v.voterId)])];
  } else {
    const item = await prisma.roadmapItem.findUnique({ where: { id: itemId }, select: { title: true, followerIds: true, ideaIds: true } });
    if (!item) return { error: "Punkt nicht gefunden" };
    title = item.title;
    const ideas = item.ideaIds.length > 0
      ? await prisma.communityIdea.findMany({
          where: { id: { in: item.ideaIds } },
          select: { authorId: true, interests: { select: { userId: true } }, votes: { select: { voterId: true } } },
        })
      : [];
    followers = [...new Set([
      ...item.followerIds,
      ...ideas.flatMap(i => [i.authorId, ...i.interests.map(x => x.userId), ...i.votes.map(v => v.voterId)]),
    ])];
  }

  const created = await prisma.roadmapUpdate.create({ data: { itemType, itemId, bodyMarkdown: text, imageUrls: images, authorId: actorId } });
  // Neue Infos zu einer Idee → alle, die sie eingereicht, unterstützt oder bewertet haben
  const to = followers.filter(id => id !== actorId);
  if (to.length > 0 && title) {
    dispatchNotification("roadmap_update", {
      users: to, placeholders: { "{title}": title, "{text}": text.slice(0, 160) || "Neue Screenshots", "{url}": `/community-board/roadmap#${itemType}-${itemId}` },
    }).catch(() => {});
  }
  return { ok: true, id: created.id };
}

export async function deleteRoadmapUpdate(id: string): Promise<Result> {
  await prisma.roadmapUpdate.delete({ where: { id } }).catch(() => null);
  return { ok: true };
}

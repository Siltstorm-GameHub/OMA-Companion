import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { countSupporters, summarizeStars, SUPPORT_KINDS } from "./idea-lifecycle";

/**
 * Ideen als Board-Karten: gemeinsame Abfrage + Abbildung für den Feed (/api/community-board) und die
 * einzelne Ideen-Seite (/community-board/idea/[id]). Die Begründungen der Stimmen bleiben privat
 * (nur Autor + Admin) — hier werden nur Sterne ausgewertet.
 */

const AUTHOR = { select: { id: true, username: true, name: true, image: true, rankPoints: true } } as const;

export function ideaFeedInclude() {
  return {
    author: AUTHOR,
    votes: { select: { stars: true, voterId: true, createdAt: true, revotedAt: true } },
    interests: { select: { userId: true, kind: true } },
  } satisfies Prisma.CommunityIdeaInclude;
}

export type IdeaWithFeedData = Prisma.CommunityIdeaGetPayload<{ include: ReturnType<typeof ideaFeedInclude> }>;

export function toIdeaFeedEntry(i: IdeaWithFeedData, viewerId: string) {
  const summary = summarizeStars(i.votes.map(v => v.stars));
  return {
    kind: "idea" as const,
    id: i.id,
    publishedAt: i.createdAt,
    title: i.title,
    description: i.description,
    category: i.category,
    lifecycle: i.lifecycle,
    lifecycleNote: i.lifecycleNote,
    lifecycleAt: i.lifecycleAt,
    lifecycleById: i.lifecycleById,
    votingEndsAt: i.votingEndsAt,
    sourceEventId: i.sourceEventId,
    sourceReportId: i.sourceReportId,
    author: i.author,
    voteCount: summary.count,
    avgStars: summary.average,
    distribution: summary.distribution,
    votedByMe: i.votes.some(v => v.voterId === viewerId),
    // Nach einer Überarbeitung darf man seine Bewertung einmal anpassen.
    canRevote: !!i.editedAt && i.votes.some(v => v.voterId === viewerId && (v.revotedAt ?? v.createdAt) < i.editedAt!),
    imageUrls: i.imageUrls,
    version: i.version,
    editedAt: i.editedAt,
    lastEditNote: i.lastEditNote,
    gameAppId: i.gameAppId,
    gameName: i.gameName,
    supporters: countSupporters(i.interests),
    supportedByMe: i.interests.some(x => x.userId === viewerId && (SUPPORT_KINDS as readonly string[]).includes(x.kind)),
    interestHelp: i.interests.filter(x => x.kind === "HELP").length,
    myInterests: i.interests.filter(x => x.userId === viewerId).map(x => x.kind),
  };
}

// ── Anreicherung (async): wer im Team geantwortet hat + wie schnell das Team meist antwortet ──

let responseCache: { at: number; days: number | null } | null = null;

/** Median der Tage von "eingereicht" bis zur ersten Team-Antwort (letzte 90 Tage), 10 Minuten zwischengespeichert. */
export async function teamResponseDays(): Promise<number | null> {
  if (responseCache && Date.now() - responseCache.at < 10 * 60_000) return responseCache.days;
  const since = new Date(Date.now() - 90 * 86_400_000);
  const rows = await prisma.communityIdea.findMany({
    where: { lifecycleById: { not: null }, lifecycleAt: { not: null }, createdAt: { gte: since } },
    select: { createdAt: true, lifecycleAt: true }, take: 300,
  });
  const days = rows.map(r => (r.lifecycleAt!.getTime() - r.createdAt.getTime()) / 86_400_000).filter(d => d >= 0).sort((a, b) => a - b);
  const median = days.length >= 3 ? Math.max(1, Math.ceil(days[Math.floor(days.length / 2)])) : null;
  responseCache = { at: Date.now(), days: median };
  return median;
}

/** Ideen-Einträge um Team-Antwort (Name/Bild) und typische Antwortzeit ergänzen */
export async function enrichIdeaEntries<T extends { kind: string; lifecycleById?: string | null }>(entries: T[]) {
  const ideas = entries.filter(e => e.kind === "idea");
  if (ideas.length === 0) return entries.map(e => ({ ...e, lifecycleBy: null as null | { name: string; image: string | null }, teamResponseDays: null as number | null }));
  const ids = [...new Set(ideas.map(e => e.lifecycleById).filter((id): id is string => !!id))];
  const [users, days] = await Promise.all([
    ids.length > 0 ? prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, name: true, image: true } }) : Promise.resolve([]),
    teamResponseDays(),
  ]);
  return entries.map(e => {
    const u = e.lifecycleById ? users.find(x => x.id === e.lifecycleById) : null;
    return {
      ...e,
      lifecycleBy: u ? { name: u.username ?? u.name ?? "Team", image: u.image } : null,
      teamResponseDays: e.kind === "idea" ? days : null,
    };
  });
}

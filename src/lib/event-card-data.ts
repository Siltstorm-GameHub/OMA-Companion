// Baut aus einem Event (Prisma-Zeile mit EVENT_CARD_INCLUDE) die Plain-Daten für <EventCard>.
// Server-seitig — Status, Datum, Relevanz und Dringlichkeit kommen aus lib/event-display.ts.

import type { Prisma } from "@prisma/client";
import type { EventCardData } from "@/components/events/EventCard";
import { categoryLabel } from "@/components/EventCategoryBadge";
import { dateBlock, eventPhase, friendsFirst, relevanceTags, urgencyHint } from "@/lib/event-display";
import type { EventViewerContext } from "@/lib/event-viewer";
import { eventParticipationCoins, formatLabel } from "@/lib/event-placeholders";
import { isOmaOriginal } from "@/lib/oma-original";
import { resolveSeriesColor } from "@/lib/series-icons";

/** Relationen, die eine Event-Kachel braucht */
export const EVENT_CARD_INCLUDE = {
  series: {
    select: {
      id: true, name: true, icon: true, registrationLocked: true, squadId: true, approvalStatus: true,
      coverImageUrl: true, omaOriginal: true, fixedGame: true,
    },
  },
  createdBy: { select: { username: true, name: true } },
  registrations: {
    orderBy: { joinedAt: "asc" },
    select: {
      userId: true, role: true,
      user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
    },
  },
  gameVote: { select: { status: true } },
} satisfies Prisma.EventInclude;

export type EventCardSource = Prisma.EventGetPayload<{ include: typeof EVENT_CARD_INCLUDE }>;

export function playersOf(ev: Pick<EventCardSource, "registrations">) {
  return ev.registrations.filter(r => r.role === "player");
}

export function isUserRegistered(ev: Pick<EventCardSource, "registrations">, userId: string | null | undefined): boolean {
  return !!userId && ev.registrations.some(r => r.userId === userId);
}

export function toEventCardData(
  ev: EventCardSource,
  viewer: EventViewerContext,
  userId: string | null | undefined,
  now: Date,
): EventCardData {
  const players = playersOf(ev);
  const isRegistered = isUserRegistered(ev, userId);
  const phase = eventPhase({
    status: ev.status, startAt: ev.startAt, endAt: ev.endAt, maxPlayers: ev.maxPlayers,
    playerCount: players.length, isRegistered, gameVoteOpen: ev.gameVote?.status === "open",
  }, now);

  const others = players.map(p => p.user).filter(u => u.id !== userId);
  const sorted = friendsFirst(others, viewer.friendIds);
  const friendNames = sorted
    .filter(u => viewer.friendIds.has(u.id))
    .slice(0, 2)
    .map(u => u.username ?? u.name ?? "Mitglied");

  const communityCreator = ev.approvalStatus || ev.series?.approvalStatus ? ev.createdBy : null;
  const meta = [
    ev.format ? `Turnier · ${formatLabel(ev.format)}` : null,
    categoryLabel(ev.category),
  ].filter(Boolean).join(" · ");

  const isOpenPhase = phase.phase === "open" || phase.phase === "full";

  return {
    id: ev.id,
    href: `/tournament/${ev.id}`,
    title: ev.title,
    game: ev.game,
    coverUrl: ev.coverImageUrl ?? ev.series?.coverImageUrl ?? null,
    omaOriginal: isOmaOriginal(ev),
    phase,
    // Laufendes Zeitraum-Event: Kalenderblock zeigt das Ende ("BIS 19."), nicht den längst vergangenen Start
    date: phase.phase === "period" && ev.endAt
      ? { ...dateBlock(ev.endAt, now), top: "BIS" }
      : dateBlock(ev.startAt, now),
    series: ev.series
      ? { name: ev.series.name, color: resolveSeriesColor(ev.series.icon), href: `/events/series/${ev.series.id}` }
      : null,
    metaLine: meta,
    playerCount: players.length,
    maxPlayers: ev.maxPlayers,
    coins: eventParticipationCoins(ev),
    isRegistered,
    urgency: isOpenPhase
      ? urgencyHint({ startAt: ev.startAt, maxPlayers: ev.maxPlayers, playerCount: players.length, isRegistered }, now)
      : null,
    relevance: relevanceTags({ game: ev.game, squadId: ev.squadId ?? ev.series?.squadId ?? null }, viewer),
    avatars: sorted.slice(0, 3),
    friendNames,
    communityBy: communityCreator ? (communityCreator.username ?? communityCreator.name ?? "Mitglied") : null,
  };
}

// Was die Event-Kacheln über den Betrachter wissen müssen: seine Spiele ("Dein Spiel"),
// seine Squads ("Dein Squad") und Squad-Kameraden (zuerst in den Avataren, als "Freunde").
// Eine Quelle für Events-Seite und Startseite.

import { prisma } from "@/lib/prisma";
import { IN_WHERE } from "@/lib/games/service";
import { gameKeys } from "@/lib/games/match";

export interface EventViewerContext {
  myGameKeys: Set<string>;
  mySquadIds: Set<string>;
  /** Mitglieder deiner Squads (ohne dich) */
  friendIds: Set<string>;
}

export const EMPTY_VIEWER: EventViewerContext = { myGameKeys: new Set(), mySquadIds: new Set(), friendIds: new Set() };

export async function loadEventViewerContext(userId: string | null | undefined): Promise<EventViewerContext> {
  if (!userId) return EMPTY_VIEWER;
  const [reactions, memberships] = await Promise.all([
    prisma.gameReaction.findMany({
      where: { userId, ...IN_WHERE },
      select: { game: { select: { nameKey: true, aliases: true } } },
    }),
    prisma.squadMembership.findMany({ where: { userId }, select: { squadId: true } }),
  ]);
  const mySquadIds = new Set(memberships.map(m => m.squadId));
  const mates = mySquadIds.size
    ? await prisma.squadMembership.findMany({
        where: { squadId: { in: [...mySquadIds] }, userId: { not: userId } },
        select: { userId: true },
      })
    : [];
  return {
    myGameKeys: new Set(reactions.flatMap(r => gameKeys(r.game))),
    mySquadIds,
    friendIds: new Set(mates.map(m => m.userId)),
  };
}

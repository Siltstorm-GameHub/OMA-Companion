/**
 * Matches der Spieleliste — nur serverseitig.
 *
 * Sind mindestens MATCH_MIN Mitglieder eines Squads bei einem Spiel "Am Start", ist das ein Match: Beim
 * ersten Erreichen bekommen alle diese Mitglieder eine Benachrichtigung mit "Runde planen", wer später
 * dazukommt, bekommt sie für sich (matchRecipients in swipe.ts). GameMatch merkt sich, dass das Squad
 * schon benachrichtigt wurde.
 */

import { prisma } from "@/lib/prisma";
import { IN_WHERE } from "./service";
import { MATCH_MIN, matchRecipients } from "./swipe";
import { notifyGameUsers } from "./notify";

export interface GameMatchInfo {
  squadId: string;
  squadName: string;
  /** Wie viele aus dem Squad am Start sind */
  count: number;
  /** Mitglieder (ohne einen selbst), die am Start sind — für die Anzeige */
  others: { id: string; name: string; image: string | null }[];
  /** Gerade neu entstanden bzw. man ist gerade neu dazugekommen */
  isNew: boolean;
}

/** Matches eines Mitglieds für ein Spiel (alle Squads, in denen genug am Start sind). Mit notify=true
 *  werden neue Matches gespeichert und die betroffenen Mitglieder benachrichtigt. */
export async function squadMatchesFor(userId: string, gameId: string, notify = false): Promise<GameMatchInfo[]> {
  const memberships = await prisma.squadMembership.findMany({
    where: { userId, squad: { hidden: false } },
    select: { squad: { select: { id: true, name: true, memberships: { select: { userId: true } } } } },
  });
  if (memberships.length === 0) return [];

  const game = await prisma.game.findUnique({ where: { id: gameId }, select: { slug: true, name: true } });
  if (!game) return [];

  const allMemberIds = [...new Set(memberships.flatMap(m => m.squad.memberships.map(x => x.userId)))];
  const inRows = await prisma.gameReaction.findMany({
    where: { gameId, userId: { in: allMemberIds }, ...IN_WHERE, user: { deletedAt: null } },
    select: { userId: true, user: { select: { name: true, username: true, image: true } } },
  });
  const inById = new Map(inRows.map(r => [r.userId, r.user]));

  const out: GameMatchInfo[] = [];
  for (const { squad } of memberships) {
    const inMembers = squad.memberships.map(m => m.userId).filter(id => inById.has(id));
    if (!inMembers.includes(userId) || inMembers.length < MATCH_MIN) continue;
    const existing = await prisma.gameMatch.findUnique({ where: { squadId_gameId: { squadId: squad.id, gameId } } });
    const recipients = matchRecipients(inMembers, existing?.size ?? null, userId);

    const isNew = recipients.includes(userId);
    if (notify && recipients.length > 0) {
      await prisma.gameMatch.upsert({
        where: { squadId_gameId: { squadId: squad.id, gameId } },
        create: { squadId: squad.id, gameId, size: inMembers.length },
        update: { size: inMembers.length },
      });
      await notifyGameUsers(recipients, {
        title: `Match: ${inMembers.length} aus ${squad.name} sind bei ${game.name} am Start`,
        body: "Ihr habt es alle und würdet spielen — plant eine Runde!",
        url: `/spiele/${game.slug}?match=${squad.id}`,
      });
    }
    out.push({
      squadId: squad.id,
      squadName: squad.name,
      count: inMembers.length,
      others: inMembers
        .filter(id => id !== userId)
        .map(id => {
          const u = inById.get(id)!;
          return { id, name: u.username ?? u.name ?? "Mitglied", image: u.image };
        }),
      isNew,
    });
  }
  return out;
}

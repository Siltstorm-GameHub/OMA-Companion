/**
 * Matches der Spieleliste — nur serverseitig.
 *
 * Ist man bei einem Spiel "Am Start" und mindestens ein anderer User auch, ist das ein Match (unabhängig
 * von Squads). Jeder User wird pro Spiel einmal benachrichtigt, sobald er zum ersten Mal einen Mitspieler
 * hat: Wer "Am Start" swipt, bekommt das Match für sich, und wer bisher allein am Start war, erfährt,
 * dass jetzt jemand dazugekommen ist (matchRecipients in swipe.ts). GameMatch merkt sich, wer schon
 * benachrichtigt wurde.
 */

import { prisma } from "@/lib/prisma";
import { IN_WHERE } from "./service";
import { MATCH_MIN, matchRecipients, othersLabel } from "./swipe";
import { notifyGameUsers } from "./notify";

/** So viele Mitspieler werden mit Namen angezeigt, der Rest nur gezählt. */
const OTHERS_SHOWN = 12;

export interface GameMatchInfo {
  /** Wie viele insgesamt am Start sind (mit einem selbst) */
  count: number;
  /** Andere User, die am Start sind (höchstens OTHERS_SHOWN) — für die Anzeige */
  others: { id: string; name: string; image: string | null }[];
  /** Gerade neu entstanden (man wurde für das Spiel noch nie über ein Match benachrichtigt) */
  isNew: boolean;
}

const displayName = (u: { name: string | null; username: string | null }) => u.username ?? u.name ?? "Mitglied";

/** Match eines Users für ein Spiel (null = man ist nicht am Start oder allein). Mit notify=true werden
 *  neue Matches gespeichert und die Betroffenen benachrichtigt. */
export async function userMatchFor(userId: string, gameId: string, notify = false): Promise<GameMatchInfo | null> {
  const inRows = await prisma.gameReaction.findMany({
    where: { gameId, ...IN_WHERE, user: { deletedAt: null } },
    select: { userId: true, updatedAt: true, user: { select: { name: true, username: true, image: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const inIds = inRows.map(r => r.userId);
  if (!inIds.includes(userId) || inIds.length < MATCH_MIN) return null;

  const notified = await prisma.gameMatch.findMany({ where: { gameId, userId: { in: inIds } }, select: { userId: true } });
  const recipients = matchRecipients(inIds, new Set(notified.map(n => n.userId)));
  const isNew = recipients.includes(userId);

  const otherRows = inRows.filter(r => r.userId !== userId);
  const info: GameMatchInfo = {
    count: inIds.length,
    others: otherRows.slice(0, OTHERS_SHOWN).map(r => ({ id: r.userId, name: displayName(r.user), image: r.user.image })),
    isNew,
  };

  if (notify && recipients.length > 0) {
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { slug: true, name: true } });
    if (!game) return info;
    await prisma.gameMatch.createMany({ data: recipients.map(id => ({ userId: id, gameId })), skipDuplicates: true });
    const url = `/spiele/${game.slug}`;
    if (isNew) {
      await notifyGameUsers([userId], {
        title: `Match bei ${game.name}`,
        body: `${othersLabel(info)} ${info.count > 2 ? "sind" : "ist"} auch am Start — plant eine Runde!`,
        url,
      });
    }
    const me = inRows.find(r => r.userId === userId)!;
    const waiting = recipients.filter(id => id !== userId);
    await notifyGameUsers(waiting, {
      title: `Match bei ${game.name}`,
      body: `${displayName(me.user)} ist jetzt auch am Start — plant eine Runde!`,
      url,
    });
  }
  return info;
}

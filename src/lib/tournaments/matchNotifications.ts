// "Dein Match ist bereit": sobald beide Gegner eines Matches feststehen (z.B. nach dem Aufrücken im
// K.O.-Baum oder beim Erstellen der K.O.-Runde), bekommen beide Spieler eine Benachrichtigung über die
// Regel "match_ready" (Push / In-App / Discord-DM im Admin konfigurierbar).

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { knockoutRoundLabel } from "./groupStage";

const displayName = (u: { username: string | null; name: string | null } | null) => u?.username ?? u?.name ?? "deinem Gegner";

async function send(eventId: string, matchIds: string[]) {
  if (matchIds.length === 0) return;
  const [event, matches] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }),
    prisma.match.findMany({
      where: { id: { in: matchIds }, eventId, playedAt: null },
      select: { id: true, round: true, groupIndex: true, isThirdPlace: true, player1Id: true, player2Id: true },
    }),
  ]);
  if (!event || matches.length === 0) return;
  const totalRounds = (await prisma.match.aggregate({
    where: { eventId, groupIndex: null, isThirdPlace: false },
    _max: { round: true },
  }))._max.round ?? 0;
  const userIds = [...new Set(matches.flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is string => !!id))];
  const users = new Map((await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true },
  })).map(u => [u.id, u]));

  for (const m of matches) {
    if (!m.player1Id || !m.player2Id) continue;
    const stage = m.isThirdPlace ? "Spiel um Platz 3"
      : m.groupIndex == null && totalRounds ? knockoutRoundLabel(m.round, totalRounds)
      : `Runde ${m.round}`;
    for (const [me, opp] of [[m.player1Id, m.player2Id], [m.player2Id, m.player1Id]] as const) {
      await dispatchNotification("match_ready", {
        users: [me],
        placeholders: {
          "{eventName}": event.title,
          "{opponent}": displayName(users.get(opp) ?? null),
          "{round}": stage,
        },
        urlOverride: `/tournament/${eventId}`,
      });
    }
  }
}

/**
 * Nach dem Erstellen eines K.O.-Baums bzw. der K.O.-Runde: alle Paarungen, deren Gegner schon
 * feststehen (erste Runde ohne Freilose; bei Hin-/Rückspiel nur das Hinspiel), benachrichtigen.
 */
export async function notifyKnockoutCreated(eventId: string) {
  const ready = await prisma.match.findMany({
    // Einzelspiele (leg null) und Hinspiele — nicht NOT { leg: 2 }, das schlösse in SQL auch NULL aus
    where: { eventId, groupIndex: null, playedAt: null, player1Id: { not: null }, player2Id: { not: null }, OR: [{ leg: null }, { leg: 1 }] },
    select: { id: true },
  });
  notifyMatchReady(eventId, ready.map(m => m.id));
}

/**
 * Benachrichtigt die Spieler der angegebenen Matches. Läuft nach der Antwort (after), damit das
 * Eintragen nicht auf Push/Discord wartet; Fehler werden geloggt, nie geworfen.
 */
export function notifyMatchReady(eventId: string, matchIds: string[]) {
  const run = () => send(eventId, matchIds).catch(err => console.error("[match_ready] Benachrichtigung fehlgeschlagen:", err));
  try {
    after(run);
  } catch {
    // Außerhalb eines Requests (z.B. Skripte) gibt es kein after() — dann direkt im Hintergrund
    void run();
  }
}

// "Du bist ausgelost": nach jeder Auslosung bekommt JEDER ausgeloste Spieler eine Meldung mit seinem
// Einstieg — erster Gegner, Gruppe, Freilos bzw. spielfreier Spieltag. Vorher gab es nur beim K.O.-Baum
// eine Meldung (match_ready) und nur für Spieler mit feststehendem Gegner; Liga und Gruppen blieben stumm.
// Dazu ein kurzer Post im Discord-Kanal des Events bzw. der Reihe (nur wenn einer eingestellt ist).

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { resolveEventChannelId } from "@/lib/event-discord-channel";
import { sendDiscordMessage } from "@/lib/discord-rest";
import { groupLetter } from "./groupStage";

type M = { round: number; groupIndex: number | null; player1Id: string | null; player2Id: string | null; winnerId: string | null; leg: number | null; isThirdPlace: boolean };

/** Einstiegs-Text für einen Spieler (rein, testbar). */
export function drawLineFor(
  userId: string, format: string | null, matches: M[], groupIndex: number | null, nameOf: (id: string) => string,
): string {
  const mine = matches
    .filter(m => (m.player1Id === userId || m.player2Id === userId) && m.leg !== 2 && !m.isThirdPlace)
    .sort((a, b) => a.round - b.round);
  const first = mine[0];
  const opponent = first ? (first.player1Id === userId ? first.player2Id : first.player1Id) : null;

  if (format === "single_elimination") {
    if (first && first.round === 1 && !opponent) return "Du hast in Runde 1 ein Freilos und steigst in Runde 2 ein.";
    if (first && opponent) return `Dein erstes Match: gegen ${nameOf(opponent)} (Runde ${first.round}).`;
    return "Du bist im Turnierbaum.";
  }
  if (format === "group_knockout") {
    const g = groupIndex != null ? `Du spielst in Gruppe ${groupLetter(groupIndex)}.` : "Du bist ausgelost.";
    return opponent ? `${g} Erstes Spiel: gegen ${nameOf(opponent)} (Spieltag ${first!.round}).` : g;
  }
  // Liga / Jeder gegen jeden
  if (!first || !opponent) return "Du bist im Spielplan.";
  return first.round > 1
    ? `Am Spieltag 1 bist du spielfrei. Dein erstes Spiel: Spieltag ${first.round} gegen ${nameOf(opponent)}.`
    : `Dein erstes Spiel: Spieltag 1 gegen ${nameOf(opponent)}.`;
}

async function send(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true, format: true, discordChannelId: true, series: { select: { discordChannelId: true } },
      participants: { select: { userId: true, groupIndex: true } },
      matches: { select: { round: true, groupIndex: true, player1Id: true, player2Id: true, winnerId: true, leg: true, isThirdPlace: true } },
    },
  });
  if (!event || event.matches.length === 0) return;
  const inPlan = new Set(event.matches.flatMap(m => [m.player1Id, m.player2Id]).filter((id): id is string => !!id));
  const players = event.participants.filter(p => inPlan.has(p.userId));
  const users = new Map((await prisma.user.findMany({
    where: { id: { in: [...inPlan] } }, select: { id: true, username: true, name: true },
  })).map(u => [u.id, u.username ?? u.name ?? "?"]));
  const nameOf = (id: string) => users.get(id) ?? "?";

  const url = `/tournament/${eventId}`;
  const title = `Ausgelost: ${event.title}`;
  await Promise.allSettled(players.map(async (p) => {
    const body = drawLineFor(p.userId, event.format, event.matches, p.groupIndex, nameOf);
    await createNotification(p.userId, { type: "event_start", title, body, url });
    await sendPushToUsers([p.userId], { title, body, url });
  }));

  // Discord: nur im eigenen Kanal des Events bzw. der Reihe — nicht im allgemeinen News-Kanal
  const channelId = resolveEventChannelId(event);
  if (channelId && process.env.DISCORD_BOT_TOKEN) {
    const base = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
    const groupCount = new Set(event.participants.map(p => p.groupIndex).filter(g => g != null)).size;
    const what = event.format === "single_elimination" ? "Der Turnierbaum steht"
      : event.format === "group_knockout" ? `Die ${groupCount} Gruppen stehen`
      : "Der Spielplan steht";
    await sendDiscordMessage(channelId, {
      title: `🎲 Ausgelost: ${event.title}`,
      description: `${what}: ${players.length} Spieler sind dabei.\nJeder hat eine Meldung mit seinem ersten Gegner bekommen.`,
      url: `${base}${url}`,
      color: 0x14b8a6,
    }).catch(err => console.error("[draw] Discord-Post fehlgeschlagen", eventId, err));
  }
}

/** Nach der Antwort verschicken (after), Fehler nur loggen. */
export function notifyDrawResult(eventId: string) {
  const run = () => send(eventId).catch(err => console.error("[draw] Meldung fehlgeschlagen", eventId, err));
  try { after(run); } catch { void run(); }
}

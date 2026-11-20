// Spieler nach der Auslosung ersetzen: Fällt ein ausgeloster Spieler aus, übernimmt ein anderer
// (z.B. von der Warteliste oder einer, der beim Check-in nicht bereit war) seinen Platz in allen noch
// offenen Spielen. Bereits gespielte Spiele bleiben beim alten Spieler.

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { ApplyMatchResultError } from "./applyMatchResult";
import { withDrawLock } from "./draw";
import { isDrawFormat } from "./draw-plan";
import { drawLineFor } from "./drawNotifications";

export async function replacePlayer(eventId: string, fromId: string, toId: string): Promise<{ replaced: number }> {
  if (!fromId || !toId || fromId === toId) throw new ApplyMatchResultError("Bitte zwei verschiedene Spieler wählen.", 400);

  const result = await withDrawLock(eventId, async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { format: true } });
    if (!event) throw new ApplyMatchResultError("Nicht gefunden", 404);
    if (!isDrawFormat(event.format)) throw new ApplyMatchResultError("Ersetzen gibt es nur bei ausgelosten 1-gegen-1-Turnieren.", 400);

    const [from, to] = await Promise.all([
      tx.tournamentParticipant.findUnique({ where: { eventId_userId: { eventId, userId: fromId } } }),
      tx.tournamentParticipant.findUnique({ where: { eventId_userId: { eventId, userId: toId } } }),
    ]);
    if (!from) throw new ApplyMatchResultError("Der Spieler ist nicht im Turnier.", 400);
    if (to) throw new ApplyMatchResultError("Der neue Spieler ist schon im Turnier.", 409);

    const open = await tx.match.findMany({
      where: { eventId, playedAt: null, OR: [{ player1Id: fromId }, { player2Id: fromId }] },
      select: { id: true, player1Id: true, player2Id: true, winnerId: true },
    });
    if (open.length === 0) throw new ApplyMatchResultError("Der Spieler hat keine offenen Spiele mehr.", 400);

    for (const m of open) {
      await tx.match.update({
        where: { id: m.id },
        data: {
          ...(m.player1Id === fromId && { player1Id: toId }),
          ...(m.player2Id === fromId && { player2Id: toId }),
          // Freilos: der Freilos-Sieger wechselt mit
          ...(m.winnerId === fromId && { winnerId: toId }),
        },
      });
    }
    // Aufgerückt per Freilos (Folgematch schon belegt, aber selbst noch ungespielt) ist oben mit erfasst;
    // Turnier-Eintrag übernimmt Gruppe und Setzplatz
    await tx.tournamentParticipant.update({ where: { id: from.id }, data: { userId: toId } });

    // Der Neue ist jetzt Spieler des Events (Zuschauer werden umgewandelt), nicht mehr auf der Warteliste
    const reg = await tx.eventRegistration.findUnique({ where: { userId_eventId: { userId: toId, eventId } } });
    if (!reg) await tx.eventRegistration.create({ data: { userId: toId, eventId, role: "player", checkedInAt: new Date() } });
    else await tx.eventRegistration.update({ where: { id: reg.id }, data: { role: "player", checkedInAt: reg.checkedInAt ?? new Date() } });
    await tx.eventWaitlistEntry.deleteMany({ where: { eventId, userId: toId } });

    return { replaced: open.length };
  });

  // Meldungen: der Neue mit seinem Einstieg, der Alte weiß Bescheid
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true, format: true,
        participants: { where: { userId: toId }, select: { groupIndex: true } },
        matches: { select: { round: true, groupIndex: true, player1Id: true, player2Id: true, winnerId: true, leg: true, isThirdPlace: true, playedAt: true } },
      },
    });
    if (event) {
      const ids = [...new Set(event.matches.flatMap(m => [m.player1Id, m.player2Id]).filter((x): x is string => !!x))];
      const names = new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, name: true } }))
        .map(u => [u.id, u.username ?? u.name ?? "?"]));
      const url = `/tournament/${eventId}`;
      const line = drawLineFor(toId, event.format, event.matches.filter(m => !m.playedAt), event.participants[0]?.groupIndex ?? null, id => names.get(id) ?? "?");
      const inTitle = `Du bist nachgerückt: ${event.title}`;
      const outTitle = `Du wurdest ersetzt: ${event.title}`;
      const outBody = "Der Veranstalter hat deinen Platz im Turnier an einen anderen Spieler gegeben.";
      await Promise.allSettled([
        createNotification(toId, { type: "event_start", title: inTitle, body: line, url }),
        sendPushToUsers([toId], { title: inTitle, body: line, url }),
        createNotification(fromId, { type: "event_start", title: outTitle, body: outBody, url }),
      ]);
    }
  } catch (err) {
    console.error("[replace] Meldung fehlgeschlagen", eventId, err);
  }
  return result;
}

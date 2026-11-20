// ============================================
// Check-in — Meldungen an die Spieler
// ============================================
// 1) "Check-in ist offen": sobald das Fenster öffnet (CHECK_IN_MINUTES vor dem Start), einmal je Event an
//    alle angemeldeten Spieler, die noch nicht bereit sind. Es gibt keinen Minuten-Cron (alle Crons laufen
//    1×/Tag) — deshalb lazy über syncDueEventActivations (lib/event-lifecycle.ts) beim Laden von Seiten.
// 2) "Nicht ausgelost": nach der Auslosung an alle, die nicht eingecheckt waren und deshalb fehlen.
// Beide Male wird in Event.publishStateJson vermerkt, dass verschickt wurde (kein doppelter Versand).

import { prisma } from "@/lib/prisma";
import { CHECK_IN_MINUTES, checkInOpensAt } from "@/lib/checkin";
import { createNotificationForUsers } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { parsePublishState, type PublishState } from "@/lib/event-publish-state";

async function markState(eventId: string, json: string | null, patch: Partial<PublishState>) {
  const state = parsePublishState(json);
  await prisma.event.update({ where: { id: eventId }, data: { publishStateJson: JSON.stringify({ ...state, ...patch }) } });
}

async function send(userIds: string[], title: string, body: string, url: string) {
  if (!userIds.length) return;
  await Promise.allSettled([
    createNotificationForUsers(userIds, { type: "event_start", title, body, url }),
    sendPushToUsers(userIds, { title, body, url }),
  ]);
}

/** "Check-in ist offen" für alle Events, deren Fenster gerade offen ist (noch nicht ausgelost). Wirft nie. */
export async function notifyOpenCheckIns(now = new Date()): Promise<number> {
  try {
    const events = await prisma.event.findMany({
      where: {
        checkInEnabled: true, hidden: false,
        status: { in: ["open", "active", "closed"] },
        // Fenster offen: Start höchstens CHECK_IN_MINUTES entfernt (und nicht länger als 2 Std vorbei)
        startAt: { lte: new Date(now.getTime() + CHECK_IN_MINUTES * 60_000), gte: new Date(now.getTime() - 2 * 3_600_000) },
        matches: { none: {} },
      },
      select: {
        id: true, title: true, startAt: true, publishStateJson: true,
        registrations: { where: { role: { not: "spectator" }, checkedInAt: null }, select: { userId: true } },
      },
    });
    let sent = 0;
    for (const ev of events) {
      if (parsePublishState(ev.publishStateJson).checkInNotifiedAt || checkInOpensAt(ev) > now) continue;
      await markState(ev.id, ev.publishStateJson, { checkInNotifiedAt: now.toISOString() });
      await send(ev.registrations.map(r => r.userId), "Check-in ist offen",
        `„${ev.title}“ startet gleich. Drück „Bin bereit“, sonst wirst du nicht ausgelost.`, `/tournament/${ev.id}`);
      sent++;
    }
    return sent;
  } catch (err) {
    console.error("[checkin] Meldung 'Check-in offen' fehlgeschlagen", err);
    return 0;
  }
}

/** Nach der Auslosung: Nicht-Eingecheckte informieren, dass sie diesmal nicht dabei sind. Wirft nie. */
export async function notifyNotDrawn(eventId: string, drawnIds?: string[]): Promise<void> {
  try {
    const ev = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        title: true, checkInEnabled: true, publishStateJson: true,
        registrations: { where: { role: { not: "spectator" }, checkedInAt: null }, select: { userId: true } },
        participants: { select: { userId: true } },
      },
    });
    if (!ev?.checkInEnabled || parsePublishState(ev.publishStateJson).notDrawnNotifiedAt) return;
    const drawn = new Set(drawnIds ?? ev.participants.map(p => p.userId));
    const missing = ev.registrations.map(r => r.userId).filter(id => !drawn.has(id));
    await markState(eventId, ev.publishStateJson, { notDrawnNotifiedAt: new Date().toISOString() });
    await send(missing, "Nicht ausgelost",
      `Bei „${ev.title}“ warst du nicht eingecheckt und bist diesmal nicht im Turnier. Beim nächsten Mal rechtzeitig „Bin bereit“ drücken.`,
      `/tournament/${eventId}`);
  } catch (err) {
    console.error("[checkin] Meldung 'nicht ausgelost' fehlgeschlagen", eventId, err);
  }
}

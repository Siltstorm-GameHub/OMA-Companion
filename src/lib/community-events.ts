// ============================================
// Mitglieder-Events — von normalen Usern angelegte Events und Eventreihen
// ============================================
// - Sofort öffentlich in der App sichtbar, Mods können sie jederzeit bearbeiten/ausblenden.
// - Discord-Ankündigung, Discord-Scheduled-Event, Push und Erinnerungen erst nach Mod-Freigabe
//   (approvalStatus "pending" → "approved"). Events einer wartenden Reihe warten mit.
// - Mods können ablehnen ("rejected", mit Grund in approvalNote): das Event/die Reihe wird
//   ausgeblendet (hiddenByModAt), der Ersteller benachrichtigt. Er kann es überarbeiten und erneut
//   einreichen (resubmit*).
// - Mengenlimits je User (offene Einzel-Events, aktive Reihen) und Belohnungs-Obergrenzen:
//   lib/community-event-limits.ts.

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-publish";
import { getCommunityLimits, type CommunityLimitsConfig } from "@/lib/community-event-limits";
import { createNotification } from "@/lib/notifications";
import { sendPushForType } from "@/lib/push";
import { checkCommunityGoal } from "@/lib/community-goal-milestones";

export const APPROVAL_PENDING = "pending";
export const APPROVAL_APPROVED = "approved";
export const APPROVAL_REJECTED = "rejected";

/** Freigabe-Status für ein neu angelegtes Event/eine neue Reihe. */
export function initialApprovalStatus(isModerator: boolean): string | null {
  return isModerator ? null : APPROVAL_PENDING;
}

/** Wartet das Event (direkt oder über seine Reihe) noch auf die Mod-Freigabe? */
export function isAwaitingApproval(event: {
  approvalStatus?: string | null;
  series?: { approvalStatus?: string | null } | null;
}): boolean {
  return event.approvalStatus === APPROVAL_PENDING || event.series?.approvalStatus === APPROVAL_PENDING;
}

/** Wurde das Event (direkt oder über seine Reihe) abgelehnt? */
export function isRejected(event: {
  approvalStatus?: string | null;
  series?: { approvalStatus?: string | null } | null;
}): boolean {
  return event.approvalStatus === APPROVAL_REJECTED || event.series?.approvalStatus === APPROVAL_REJECTED;
}

const BLOCKED = [APPROVAL_PENDING, APPROVAL_REJECTED];

/** Prisma-Filter: nur Events, die NICHT auf eine Freigabe warten und nicht abgelehnt sind (für
 *  Ankündigungen/Erinnerungen). `notIn` allein würde in SQL auch NULL ausschließen — daher explizit. */
export const notAwaitingApprovalWhere = {
  AND: [
    { OR: [{ approvalStatus: null }, { approvalStatus: { notIn: BLOCKED } }] },
    {
      OR: [
        { seriesId: null },
        { series: { approvalStatus: null } },
        { series: { approvalStatus: { notIn: BLOCKED } } },
      ],
    },
  ],
};

/** Beendete Events: zählen nicht mehr zum Limit und brauchen keine Freigabe mehr.
 *  "closed" heißt nur "voll" — das Event steht noch an und zählt weiter. */
const DONE_EVENT_STATUSES = ["finished", "archived", "cancelled"];

/** Prisma-Filter: Einzel-Events, die auf eine Freigabe warten (Termine wartender Reihen werden mit
 *  der Reihe freigegeben und erscheinen nicht einzeln). Für Verwalten-Liste und Admin-Inbox. */
export const pendingApprovalEventWhere = {
  approvalStatus: APPROVAL_PENDING,
  status: { notIn: DONE_EVENT_STATUSES },
  OR: [{ seriesId: null }, { series: { approvalStatus: null } }, { series: { approvalStatus: { not: APPROVAL_PENDING } } }],
};

/** Wie viele offene Einzel-Events bzw. aktive Reihen hat der User gerade angelegt? */
export async function getCreatorUsage(userId: string) {
  const [openEvents, activeSeries] = await Promise.all([
    prisma.event.count({
      where: { createdById: userId, seriesId: null, status: { notIn: DONE_EVENT_STATUSES } },
    }),
    // Aktive Reihen zählen nur, solange noch ein Termin offen ist (oder noch keiner angelegt wurde).
    // Sind alle Termine gespielt, wartet die Reihe nur noch auf den Saisonabschluss durch einen Mod —
    // das Mitglied soll deshalb nicht am Anlegen einer neuen Reihe gehindert werden.
    prisma.eventSeries.count({
      where: {
        createdById: userId, status: "active",
        OR: [{ events: { none: {} } }, { events: { some: { status: { notIn: DONE_EVENT_STATUSES } } } }],
      },
    }),
  ]);
  return { openEvents, activeSeries };
}

export class CreatorLimitError extends Error {
  status = 409;
}

/** Wirft CreatorLimitError, wenn der User das Limit für `kind` schon ausgeschöpft hat. */
export async function assertCreatorQuota(
  userId: string,
  kind: "event" | "series",
  limits?: CommunityLimitsConfig,
) {
  const cfg = limits ?? (await getCommunityLimits());
  const usage = await getCreatorUsage(userId);
  if (kind === "event" && usage.openEvents >= cfg.maxOpenEvents) {
    throw new CreatorLimitError(
      `Du hast schon ${usage.openEvents} offene Events, mehr als ${cfg.maxOpenEvents} gleichzeitig gehen nicht. Schließ zuerst ein Event ab.`,
    );
  }
  if (kind === "series" && usage.activeSeries >= cfg.maxActiveSeries) {
    throw new CreatorLimitError(
      `Du hast schon ${usage.activeSeries} aktive Eventreihen, mehr als ${cfg.maxActiveSeries} gleichzeitig gehen nicht.`,
    );
  }
}

/** In-App-Benachrichtigung und Push an den Ersteller (Fehler werden geschluckt). */
async function notifyCreator(userId: string | null, title: string, body: string, url: string) {
  if (!userId) return;
  await Promise.allSettled([
    createNotification(userId, { type: "admin", title, body, url }),
    sendPushForType([userId], "admin", { title, body, url }),
  ]);
}

/** Mod-Freigabe eines Events: Status setzen, (falls sichtbar) ankündigen, Ersteller benachrichtigen. */
export async function approveEvent(eventId: string) {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { approvalStatus: APPROVAL_APPROVED, approvalNote: null },
    select: { id: true, title: true, hidden: true, status: true, createdById: true, series: { select: { approvalStatus: true } } },
  });
  if (!event.hidden && !isAwaitingApproval(event) && !DONE_EVENT_STATUSES.includes(event.status)) {
    after(() => publishEvent(event.id));
  }
  after(() => notifyCreator(event.createdById, "Dein Event ist freigegeben",
    `„${event.title}“ wird jetzt auf Discord angekündigt.`, `/events/verwalten/${event.id}`));
  // Community-Ziel: bis zur Freigabe wurde nichts ausgezahlt — jetzt nachholen
  if (!isAwaitingApproval(event)) after(() => checkCommunityGoal(event.id));
  return event;
}

/** Mod-Freigabe einer Reihe: Reihe + alle noch wartenden Termine freigeben und offene ankündigen. */
export async function approveSeries(seriesId: string) {
  const [series] = await prisma.$transaction([
    prisma.eventSeries.update({
      where: { id: seriesId }, data: { approvalStatus: APPROVAL_APPROVED, approvalNote: null },
      select: { name: true, createdById: true },
    }),
    prisma.event.updateMany({ where: { seriesId, approvalStatus: APPROVAL_PENDING }, data: { approvalStatus: APPROVAL_APPROVED } }),
  ]);
  const toPublish = await prisma.event.findMany({
    where: { seriesId, hidden: false, status: { notIn: [...DONE_EVENT_STATUSES, "closed"] }, startAt: { gt: new Date() } },
    select: { id: true },
  });
  // Community-Ziele der Termine: bis zur Freigabe wurde nichts ausgezahlt — jetzt nachholen
  const allEvents = await prisma.event.findMany({ where: { seriesId }, select: { id: true } });
  after(async () => {
    for (const { id } of toPublish) await publishEvent(id);
    for (const { id } of allEvents) await checkCommunityGoal(id);
    await notifyCreator(series.createdById, "Deine Eventreihe ist freigegeben",
      `„${series.name}“ wird jetzt auf Discord angekündigt.`, `/events/verwalten/reihen/${seriesId}`);
  });
  return { published: toPublish.length };
}

/** Mod lehnt ein Event ab: ausblenden (nur Mods können es wieder einblenden), Grund speichern,
 *  Ersteller benachrichtigen. */
export async function rejectEvent(eventId: string, reason: string) {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { approvalStatus: APPROVAL_REJECTED, approvalNote: reason, hidden: true, hiddenByModAt: new Date(), publishAt: null },
    select: { id: true, title: true, createdById: true },
  });
  after(() => notifyCreator(event.createdById, "Dein Event wurde nicht freigegeben",
    `„${event.title}“: ${reason}`, `/events/verwalten/${event.id}`));
  return event;
}

/** Mod lehnt eine Reihe ab: Reihe und alle Termine ausblenden, Grund speichern, Ersteller benachrichtigen. */
export async function rejectSeries(seriesId: string, reason: string) {
  const now = new Date();
  const [series] = await prisma.$transaction([
    prisma.eventSeries.update({
      where: { id: seriesId },
      data: { approvalStatus: APPROVAL_REJECTED, approvalNote: reason, hidden: true, hiddenByModAt: now },
      select: { name: true, createdById: true },
    }),
    prisma.event.updateMany({ where: { seriesId }, data: { hidden: true, hiddenByModAt: now, publishAt: null } }),
  ]);
  after(() => notifyCreator(series.createdById, "Deine Eventreihe wurde nicht freigegeben",
    `„${series.name}“: ${reason}`, `/events/verwalten/reihen/${seriesId}`));
  return series;
}

/** Ersteller reicht ein abgelehntes Event nach dem Überarbeiten erneut ein: wieder sichtbar in der
 *  App, wartet erneut auf die Freigabe (keine Ankündigung bis dahin). */
export async function resubmitEvent(eventId: string) {
  return prisma.event.update({
    where: { id: eventId },
    data: { approvalStatus: APPROVAL_PENDING, approvalNote: null, hidden: false, hiddenByModAt: null },
    select: { id: true },
  });
}

/** Wie resubmitEvent, für eine ganze Reihe samt Terminen. */
export async function resubmitSeries(seriesId: string) {
  await prisma.$transaction([
    prisma.eventSeries.update({
      where: { id: seriesId },
      data: { approvalStatus: APPROVAL_PENDING, approvalNote: null, hidden: false, hiddenByModAt: null },
    }),
    prisma.event.updateMany({ where: { seriesId }, data: { hidden: false, hiddenByModAt: null } }),
  ]);
}

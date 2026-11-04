// ============================================
// Community-Events — von normalen Usern angelegte Events und Eventreihen
// ============================================
// - Sofort öffentlich in der App sichtbar, Mods können sie jederzeit bearbeiten/ausblenden.
// - Discord-Ankündigung, Discord-Scheduled-Event, Push und Erinnerungen erst nach Mod-Freigabe
//   (approvalStatus "pending" → "approved"). Events einer wartenden Reihe warten mit.
// - Mengenlimits je User (offene Einzel-Events, aktive Reihen) und Belohnungs-Obergrenzen:
//   lib/community-event-limits.ts.

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishEvent } from "@/lib/event-publish";
import { getCommunityLimits, type CommunityLimitsConfig } from "@/lib/community-event-limits";

export const APPROVAL_PENDING = "pending";
export const APPROVAL_APPROVED = "approved";

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

/** Prisma-Filter: nur Events, die NICHT auf eine Freigabe warten (für Ankündigungen/Erinnerungen).
 *  `not: "pending"` allein würde in SQL auch NULL ausschließen — daher explizit. */
export const notAwaitingApprovalWhere = {
  AND: [
    { OR: [{ approvalStatus: null }, { approvalStatus: { not: APPROVAL_PENDING } }] },
    {
      OR: [
        { seriesId: null },
        { series: { approvalStatus: null } },
        { series: { approvalStatus: { not: APPROVAL_PENDING } } },
      ],
    },
  ],
};

const OPEN_EVENT_STATUSES_EXCLUDED = ["finished", "closed"];

/** Wie viele offene Einzel-Events bzw. aktive Reihen hat der User gerade angelegt? */
export async function getCreatorUsage(userId: string) {
  const [openEvents, activeSeries] = await Promise.all([
    prisma.event.count({
      where: { createdById: userId, seriesId: null, status: { notIn: OPEN_EVENT_STATUSES_EXCLUDED } },
    }),
    prisma.eventSeries.count({ where: { createdById: userId, status: "active" } }),
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
      `Du hast bereits ${usage.openEvents} offene Events — mehr als ${cfg.maxOpenEvents} gleichzeitig sind nicht möglich. Schließe zuerst ein Event ab.`,
    );
  }
  if (kind === "series" && usage.activeSeries >= cfg.maxActiveSeries) {
    throw new CreatorLimitError(
      `Du hast bereits ${usage.activeSeries} aktive Eventreihen — mehr als ${cfg.maxActiveSeries} gleichzeitig sind nicht möglich.`,
    );
  }
}

/** Mod-Freigabe eines Events: Status setzen und (falls sichtbar) ankündigen. */
export async function approveEvent(eventId: string) {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { approvalStatus: APPROVAL_APPROVED },
    select: { id: true, hidden: true, status: true, series: { select: { approvalStatus: true } } },
  });
  if (!event.hidden && !isAwaitingApproval(event) && !OPEN_EVENT_STATUSES_EXCLUDED.includes(event.status)) {
    after(() => publishEvent(event.id));
  }
  return event;
}

/** Mod-Freigabe einer Reihe: Reihe + alle noch wartenden Termine freigeben und offene ankündigen. */
export async function approveSeries(seriesId: string) {
  await prisma.$transaction([
    prisma.eventSeries.update({ where: { id: seriesId }, data: { approvalStatus: APPROVAL_APPROVED } }),
    prisma.event.updateMany({ where: { seriesId, approvalStatus: APPROVAL_PENDING }, data: { approvalStatus: APPROVAL_APPROVED } }),
  ]);
  const toPublish = await prisma.event.findMany({
    where: { seriesId, hidden: false, status: { notIn: OPEN_EVENT_STATUSES_EXCLUDED }, startAt: { gt: new Date() } },
    select: { id: true },
  });
  after(async () => {
    for (const { id } of toPublish) await publishEvent(id);
  });
  return { published: toPublish.length };
}

import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";

/**
 * Bildwünsche: Journalisten bitten die Fotografen um ein Bild zu einem Event. Offene Wünsche erscheinen im
 * Fotografen-Büro; lädt ein Fotograf das Bild dazu hoch, gilt der Wunsch als erfüllt und der Journalist wird
 * benachrichtigt (das Bild liegt danach in der Mediathek, z.B. als Titelbild wählbar).
 */

const DESCRIPTION_MAX = 300;
const MAX_OPEN_PER_REQUESTER = 3;
const MAX_PER_DAY = 5;

async function isActiveMember(userId: string, jobKey: string): Promise<boolean> {
  return !!(await prisma.communityJobMember.findFirst({ where: { userId, jobKey, status: { in: ["ACTIVE", "WARNED"] } } }));
}
async function nameOf(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Jemand";
}

export type PhotoRequestResult = { ok: true } | { error: string };

export async function createPhotoRequest(requesterId: string, data: { eventId?: string; description: string }): Promise<PhotoRequestResult> {
  if (!(await isActiveMember(requesterId, "journalist"))) return { error: "Nur aktive Journalisten können Bilder anfragen" };
  const description = data.description.trim();
  if (!description) return { error: "Bitte beschreibe kurz, welches Bild du brauchst" };
  if (description.length > DESCRIPTION_MAX) return { error: `Beschreibung ist zu lang (max. ${DESCRIPTION_MAX} Zeichen)` };

  let eventTitle = "allgemein";
  if (data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { title: true } });
    if (!event) return { error: "Event nicht gefunden" };
    eventTitle = event.title;
  }

  const [open, today] = await Promise.all([
    prisma.photoRequest.count({ where: { requesterId, status: "OPEN" } }),
    prisma.photoRequest.count({ where: { requesterId, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } } }),
  ]);
  if (open >= MAX_OPEN_PER_REQUESTER) return { error: `Du hast schon ${MAX_OPEN_PER_REQUESTER} offene Bildwünsche` };
  if (today >= MAX_PER_DAY) return { error: `Höchstens ${MAX_PER_DAY} Bildwünsche pro Tag` };

  await prisma.photoRequest.create({ data: { requesterId, eventId: data.eventId || null, description } });

  const fotografen = await prisma.communityJobMember.findMany({
    where: { jobKey: "fotograf", status: { in: ["ACTIVE", "WARNED"] } }, select: { userId: true },
  });
  if (fotografen.length > 0) {
    dispatchNotification("photo_request", {
      users: fotografen.map(f => f.userId),
      placeholders: { "{requesterName}": await nameOf(requesterId), "{eventTitle}": eventTitle, "{description}": description },
    }).catch(() => {});
  }
  return { ok: true };
}

async function withEventTitles<T extends { eventId: string | null }>(items: T[]): Promise<(T & { eventTitle: string | null })[]> {
  const ids = [...new Set(items.map(i => i.eventId).filter((x): x is string => !!x))];
  const events = ids.length > 0 ? await prisma.event.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }) : [];
  const byId = new Map(events.map(e => [e.id, e.title]));
  return items.map(i => ({ ...i, eventTitle: i.eventId ? byId.get(i.eventId) ?? null : null }));
}

/** Offene Wünsche für das Fotografen-Büro. */
export async function listOpenPhotoRequests() {
  const items = await prisma.photoRequest.findMany({
    where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 30,
    include: { requester: { select: { id: true, username: true, name: true } } },
  });
  return withEventTitles(items);
}

/** Eigene Wünsche (Journalist) inkl. Bild, falls erfüllt. */
export async function listMyPhotoRequests(requesterId: string) {
  const items = await prisma.photoRequest.findMany({ where: { requesterId }, orderBy: { createdAt: "desc" }, take: 15 });
  const assetIds = items.map(i => i.fulfilledAssetId).filter((x): x is string => !!x);
  const assets = assetIds.length > 0
    ? await prisma.jobMediaAsset.findMany({ where: { id: { in: assetIds } }, select: { id: true, url: true } })
    : [];
  const urlById = new Map(assets.map(a => [a.id, a.url]));
  const withTitles = await withEventTitles(items);
  return withTitles.map(i => ({ ...i, fulfilledAssetUrl: i.fulfilledAssetId ? urlById.get(i.fulfilledAssetId) ?? null : null }));
}

export async function closePhotoRequest(requesterId: string, id: string): Promise<PhotoRequestResult> {
  const updated = await prisma.photoRequest.updateMany({ where: { id, requesterId, status: "OPEN" }, data: { status: "CLOSED" } });
  return updated.count === 0 ? { error: "Bildwunsch nicht gefunden oder schon abgeschlossen" } : { ok: true };
}

/** Vom Fotograf-Upload aufgerufen (`uploadAsset` mit `requestId`): markiert den Wunsch als erfüllt und benachrichtigt den Journalisten. */
export async function fulfillPhotoRequest(fotografId: string, requestId: string, assetId: string): Promise<void> {
  const updated = await prisma.photoRequest.updateMany({
    where: { id: requestId, status: "OPEN" },
    data: { status: "FULFILLED", fulfilledAssetId: assetId, fulfilledById: fotografId, fulfilledAt: new Date() },
  });
  if (updated.count === 0) return;
  const request = await prisma.photoRequest.findUnique({ where: { id: requestId }, select: { requesterId: true } });
  if (!request) return;
  dispatchNotification("photo_request_fulfilled", {
    users: [request.requesterId], placeholders: { "{fotografName}": await nameOf(fotografId) },
  }).catch(() => {});
}

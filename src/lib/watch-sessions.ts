import { prisma } from "@/lib/prisma";
import { createNotificationForUsers } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { createCache, getCommunityLive } from "@/lib/overlay-state";
import { memberSelect, toMembers, type WatchGroup, type WatchMember } from "@/lib/watch-together";
import { freeSlots, isSessionActive, makeSlug, SESSION_MAX_AGE_MS, SESSION_MAX_MEMBERS } from "@/lib/watch-session-rules";

/**
 * "Zusammen ansehen"-Sessions mit Einladung: Ein Streamer lädt in der Live-Steuerung bis zu 3
 * Mitglieder ein, die bestätigen per Klick — ergibt einen festen Link /zusammen?s=<slug>.
 * Pro Host gibt es höchstens eine laufende Session (eine neue beendet die alte).
 */

export const LIVE_CONTROL_URL = "/profile/overlay/live";

const activeWhere = () => ({ endedAt: null, createdAt: { gte: new Date(Date.now() - SESSION_MAX_AGE_MS) } });

export type SessionPerson = { userId: string; name: string; image: string | null; twitchLogin: string | null; live: boolean; status: string };
export type SessionView = { id: string; slug: string; title: string | null; host: SessionPerson; members: SessionPerson[] };

async function loadSessions(where: object): Promise<SessionView[]> {
  const sessions = await prisma.watchSession.findMany({
    where: { ...activeWhere(), ...where },
    orderBy: { createdAt: "desc" },
    include: { members: true },
  });
  if (!sessions.length) return [];
  const ids = [...new Set(sessions.flatMap(s => [s.hostUserId, ...s.members.map(m => m.userId)]))];
  const [users, live] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: memberSelect }),
    getCommunityLive(),
  ]);
  const person = (userId: string, status: string): SessionPerson => {
    const u = users.find(x => x.id === userId);
    return {
      userId, status, image: u?.image ?? null, twitchLogin: u?.twitchLogin?.toLowerCase() ?? null,
      name: u?.username ?? u?.name ?? "Unbekannt", live: live.has(userId),
    };
  };
  return sessions.map(s => ({
    id: s.id, slug: s.slug, title: s.title,
    host: person(s.hostUserId, "accepted"),
    members: s.members.filter(m => m.userId !== s.hostUserId).map(m => person(m.userId, m.status)),
  }));
}

/** Für die Live-Steuerung: eigene Session, offene Einladungen, bestätigte Teilnahmen. */
export async function getMySessions(userId: string) {
  const [hosting, involved] = await Promise.all([
    loadSessions({ hostUserId: userId }),
    loadSessions({ hostUserId: { not: userId }, members: { some: { userId, status: { in: ["invited", "accepted"] } } } }),
  ]);
  const statusOf = (s: SessionView) => s.members.find(m => m.userId === userId)?.status;
  return {
    hosting: hosting[0] ?? null,
    invites: involved.filter(s => statusOf(s) === "invited"),
    joined: involved.filter(s => statusOf(s) === "accepted"),
  };
}

/** Nur Community-Mitglieder mit Twitch-Kanal, nicht man selbst. */
async function validInvitees(hostUserId: string, userIds: unknown): Promise<string[]> {
  const ids = Array.isArray(userIds) ? [...new Set(userIds.filter((x): x is string => typeof x === "string"))] : [];
  if (!ids.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids.filter(id => id !== hostUserId) }, twitchLogin: { not: null }, leftServerAt: null },
    select: { id: true },
  });
  return users.map(u => u.id);
}

async function notifyInvites(hostUserId: string, userIds: string[]) {
  if (!userIds.length) return;
  const host = await prisma.user.findUnique({ where: { id: hostUserId }, select: { username: true, name: true } });
  const hostName = host?.username ?? host?.name ?? "Ein Mitglied";
  const message = { title: "Einladung: Zusammen streamen", body: `${hostName} lädt dich ein, gemeinsam zu streamen – Zuschauer sehen eure Streams nebeneinander.`, url: LIVE_CONTROL_URL };
  await Promise.all([
    createNotificationForUsers(userIds, { type: "event_start", ...message }),
    sendPushToUsers(userIds, message).catch(() => {}),
  ]);
}

export class SessionError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function createSession(hostUserId: string, title: string | null, inviteIds: unknown) {
  const host = await prisma.user.findUnique({ where: { id: hostUserId }, select: { twitchLogin: true } });
  if (!host?.twitchLogin) throw new SessionError("Bitte zuerst deinen Twitch-Namen im Profil hinterlegen");
  const invitees = (await validInvitees(hostUserId, inviteIds)).slice(0, freeSlots([{ status: "accepted" }]));
  // Eine Session pro Host: die bisherige endet.
  await prisma.watchSession.updateMany({ where: { hostUserId, ...activeWhere() }, data: { endedAt: new Date() } });
  const session = await prisma.watchSession.create({
    data: {
      slug: makeSlug(), title, hostUserId,
      members: { create: [{ userId: hostUserId, status: "accepted" }, ...invitees.map(userId => ({ userId, status: "invited" }))] },
    },
  });
  await notifyInvites(hostUserId, invitees);
  return session;
}

async function loadOwnSession(sessionId: string, hostUserId: string) {
  const s = await prisma.watchSession.findFirst({ where: { id: sessionId, hostUserId, ...activeWhere() }, include: { members: true } });
  if (!s) throw new SessionError("Session nicht gefunden oder beendet", 404);
  return s;
}

export async function inviteToSession(sessionId: string, hostUserId: string, userIds: unknown) {
  const s = await loadOwnSession(sessionId, hostUserId);
  const fresh = (await validInvitees(hostUserId, userIds)).filter(id => !s.members.some(m => m.userId === id && m.status !== "declined"));
  const allowed = fresh.slice(0, freeSlots(s.members));
  if (fresh.length && !allowed.length) throw new SessionError("Mehr als 4 Streams passen nicht in eine Session");
  for (const userId of allowed) {
    await prisma.watchSessionMember.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, status: "invited" },
      update: { status: "invited" },
    });
  }
  await notifyInvites(hostUserId, allowed);
}

/** Eingeladener: annehmen/ablehnen; Teilnehmer: verlassen. */
export async function respondToSession(sessionId: string, userId: string, action: "accept" | "decline" | "leave") {
  const member = await prisma.watchSessionMember.findFirst({
    where: { sessionId, userId, session: { ...activeWhere(), hostUserId: { not: userId } } },
  });
  if (!member) throw new SessionError("Einladung nicht gefunden oder Session beendet", 404);
  if (action === "accept") {
    const s = await prisma.watchSession.findUnique({ where: { id: sessionId }, include: { members: true } });
    const others = s?.members.filter(m => m.userId !== userId && m.status === "accepted").length ?? 0;
    if (others + 1 > SESSION_MAX_MEMBERS) throw new SessionError("Die Session ist schon voll");
  }
  await prisma.watchSessionMember.update({ where: { id: member.id }, data: { status: action === "accept" ? "accepted" : "declined" } });
}

export async function removeFromSession(sessionId: string, hostUserId: string, userId: string) {
  await loadOwnSession(sessionId, hostUserId);
  if (userId === hostUserId) throw new SessionError("Als Host beendest du die Session stattdessen");
  await prisma.watchSessionMember.deleteMany({ where: { sessionId, userId } });
}

export async function endSession(sessionId: string, hostUserId: string) {
  await loadOwnSession(sessionId, hostUserId);
  await prisma.watchSession.update({ where: { id: sessionId }, data: { endedAt: new Date() } });
}

/** Zuschauer-Ansicht /zusammen?s=<slug>: bestätigte Mitglieder (Host zuerst). */
export async function resolveSessionWatch(slug: string): Promise<{ title: string; members: WatchMember[]; ended: boolean } | null> {
  const s = await prisma.watchSession.findUnique({ where: { slug }, include: { members: { where: { status: "accepted" } } } });
  if (!s) return null;
  const ids = [s.hostUserId, ...s.members.map(m => m.userId).filter(id => id !== s.hostUserId)];
  const users = await prisma.user.findMany({ where: { id: { in: ids }, leftServerAt: null }, select: memberSelect });
  const members = (await toMembers(users)).sort((a, b) => ids.indexOf(a.userId) - ids.indexOf(b.userId));
  return {
    title: s.title ?? members.map(m => m.name).join(" + "),
    members,
    ended: !isSessionActive(s, Date.now()),
  };
}

const groupCache = createCache<WatchGroup[]>();

/** Übersicht: laufende Sessions, in denen mindestens 2 bestätigte Mitglieder live sind (30s gecacht). */
export function getSessionGroups(): Promise<WatchGroup[]> {
  return groupCache.get("all", 30_000, loadSessionGroups);
}

async function loadSessionGroups(): Promise<WatchGroup[]> {
  const sessions = await loadSessions({});
  return sessions
    .map(s => ({ s, live: [s.host, ...s.members.filter(m => m.status === "accepted")].filter(p => p.live && p.twitchLogin) }))
    .filter(x => x.live.length >= 2)
    .map(({ s, live }) => ({
      key: `session:${s.slug}`,
      label: s.title ?? live.map(p => p.name).join(" + "),
      game: null,
      members: live.map(p => ({ userId: p.userId, name: p.name, image: p.image, twitchLogin: p.twitchLogin!, live: true, game: null, title: null, viewers: 0 })),
    }));
}

/** Für die Einladungs-Auswahl: Mitglieder mit Twitch-Kanal, live zuerst, optional nach Name gefiltert. */
export async function findInviteCandidates(userId: string, query: string) {
  const q = query.trim();
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId }, twitchLogin: { not: null }, leftServerAt: null,
      ...(q ? { OR: [{ username: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }, { twitchLogin: { contains: q, mode: "insensitive" as const } }] } : {}),
    },
    select: memberSelect,
    take: 200,
  });
  const members = await toMembers(users);
  return members.sort((a, b) => Number(b.live) - Number(a.live) || a.name.localeCompare(b.name)).slice(0, q ? 20 : 12);
}

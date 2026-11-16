// Event-Absprachen — Server-Logik: Rechte, Lesen/Schreiben, Status-Meldungen, Anpinnen (inkl.
// Discord-Spiegelung), Reaktionen, Lesestand und Benachrichtigungen.
// Reine Regeln/Typen: src/lib/event-comments-shared.ts
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { canManageEvent, hasMinRole } from "@/lib/roles";
import { isEventHidden } from "@/lib/event-visibility";
import { getEventEndedAt } from "@/lib/event-completion";
import { checkInOpensAt, checkInState } from "@/lib/checkin";
import { formatBerlinDateTime } from "@/lib/time";
import { createNotification, PREF_KEY } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { resolveEventChannelId } from "@/lib/event-discord-channel";
import { sendDiscordMessage, deleteDiscordMessage } from "@/lib/discord-rest";
import { DISCORD_COLORS } from "@/lib/discord-colors";
import { extractMentionedUserIds } from "@/lib/report-mentions";
import {
  COMMENT_MAX_LENGTH, COMMENT_RATE_LIMIT_MS, COMMENT_STATUSES, REACTION_EMOJIS,
  commentLockAt, normalizeCommentInput, plainCommentText, sanitizeLateMin, shouldNotifyBundled, statusMessage,
  buildAttendanceSummary, eventCommentsUrl, statusMessagesAllowed, threadPhase, type CommentStatus, type EventCommentDTO, type EventCommentsResponse, type EventThreadDTO,
} from "@/lib/event-comments-shared";

export type CommentViewer = { id: string; role: string };
type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

const fail = (error: string, status = 400) => ({ ok: false as const, error, status });

const LIST_LIMIT = 200;

// ── Event laden & Rechte ──────────────────────────────────────────────────────

async function loadEvent(eventId: string) {
  const ev = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, status: true, startAt: true, endAt: true, completionData: true, hidden: true,
      createdById: true, checkInEnabled: true, discordChannelId: true,
      series: { select: { hidden: true, createdById: true, discordChannelId: true } },
      _count: { select: { matches: true } },
    },
  });
  if (!ev) return null;
  const endedAt = new Date(Math.max(getEventEndedAt(ev).getTime(), ev.endAt?.getTime() ?? 0));
  const lockAt = commentLockAt({ status: ev.status, endedAt });
  return { ...ev, hiddenForUsers: isEventHidden(ev), locked: !!lockAt && lockAt <= new Date() };
}
type LoadedEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

async function access(viewer: CommentViewer, eventId: string) {
  const ev = await loadEvent(eventId);
  if (!ev) return { ev: null, canView: false, canManage: false };
  const canManage = await canManageEvent(viewer, eventId);
  return { ev, canView: !ev.hiddenForUsers || canManage, canManage };
}

const displayName = (u: { username: string | null; name: string | null }) => u.username ?? u.name ?? "Mitglied";

// ── Lesen ─────────────────────────────────────────────────────────────────────

export async function listEventComments(viewer: CommentViewer, eventId: string): Promise<Result<EventCommentsResponse>> {
  const { ev, canView, canManage } = await access(viewer, eventId);
  if (!ev || !canView) return fail("Event nicht gefunden", 404);

  const [rows, registration] = await Promise.all([
    prisma.eventComment.findMany({
      where: { eventId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: {
        id: true, content: true, kind: true, status: true, lateMin: true, pinned: true, discordMessageId: true,
        editedAt: true, createdAt: true, userId: true,
        user: { select: { id: true, username: true, name: true, image: true } },
        reactions: { select: { emoji: true, userId: true, user: { select: { username: true, name: true } } } },
      },
    }),
    prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId: viewer.id, eventId } }, select: { id: true } }),
  ]);
  rows.reverse();

  // Veranstalter-Übersicht: wer ist bereit, kommt später, sagt ab, hat sich nicht gemeldet
  let summary: EventCommentsResponse["summary"] = null;
  if (canManage && statusMessagesAllowed(ev.status)) {
    const [players, statuses] = await Promise.all([
      prisma.eventRegistration.findMany({
        where: { eventId, role: { not: "spectator" } },
        select: { userId: true, checkedInAt: true, user: { select: { username: true, name: true } } },
      }),
      getLatestCommentStatuses(eventId),
    ]);
    summary = buildAttendanceSummary(players.map(p => ({
      name: displayName(p.user),
      checkedIn: !!p.checkedInAt,
      status: statuses.get(p.userId) ?? null,
    })));
  }

  const comments: EventCommentDTO[] = rows.map(r => {
    const byEmoji = new Map<string, { count: number; mine: boolean; users: string[] }>();
    for (const re of r.reactions) {
      const e = byEmoji.get(re.emoji) ?? { count: 0, mine: false, users: [] };
      e.count++;
      if (re.userId === viewer.id) e.mine = true;
      e.users.push(displayName(re.user));
      byEmoji.set(re.emoji, e);
    }
    const isOwn = r.userId === viewer.id;
    return {
      id: r.id,
      user: { id: r.user.id, name: displayName(r.user), image: r.user.image },
      content: r.content,
      kind: r.kind === "status" ? "status" : "text",
      status: (r.status as CommentStatus | null) ?? null,
      lateMin: r.lateMin,
      pinned: r.pinned,
      mirrored: !!r.discordMessageId,
      edited: !!r.editedAt,
      createdAt: r.createdAt.toISOString(),
      reactions: REACTION_EMOJIS.filter(e => byEmoji.has(e)).map(e => ({ emoji: e, ...byEmoji.get(e)! })),
      canEdit: isOwn && r.kind === "text" && !ev.locked,
      canDelete: (isOwn || canManage) && !ev.locked,
    };
  });

  const myStatus = [...rows].reverse().find(r => r.userId === viewer.id && r.kind === "status");
  return {
    ok: true,
    data: {
      comments,
      locked: ev.locked,
      canWrite: !ev.locked,
      canPin: canManage && !ev.locked,
      canSetStatus: !!registration && !ev.locked && statusMessagesAllowed(ev.status),
      myStatus: myStatus?.status ? { status: myStatus.status as CommentStatus, lateMin: myStatus.lateMin } : null,
      readyOpensAt: ev.checkInEnabled ? checkInOpensAt(ev).toISOString() : null,
      summary,
    },
  };
}

/**
 * Günstige Versionskennung der Absprachen eines Events für den ETag (Polling): ändert sich bei neuen,
 * bearbeiteten, gepinnten oder gelöschten Nachrichten, Reaktionen, An-/Abmeldungen und Check-ins sowie
 * bei Rechten/Sperre des Betrachters. Ohne Rechte → null (dann normal antworten, inkl. Fehler).
 */
export async function eventCommentsVersion(viewer: CommentViewer, eventId: string): Promise<string | null> {
  const { ev, canView, canManage } = await access(viewer, eventId);
  if (!ev || !canView) return null;
  const [c, r, reg] = await Promise.all([
    prisma.eventComment.aggregate({ where: { eventId }, _count: { _all: true }, _max: { updatedAt: true } }),
    prisma.eventCommentReaction.aggregate({ where: { comment: { eventId } }, _count: { _all: true }, _max: { createdAt: true } }),
    prisma.eventRegistration.aggregate({ where: { eventId }, _count: { _all: true, checkedInAt: true } }),
  ]);
  return hashVersion([
    viewer.id, canManage, ev.status, ev.locked,
    c._count._all, c._max.updatedAt?.getTime(),
    r._count._all, r._max.createdAt?.getTime(),
    reg._count._all, reg._count.checkedInAt,
  ]);
}

/** Kurzer, stabiler Hash (ETag) aus beliebigen Werten bzw. einer fertigen Antwort. */
export function hashVersion(value: unknown): string {
  return `"${createHash("sha1").update(JSON.stringify(value)).digest("base64url").slice(0, 22)}"`;
}

/** Letzter Status je User (für die Teilnehmerliste). */
export async function getLatestCommentStatuses(eventId: string): Promise<Map<string, { status: CommentStatus; lateMin: number | null }>> {
  const rows = await prisma.eventComment.findMany({
    where: { eventId, kind: "status", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { userId: true, status: true, lateMin: true },
  });
  const map = new Map<string, { status: CommentStatus; lateMin: number | null }>();
  for (const r of rows) if (r.status) map.set(r.userId, { status: r.status as CommentStatus, lateMin: r.lateMin });
  return map;
}

/**
 * Nachrichten-Zähler für Eventkarten. unread = Nachrichten anderer seit dem letzten Lesen; wer ein Event
 * nie geöffnet hat, bekommt "ungelesen" nur, wenn er angemeldet ist (sonst nur die Gesamtzahl).
 */
export async function getCommentCounts(
  userId: string | null,
  eventIds: string[],
  registeredEventIds: Set<string> = new Set(),
): Promise<Map<string, { total: number; unread: number }>> {
  const out = new Map<string, { total: number; unread: number }>();
  if (!eventIds.length) return out;
  const [rows, reads] = await Promise.all([
    prisma.eventComment.findMany({
      where: { eventId: { in: eventIds }, deletedAt: null },
      select: { eventId: true, userId: true, createdAt: true },
    }),
    userId
      ? prisma.eventCommentRead.findMany({ where: { userId, eventId: { in: eventIds } }, select: { eventId: true, lastReadAt: true } })
      : Promise.resolve([]),
  ]);
  const readAt = new Map(reads.map(r => [r.eventId, r.lastReadAt]));
  for (const r of rows) {
    const c = out.get(r.eventId) ?? { total: 0, unread: 0 };
    c.total++;
    if (userId && r.userId !== userId) {
      const last = readAt.get(r.eventId);
      if (last ? r.createdAt > last : registeredEventIds.has(r.eventId)) c.unread++;
    }
    out.set(r.eventId, c);
  }
  return out;
}

/** Setzt `comments` (gesamt/ungelesen) an fertigen Eventkarten — eine Abfrage für alle Karten. */
export async function attachCommentCounts<T extends { id: string; isRegistered: boolean; comments?: { total: number; unread: number } | null }>(
  cards: T[],
  userId: string | null | undefined,
): Promise<T[]> {
  if (!userId || !cards.length) return cards;
  const counts = await getCommentCounts(userId, cards.map(c => c.id), new Set(cards.filter(c => c.isRegistered).map(c => c.id)));
  for (const c of cards) c.comments = counts.get(c.id) ?? null;
  return cards;
}

export async function markEventCommentsRead(userId: string, eventId: string) {
  await Promise.all([
    prisma.eventCommentRead.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    }),
    // Zugehörige Benachrichtigungen sind damit erledigt — sonst zählt der Knopf dieselbe Nachricht doppelt
    prisma.inAppNotification.updateMany({
      where: { userId, type: "event_comment", read: false, url: eventCommentsUrl(eventId) },
      data: { read: true },
    }),
  ]);
}

// ── Schnellzugriff (Panel): Absprachen "meiner" Events ────────────────────────

const THREAD_LIMIT = 20;
const WROTE_WITHIN_MS = 14 * 24 * 60 * 60_000;

/**
 * Events, deren Absprachen für den User relevant sind: angemeldet (anstehend, laufend oder noch nicht
 * gesperrt) oder selbst kürzlich geschrieben. Sortierung: ungelesen → laufend → nach Start.
 */
export async function listEventThreads(userId: string): Promise<EventThreadDTO[]> {
  const since = new Date(Date.now() - WROTE_WITHIN_MS);
  const [regs, wrote] = await Promise.all([
    prisma.eventRegistration.findMany({
      where: { userId, event: { OR: [{ status: { not: "finished" } }, { startAt: { gt: since } }] } },
      select: { eventId: true, role: true },
    }),
    prisma.eventComment.findMany({
      where: { userId, createdAt: { gt: since } },
      distinct: ["eventId"],
      select: { eventId: true },
    }),
  ]);
  const roleBy = new Map(regs.map(r => [r.eventId, r.role]));
  const ids = [...new Set([...regs.map(r => r.eventId), ...wrote.map(w => w.eventId)])];
  if (!ids.length) return [];

  const events = await prisma.event.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, title: true, status: true, startAt: true, endAt: true, completionData: true, hidden: true,
      checkInEnabled: true,
      series: { select: { hidden: true, name: true } },
    },
  });
  const now = new Date();
  const visible = events.filter(ev => {
    if (isEventHidden(ev)) return false;
    const endedAt = new Date(Math.max(getEventEndedAt(ev).getTime(), ev.endAt?.getTime() ?? 0));
    const lockAt = commentLockAt({ status: ev.status, endedAt });
    return !lockAt || lockAt > now;
  });
  if (!visible.length) return [];
  const visibleIds = visible.map(e => e.id);

  const [counts, lastRows, pinnedRows] = await Promise.all([
    getCommentCounts(userId, visibleIds, new Set(visibleIds.filter(id => roleBy.has(id)))),
    prisma.eventComment.findMany({
      where: { eventId: { in: visibleIds }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      distinct: ["eventId"],
      select: { eventId: true, content: true, createdAt: true, user: { select: { username: true, name: true } } },
    }),
    prisma.eventComment.findMany({
      where: { eventId: { in: visibleIds }, deletedAt: null, pinned: true },
      orderBy: { pinnedAt: "desc" },
      distinct: ["eventId"],
      select: { eventId: true, content: true },
    }),
  ]);
  const lastBy = new Map(lastRows.map(r => [r.eventId, r]));
  const pinnedBy = new Map(pinnedRows.map(r => [r.eventId, r]));
  const statuses = await prisma.eventComment.findMany({
    where: { userId, eventId: { in: visibleIds }, kind: "status", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { eventId: true, status: true, lateMin: true },
  });
  const myStatusBy = new Map(statuses.map(s => [s.eventId, s]));

  const threads: EventThreadDTO[] = visible.map(ev => {
    const c = counts.get(ev.id) ?? { total: 0, unread: 0 };
    const last = lastBy.get(ev.id);
    const st = myStatusBy.get(ev.id);
    const role = roleBy.get(ev.id);
    const phase = threadPhase(ev, now);
    return {
      eventId: ev.id,
      title: ev.title,
      seriesName: ev.series?.name ?? null,
      startAt: ev.startAt.toISOString(),
      phase,
      total: c.total,
      unread: c.unread,
      last: last ? { author: displayName(last.user), text: plainCommentText(last.content), createdAt: last.createdAt.toISOString() } : null,
      pinned: pinnedBy.get(ev.id) ? plainCommentText(pinnedBy.get(ev.id)!.content) : null,
      registered: !!role,
      isPlayer: !!role && role !== "spectator",
      myStatus: st?.status ? { status: st.status as CommentStatus, lateMin: st.lateMin } : null,
      readyOpensAt: ev.checkInEnabled ? checkInOpensAt(ev).toISOString() : null,
    };
  });
  // Laufend → Abstimmung → anstehend → beendet
  const rank = (t: EventThreadDTO) => ({ live: 0, voting: 1, upcoming: 2, finished: 3 })[t.phase];
  threads.sort((a, b) =>
    (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0)
    || rank(a) - rank(b)
    || (a.phase === "finished"
      ? new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
      : new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
  return threads.slice(0, THREAD_LIMIT);
}

// ── Schreiben ─────────────────────────────────────────────────────────────────

function validateContent(raw: unknown): { content: string } | { error: string } {
  if (typeof raw !== "string") return { error: "Text fehlt" };
  const content = normalizeCommentInput(raw);
  const visible = plainCommentText(content);
  if (!visible.trim()) return { error: "Die Nachricht ist leer" };
  if (visible.length > COMMENT_MAX_LENGTH) return { error: `Höchstens ${COMMENT_MAX_LENGTH} Zeichen` };
  if (content.length > 1500) return { error: "Die Nachricht ist zu lang" };
  return { content };
}

async function rateLimited(userId: string, eventId: string) {
  const recent = await prisma.eventComment.findFirst({
    where: { userId, eventId, createdAt: { gt: new Date(Date.now() - COMMENT_RATE_LIMIT_MS) } },
    select: { id: true },
  });
  return !!recent;
}

export type CreatedComment = { id: string; eventId: string; authorId: string; kind: "text" | "status"; checkedIn?: boolean };

export async function createEventComment(viewer: CommentViewer, eventId: string, rawContent: unknown): Promise<Result<CreatedComment>> {
  const { ev, canView } = await access(viewer, eventId);
  if (!ev || !canView) return fail("Event nicht gefunden", 404);
  if (ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);
  const v = validateContent(rawContent);
  if ("error" in v) return fail(v.error);
  if (await rateLimited(viewer.id, eventId)) return fail("Bitte kurz warten, bevor du die nächste Nachricht schickst", 429);

  const c = await prisma.eventComment.create({ data: { eventId, userId: viewer.id, content: v.content }, select: { id: true } });
  return { ok: true, data: { id: c.id, eventId, authorId: viewer.id, kind: "text" } };
}

export async function createEventStatus(
  viewer: CommentViewer, eventId: string, rawStatus: unknown, rawLateMin: unknown,
): Promise<Result<CreatedComment>> {
  const { ev, canView } = await access(viewer, eventId);
  if (!ev || !canView) return fail("Event nicht gefunden", 404);
  if (ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);
  if (typeof rawStatus !== "string" || !COMMENT_STATUSES.includes(rawStatus as CommentStatus)) return fail("Unbekannter Status");
  const status = rawStatus as CommentStatus;
  const registration = await prisma.eventRegistration.findUnique({
    where: { userId_eventId: { userId: viewer.id, eventId } },
    select: { role: true, checkedInAt: true },
  });
  if (!registration) return fail("Status-Meldungen gibt es nur für Angemeldete", 403);
  if (!statusMessagesAllowed(ev.status)) return fail("Die Spielphase ist vorbei — Status-Meldungen gibt es nur davor", 400);
  // "Bin bereit" bei Events mit Check-in erst ab 30 Min. vor Start — sonst stünde man als bereit da,
  // ohne eingecheckt zu sein, und würde nicht ausgelost.
  if (status === "ready" && checkInState(ev, ev._count.matches > 0) === "not_yet_open") {
    const at = formatBerlinDateTime(checkInOpensAt(ev), { hour: "2-digit", minute: "2-digit" });
    return fail(`„Bin bereit“ geht erst ab ${at} Uhr (30 Min. vor Start)`);
  }
  if (await rateLimited(viewer.id, eventId)) return fail("Bitte kurz warten, bevor du die nächste Nachricht schickst", 429);

  const lateMin = status === "late" ? sanitizeLateMin(rawLateMin) : null;
  const c = await prisma.eventComment.create({
    data: { eventId, userId: viewer.id, kind: "status", status, lateMin, content: statusMessage(status, lateMin) },
    select: { id: true },
  });

  // "Bin bereit" = Check-in, wenn das Event einen hat und das Fenster offen ist (ein Weg statt zwei)
  let checkedIn = false;
  if (status === "ready" && registration.role !== "spectator" && !registration.checkedInAt
      && checkInState(ev, ev._count.matches > 0) === "open") {
    await prisma.eventRegistration.update({
      where: { userId_eventId: { userId: viewer.id, eventId } },
      data: { checkedInAt: new Date() },
    });
    checkedIn = true;
  }
  return { ok: true, data: { id: c.id, eventId, authorId: viewer.id, kind: "status", checkedIn } };
}

/**
 * "Bin bereit"-Knopf (Check-in) auf der Eventseite: hält den Absprachen-Status gleich.
 * ready = true → "bereit"-Status anlegen (falls nicht schon der letzte Status), false → zurücknehmen.
 */
export async function syncReadyStatus(userId: string, eventId: string, ready: boolean): Promise<void> {
  const last = await prisma.eventComment.findFirst({
    where: { userId, eventId, kind: "status", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (ready) {
    if (last?.status === "ready") return;
    await prisma.eventComment.create({ data: { eventId, userId, kind: "status", status: "ready", content: statusMessage("ready") } });
  } else if (last?.status === "ready") {
    await prisma.eventComment.update({ where: { id: last.id }, data: { deletedAt: new Date() } });
  }
}

export async function editEventComment(viewer: CommentViewer, commentId: string, rawContent: unknown): Promise<Result<{ id: string }>> {
  const c = await prisma.eventComment.findUnique({ where: { id: commentId }, select: { userId: true, eventId: true, kind: true, deletedAt: true, discordMessageId: true } });
  if (!c || c.deletedAt) return fail("Nachricht nicht gefunden", 404);
  if (c.userId !== viewer.id || c.kind !== "text") return fail("Du kannst nur eigene Nachrichten bearbeiten", 403);
  const ev = await loadEvent(c.eventId);
  if (!ev || ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);
  const v = validateContent(rawContent);
  if ("error" in v) return fail(v.error);
  await prisma.eventComment.update({ where: { id: commentId }, data: { content: v.content, editedAt: new Date() } });
  return { ok: true, data: { id: commentId } };
}

export async function deleteEventComment(viewer: CommentViewer, commentId: string): Promise<Result<{ id: string }>> {
  const c = await prisma.eventComment.findUnique({
    where: { id: commentId },
    select: { userId: true, eventId: true, deletedAt: true, discordChannelId: true, discordMessageId: true },
  });
  if (!c || c.deletedAt) return fail("Nachricht nicht gefunden", 404);
  const { ev, canManage } = await access(viewer, c.eventId);
  if (!ev) return fail("Event nicht gefunden", 404);
  if (c.userId !== viewer.id && !canManage) return fail("Keine Berechtigung", 403);
  if (ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);
  await prisma.eventComment.update({
    where: { id: commentId },
    data: { deletedAt: new Date(), pinned: false, pinnedAt: null, discordChannelId: null, discordMessageId: null },
  });
  if (c.discordChannelId && c.discordMessageId) await deleteDiscordMessage(c.discordChannelId, c.discordMessageId).catch(() => {});
  return { ok: true, data: { id: commentId } };
}

// ── Anpinnen + Discord-Spiegelung ─────────────────────────────────────────────

/**
 * Anpinnen/Lösen (Event-Verwalter: Mods/Admins, Ersteller, Squad-Captains). Angepinnte Nachrichten, die
 * ein Mod oder Admin geschrieben hat, werden in den Discord-Kanal des Events gespiegelt — und beim
 * Lösen/Löschen dort wieder entfernt.
 */
export async function setEventCommentPinned(viewer: CommentViewer, commentId: string, pinned: boolean): Promise<Result<{ id: string; mirrored: boolean }>> {
  const c = await prisma.eventComment.findUnique({
    where: { id: commentId },
    select: {
      eventId: true, deletedAt: true, content: true, pinned: true, discordChannelId: true, discordMessageId: true,
      user: { select: { role: true, username: true, name: true, image: true } },
    },
  });
  if (!c || c.deletedAt) return fail("Nachricht nicht gefunden", 404);
  const { ev, canManage } = await access(viewer, c.eventId);
  if (!ev) return fail("Event nicht gefunden", 404);
  if (!canManage) return fail("Nur Event-Verwalter können Nachrichten anpinnen", 403);
  if (ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);

  if (!pinned) {
    await prisma.eventComment.update({
      where: { id: commentId },
      data: { pinned: false, pinnedAt: null, discordChannelId: null, discordMessageId: null },
    });
    if (c.discordChannelId && c.discordMessageId) await deleteDiscordMessage(c.discordChannelId, c.discordMessageId).catch(() => {});
    return { ok: true, data: { id: commentId, mirrored: false } };
  }

  await prisma.eventComment.update({ where: { id: commentId }, data: { pinned: true, pinnedAt: new Date() } });
  let mirrored = !!c.discordMessageId;
  if (!mirrored && hasMinRole(c.user.role, "moderator") && !ev.hiddenForUsers) {
    mirrored = await mirrorPinnedToDiscord(ev, commentId, c.content, c.user);
  }
  return { ok: true, data: { id: commentId, mirrored } };
}

async function mirrorPinnedToDiscord(
  ev: LoadedEvent, commentId: string, content: string, author: { username: string | null; name: string | null; image: string | null },
): Promise<boolean> {
  // Nur in einen eigenen Kanal des Events bzw. der Reihe — ohne Kanal wird nichts gespiegelt
  // (bewusst kein Rückfall auf den allgemeinen News-Kanal).
  const channelId = resolveEventChannelId(ev);
  if (!channelId || !process.env.DISCORD_BOT_TOKEN) return false;
  const base = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
  try {
    const messageId = await sendDiscordMessage(channelId, {
      title: `📌 ${ev.title}`,
      description: plainCommentText(content).slice(0, 4000),
      url: `${base}/tournament/${ev.id}#absprachen`,
      color: DISCORD_COLORS.default,
      footer: { text: `Angepinnt von ${displayName(author)} · OMA Companion` },
    });
    if (!messageId) return false;
    await prisma.eventComment.update({ where: { id: commentId }, data: { discordChannelId: channelId, discordMessageId: messageId } });
    return true;
  } catch (e) {
    console.error("[event-comments] Discord-Spiegelung fehlgeschlagen:", e);
    return false;
  }
}

// ── Reaktionen ────────────────────────────────────────────────────────────────

export async function toggleEventCommentReaction(viewer: CommentViewer, commentId: string, emoji: unknown): Promise<Result<{ active: boolean }>> {
  if (typeof emoji !== "string" || !(REACTION_EMOJIS as readonly string[]).includes(emoji)) return fail("Unbekannte Reaktion");
  const c = await prisma.eventComment.findUnique({ where: { id: commentId }, select: { eventId: true, deletedAt: true } });
  if (!c || c.deletedAt) return fail("Nachricht nicht gefunden", 404);
  const { ev, canView } = await access(viewer, c.eventId);
  if (!ev || !canView) return fail("Nachricht nicht gefunden", 404);
  if (ev.locked) return fail("Die Absprachen zu diesem Event sind geschlossen", 403);

  const key = { commentId_userId_emoji: { commentId, userId: viewer.id, emoji } };
  const existing = await prisma.eventCommentReaction.findUnique({ where: key, select: { id: true } });
  if (existing) {
    await prisma.eventCommentReaction.delete({ where: { id: existing.id } });
    return { ok: true, data: { active: false } };
  }
  await prisma.eventCommentReaction.create({ data: { commentId, userId: viewer.id, emoji } }).catch(() => {});
  return { ok: true, data: { active: true } };
}

// ── Benachrichtigungen ────────────────────────────────────────────────────────

async function filterByPref(userIds: string[]): Promise<string[]> {
  if (!userIds.length) return [];
  const users = await prisma.user.findMany({ where: { id: { in: userIds }, deletedAt: null }, select: { id: true, notificationPrefs: true } });
  const key = PREF_KEY.event_comment;
  return users.filter(u => {
    try { return JSON.parse(u.notificationPrefs || "{}")[key] !== false; } catch { return true; }
  }).map(u => u.id);
}

async function notifyUser(userId: string, title: string, body: string, url: string) {
  await Promise.allSettled([
    createNotification(userId, { type: "event_comment", title, body, url }),
    sendPushToUsers([userId], { title, body, url }),
  ]);
}

const snippet = (text: string, max = 120) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Nach einer neuen Nachricht (läuft per after() nach der Antwort):
 *  - Erwähnte: sofort (wenn sie das Event sehen dürfen)
 *  - "komme später"/"kann nicht": sofort an die Event-Ersteller (ohne Ersteller: Mods/Admins)
 *  - alle anderen Beteiligten (Angemeldete, Streamer, Ersteller, bisherige Schreiber): gebündelt
 */
export async function notifyNewEventComment(created: CreatedComment): Promise<void> {
  const [ev, comment] = await Promise.all([
    loadEvent(created.eventId),
    prisma.eventComment.findUnique({
      where: { id: created.id },
      select: { content: true, status: true, user: { select: { username: true, name: true } } },
    }),
  ]);
  if (!ev || !comment || ev.hiddenForUsers) return;

  const author = displayName(comment.user);
  const text = plainCommentText(comment.content);
  const url = eventCommentsUrl(ev.id);
  const notified = new Set<string>([created.authorId]);

  // 1) Erwähnungen
  if (created.kind === "text") {
    const mentioned = (await filterByPref(extractMentionedUserIds(comment.content))).filter(id => !notified.has(id));
    for (const id of mentioned) {
      notified.add(id);
      await notifyUser(id, `💬 ${author} hat dich erwähnt`, `${ev.title}: ${snippet(text)}`, url);
    }
  }

  // 2) Dringende Status-Meldungen an die Verantwortlichen
  if (created.kind === "status" && (comment.status === "late" || comment.status === "absent")) {
    let managers = [ev.createdById, ev.series?.createdById].filter((x): x is string => !!x);
    if (!managers.length) {
      managers = (await prisma.user.findMany({ where: { role: { in: ["moderator", "admin"] }, deletedAt: null }, select: { id: true } })).map(u => u.id);
    }
    for (const id of (await filterByPref(managers)).filter(id => !notified.has(id))) {
      notified.add(id);
      await notifyUser(id, `${comment.status === "late" ? "⏰" : "❌"} ${ev.title}`, `${author}: ${snippet(text)}`, url);
    }
  }

  // 3) Gebündelt an alle Beteiligten
  const [regs, streamers, writers] = await Promise.all([
    prisma.eventRegistration.findMany({ where: { eventId: ev.id }, select: { userId: true } }),
    prisma.eventCommunityStreamer.findMany({ where: { eventId: ev.id }, select: { userId: true } }),
    prisma.eventComment.findMany({ where: { eventId: ev.id, deletedAt: null }, distinct: ["userId"], select: { userId: true } }),
  ]);
  const audience = [...new Set([
    ...regs.map(r => r.userId), ...streamers.map(s => s.userId), ...writers.map(w => w.userId),
    ev.createdById, ev.series?.createdById,
  ].filter((x): x is string => !!x && !notified.has(x)))];
  const eligible = await filterByPref(audience);
  if (!eligible.length) return;

  const reads = await prisma.eventCommentRead.findMany({
    where: { eventId: ev.id, userId: { in: eligible } },
    select: { userId: true, lastReadAt: true, lastNotifiedAt: true },
  });
  const readBy = new Map(reads.map(r => [r.userId, r]));
  const now = new Date();
  for (const userId of eligible) {
    const read = readBy.get(userId) ?? null;
    if (!shouldNotifyBundled(read, now)) continue;
    const unread = await prisma.eventComment.count({
      where: { eventId: ev.id, deletedAt: null, userId: { not: userId }, ...(read ? { createdAt: { gt: read.lastReadAt } } : {}) },
    });
    const body = unread > 1 ? `${unread} neue Nachrichten · zuletzt ${author}: ${snippet(text, 90)}` : `${author}: ${snippet(text)}`;
    await notifyUser(userId, `💬 ${ev.title}`, body, url);
    await prisma.eventCommentRead.upsert({
      where: { userId_eventId: { userId, eventId: ev.id } },
      // Ohne bisherigen Lesestand: lastReadAt in die Vergangenheit, damit die Karte "neu" zeigt
      create: { userId, eventId: ev.id, lastReadAt: new Date(0), lastNotifiedAt: now },
      update: { lastNotifiedAt: now },
    });
  }
}

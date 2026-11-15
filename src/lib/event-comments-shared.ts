// Event-Absprachen — reine Regeln und Typen (client- und serverseitig nutzbar).
// Server-Logik (DB, Rechte, Benachrichtigungen, Discord): src/lib/event-comments.ts

const MENTION_RE = /\[@([^\]\n]{1,60})\]\(user:([A-Za-z0-9_-]{10,40})\)/g;

/** Sichtbare Länge (Erwähnungen zählen als "@Name", nicht als ganzes Token). */
export const COMMENT_MAX_LENGTH = 500;

/** Feste Reaktionen — erspart "ok"-Antworten. */
export const REACTION_EMOJIS = ["👍", "✅", "😂", "❤️", "🔥"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const LATE_OPTIONS = [5, 15, 30] as const;

export type CommentStatus = "late" | "absent" | "ready";
export const COMMENT_STATUSES: CommentStatus[] = ["late", "absent", "ready"];

/** Mindestabstand zwischen zwei Nachrichten desselben Users im selben Event. */
export const COMMENT_RATE_LIMIT_MS = 5_000;
/** Höchstens eine gebündelte Benachrichtigung pro User und Event in diesem Zeitraum. */
export const NOTIFY_BUNDLE_MS = 30 * 60_000;
/** So lange nach Eventende darf noch geschrieben werden, danach nur noch lesen. */
export const COMMENT_LOCK_AFTER_END_MS = 48 * 60 * 60_000;

export type CommentReactionDTO = { emoji: string; count: number; mine: boolean; users: string[] };

export type EventCommentDTO = {
  id: string;
  user: { id: string; name: string; image: string | null };
  content: string;
  kind: "text" | "status";
  status: CommentStatus | null;
  lateMin: number | null;
  pinned: boolean;
  /** Angepinnt und nach Discord gespiegelt */
  mirrored: boolean;
  edited: boolean;
  createdAt: string;
  reactions: CommentReactionDTO[];
  canEdit: boolean;
  canDelete: boolean;
};

export type EventCommentsResponse = {
  comments: EventCommentDTO[];
  locked: boolean;
  canWrite: boolean;
  canPin: boolean;
  /** Darf Status-Meldungen abgeben (nur Angemeldete: Spieler oder Zuschauer) */
  canSetStatus: boolean;
  myStatus: { status: CommentStatus; lateMin: number | null } | null;
};

/** Text mit Erwähnungen als "@Name" — für Längenprüfung, Benachrichtigungen und Discord. */
export function plainCommentText(content: string): string {
  return content.replace(MENTION_RE, (_, name: string) => `@${name}`);
}

export type CommentSegment =
  | { type: "text"; text: string }
  | { type: "mention"; name: string; userId: string }
  | { type: "link"; href: string };

const LINK_RE = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g;

/** Zerlegt einen Kommentar in Text, Erwähnungen und Links (für die Anzeige, ohne Markdown/HTML). */
export function parseCommentSegments(content: string): CommentSegment[] {
  const out: CommentSegment[] = [];
  const pushText = (text: string) => {
    let last = 0;
    for (const m of text.matchAll(LINK_RE)) {
      if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
      out.push({ type: "link", href: m[0] });
      last = m.index! + m[0].length;
    }
    if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  };
  let last = 0;
  for (const m of content.matchAll(MENTION_RE)) {
    if (m.index! > last) pushText(content.slice(last, m.index));
    out.push({ type: "mention", name: m[1], userId: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < content.length) pushText(content.slice(last));
  return out;
}

/** Bereinigt Eingaben: Zeilenumbrüche normalisieren, max. 2 Leerzeilen, trimmen. */
export function normalizeCommentInput(raw: string): string {
  return raw.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeLateMin(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(n, 240);
}

/** Text der automatisch erzeugten Status-Nachricht. */
export function statusMessage(status: CommentStatus, lateMin?: number | null): string {
  switch (status) {
    case "late":   return `⏰ Komme etwa ${lateMin ?? 15} Minuten später`;
    case "absent": return "❌ Kann doch nicht dabei sein";
    case "ready":  return "✅ Bin bereit";
  }
}

/** Kurzlabel für die Teilnehmerliste. */
export function statusBadge(status: CommentStatus, lateMin?: number | null): { label: string; className: string } {
  switch (status) {
    case "late":   return { label: `⏰ +${lateMin ?? 15} min`, className: "text-amber-300 bg-amber-500/10" };
    case "absent": return { label: "❌ kommt nicht", className: "text-rose-300 bg-rose-500/10" };
    case "ready":  return { label: "✓ bereit", className: "text-emerald-300 bg-emerald-500/10" };
  }
}

/** Ab wann ist der Verlauf schreibgeschützt? null = (noch) offen. */
export function commentLockAt(ev: { status: string; endedAt: Date }): Date | null {
  if (ev.status !== "finished") return null;
  return new Date(ev.endedAt.getTime() + COMMENT_LOCK_AFTER_END_MS);
}

/** Wer in diesem Zeitraum gelesen hat, hat die Absprachen gerade offen — kein Push nötig. */
export const ACTIVE_READER_MS = 2 * 60_000;

/**
 * Soll ein Empfänger jetzt eine gebündelte Benachrichtigung bekommen?
 * Nein, wenn er die Absprachen gerade offen hat oder in den letzten 30 min schon eine bekam.
 */
export function shouldNotifyBundled(
  read: { lastReadAt: Date | null; lastNotifiedAt: Date | null } | null,
  now: Date = new Date(),
): boolean {
  if (read?.lastReadAt && now.getTime() - read.lastReadAt.getTime() < ACTIVE_READER_MS) return false;
  if (!read?.lastNotifiedAt) return true;
  return now.getTime() - read.lastNotifiedAt.getTime() >= NOTIFY_BUNDLE_MS;
}

/**
 * Auswertung von Twitch-Chat-Zeilen (IRC mit Tags) für den gemeinsamen Chat in /zusammen. Ohne
 * React/Browser-APIs, damit testbar. Verbindung und Zustand: components/watch/useMultiChat.ts.
 */

/** Kanal-Farben im gemeinsamen Chat (Zuschauer-Seite und OBS-Chat-Quelle) — Reihenfolge der Kanäle. */
export const CHANNEL_COLORS = ["#2dd4bf", "#a78bfa", "#fbbf24", "#f472b6"];

export type IrcLine ={ tags: Record<string, string>; prefix: string | null; command: string; params: string[] };

/** Werte in IRC-Tags sind maskiert (\s = Leerzeichen, \: = Semikolon …). */
function unescapeTag(v: string): string {
  return v.replace(/\\(.)/g, (_, c: string) => (c === "s" ? " " : c === ":" ? ";" : c === "r" ? "\r" : c === "n" ? "\n" : c));
}

export function parseIrcLine(line: string): IrcLine | null {
  let rest = line.replace(/\r?\n$/, "");
  if (!rest) return null;
  const tags: Record<string, string> = {};
  if (rest.startsWith("@")) {
    const end = rest.indexOf(" ");
    for (const pair of rest.slice(1, end).split(";")) {
      const eq = pair.indexOf("=");
      if (eq === -1) tags[pair] = "";
      else tags[pair.slice(0, eq)] = unescapeTag(pair.slice(eq + 1));
    }
    rest = rest.slice(end + 1);
  }
  let prefix: string | null = null;
  if (rest.startsWith(":")) {
    const end = rest.indexOf(" ");
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1);
  }
  const trailingAt = rest.indexOf(" :");
  const head = trailingAt === -1 ? rest : rest.slice(0, trailingAt);
  const params = head.split(" ").filter(Boolean);
  const command = params.shift() ?? "";
  if (trailingAt !== -1) params.push(rest.slice(trailingAt + 2));
  return { tags, prefix, command, params };
}

export type ChatPart = { type: "text"; text: string } | { type: "emote"; id: string; name: string };

/**
 * Zerlegt den Text anhand des emotes-Tags ("25:0-4,12-16/1902:6-10"). Die Positionen zählen
 * Unicode-Zeichen, nicht UTF-16-Einheiten — deshalb über Array.from statt String-Indizes.
 */
export function splitEmotes(text: string, emotesTag: string | undefined): ChatPart[] {
  const chars = Array.from(text);
  const ranges: { start: number; end: number; id: string }[] = [];
  for (const spec of (emotesTag ?? "").split("/").filter(Boolean)) {
    const [id, positions] = spec.split(":");
    for (const pos of (positions ?? "").split(",")) {
      const [s, e] = pos.split("-").map(Number);
      if (Number.isInteger(s) && Number.isInteger(e) && s <= e && e < chars.length) ranges.push({ start: s, end: e, id });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: ChatPart[] = [];
  let i = 0;
  for (const r of ranges) {
    if (r.start < i) continue; // überlappende Angaben ignorieren
    if (r.start > i) parts.push({ type: "text", text: chars.slice(i, r.start).join("") });
    parts.push({ type: "emote", id: r.id, name: chars.slice(r.start, r.end + 1).join("") });
    i = r.end + 1;
  }
  if (i < chars.length) parts.push({ type: "text", text: chars.slice(i).join("") });
  return parts;
}

export type ChatMessage = {
  id: string;
  /** Kanal, in dem die Nachricht ankam (ohne #, klein). */
  channel: string;
  user: string;
  userLogin: string;
  color: string | null;
  parts: ChatPart[];
  /** Twitch Shared Chat: ID der Ursprungsnachricht — dieselbe Nachricht kommt in mehreren Kanälen an. */
  sourceId: string | null;
  action: boolean;
};

export function toChatMessage(line: IrcLine): ChatMessage | null {
  if (line.command !== "PRIVMSG" || line.params.length < 2) return null;
  const channel = line.params[0].replace(/^#/, "").toLowerCase();
  let text = line.params[1];
  // /me-Nachrichten kommen als CTCP ACTION
  const action = text.startsWith("\u0001ACTION ") && text.endsWith("\u0001");
  if (action) text = text.slice(8, -1);
  const login = (line.prefix ?? "").split("!")[0];
  return {
    id: line.tags["id"] || `${channel}:${login}:${text}`,
    channel,
    user: line.tags["display-name"] || login,
    userLogin: login.toLowerCase(),
    color: line.tags["color"] || null,
    parts: splitEmotes(text, line.tags["emotes"]),
    sourceId: line.tags["source-id"] || null,
    action,
  };
}

/** Moderation: einzelne Nachricht gelöscht (CLEARMSG) oder Nutzer/ganzer Chat geleert (CLEARCHAT). */
export type ChatRemoval =
  | { kind: "message"; channel: string; messageId: string }
  | { kind: "user"; channel: string; userLogin: string }
  | { kind: "channel"; channel: string };

export function toRemoval(line: IrcLine): ChatRemoval | null {
  const channel = (line.params[0] ?? "").replace(/^#/, "").toLowerCase();
  if (line.command === "CLEARMSG" && line.tags["target-msg-id"]) return { kind: "message", channel, messageId: line.tags["target-msg-id"] };
  if (line.command === "CLEARCHAT") {
    return line.params[1] ? { kind: "user", channel, userLogin: line.params[1].toLowerCase() } : { kind: "channel", channel };
  }
  return null;
}

/** Wendet eine Löschung auf die Nachrichtenliste an. */
export function applyRemoval(messages: ChatMessage[], r: ChatRemoval): ChatMessage[] {
  return messages.filter(m => {
    if (m.channel !== r.channel && !(r.kind === "message" && m.id === r.messageId)) return true;
    if (r.kind === "message") return m.id !== r.messageId;
    if (r.kind === "user") return m.userLogin !== r.userLogin;
    return false;
  });
}

/** Neue Nachricht anhängen — Shared-Chat-Doppelte (gleiche sourceId bzw. id) nur einmal, Liste begrenzt. */
export function appendMessage(messages: ChatMessage[], m: ChatMessage, limit = 200): ChatMessage[] {
  const key = m.sourceId ?? m.id;
  if (messages.some(x => (x.sourceId ?? x.id) === key)) return messages;
  const next = [...messages, m];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

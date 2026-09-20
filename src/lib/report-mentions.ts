/** @-Erwähnungen in Berichten (client-sicher): Format `[@Name](user:<userId>)` — sieht in fremdem Markdown wie ein normaler Link aus. */

const MENTION_SOURCE = "\\[@([^\\]\\n]{1,60})\\]\\(user:([A-Za-z0-9_-]{10,40})\\)";

export function mentionToken(name: string, userId: string): string {
  return `[@${name.replace(/[\[\]\n]/g, "").slice(0, 60)}](user:${userId})`;
}

export function extractMentionedUserIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const m of markdown.matchAll(new RegExp(MENTION_SOURCE, "g"))) ids.add(m[2]);
  return [...ids];
}

/** Für MarkdownLite: erkennt einen kompletten Link-Token mit `user:`-Ziel. */
export function parseMentionHref(href: string): string | null {
  const m = href.match(/^user:([A-Za-z0-9_-]{10,40})$/);
  return m ? m[1] : null;
}

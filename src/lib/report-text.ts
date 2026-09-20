import { CUSTOM_EMOJI_PATTERN } from "./discord-emoji";

/** Kleine Text-Helfer für Berichte (client-sicher). */

/** Markdown grob zu Klartext: Bilder/Formatierung/Überschriften raus, Links behalten nur ihren Text. */
export function markdownToPlain(md: string): string {
  // Discord-Server-Emojis (<:name:id>) enthalten Unterstriche/Doppelpunkte — vor dem Entfernen der
  // Formatierung durch Platzhalter schützen und danach zurücksetzen.
  const emojis: string[] = [];
  const protectedMd = md.replace(new RegExp(CUSTOM_EMOJI_PATTERN, "g"), m => { emojis.push(m); return `\u0001${emojis.length - 1}\u0002`; });
  return protectedMd
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\u0001(\d+)\u0002/g, (_, i) => emojis[Number(i)] ?? "");
}

/** Kurzer Auszug für Vorschau-Karten (Board, Discord). */
export function plainExcerpt(md: string, maxChars = 280): string {
  const plain = markdownToPlain(md);
  if (plain.length <= maxChars) return plain;
  let cut = plain.slice(0, maxChars).replace(/\s+\S*$/, "");
  // Nicht mitten in einem Emoji-Token abschneiden.
  const open = cut.lastIndexOf("<");
  if (open > cut.lastIndexOf(">")) cut = cut.slice(0, open).trimEnd();
  return `${cut}…`;
}

export function wordCount(md: string): number {
  const plain = markdownToPlain(md);
  return plain ? plain.split(" ").length : 0;
}

/** Lesezeit in Minuten (200 Wörter/Minute), mindestens 1. */
export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(wordCount(md) / 200));
}

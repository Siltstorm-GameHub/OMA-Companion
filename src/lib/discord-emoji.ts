/** Discord-Server-Emojis in Texten (client-sicher): Token-Format wie in Discord selbst, `<:name:id>` bzw. `<a:name:id>` für animierte. */

export const CUSTOM_EMOJI_PATTERN = "<a?:\\w{2,32}:\\d{17,20}>";
const CUSTOM_EMOJI_EXACT = /^<(a?):(\w{2,32}):(\d{17,20})>$/;

export interface CustomEmoji { id: string; name: string; animated: boolean }

export function customEmojiToken(e: CustomEmoji): string {
  return `<${e.animated ? "a" : ""}:${e.name}:${e.id}>`;
}

export function parseCustomEmojiToken(token: string): CustomEmoji | null {
  const m = token.match(CUSTOM_EMOJI_EXACT);
  return m ? { animated: m[1] === "a", name: m[2], id: m[3] } : null;
}

export function customEmojiUrl(e: Pick<CustomEmoji, "id" | "animated">, size = 48): string {
  return `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}?size=${size}`;
}

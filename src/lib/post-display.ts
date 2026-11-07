import { plainExcerpt } from "./report-text";

/**
 * Anzeige-Hilfen für Beiträge (client-sicher, kein Prisma). Seit der Zusammenlegung von Bericht,
 * Fotos/Clips und Werbe-Post ist der Titel optional — reine Foto- oder Werbe-Beiträge haben oft keinen.
 */

export const POST_MEDIA_MAX = 20;

/** Erlaubte Medien-URLs: eigene Uploads/Studio-Exporte im Vercel-Blob-Store (Bilder und Clips). */
export function isAllowedMediaUrl(url: unknown): url is string {
  return typeof url === "string" && url.length <= 600 && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url);
}

/** Titel für Listen, Benachrichtigungen und Discord: eigener Titel, sonst Textanfang, sonst "Fotos & Clips". */
export function postDisplayTitle(p: { title?: string | null; bodyMarkdown?: string | null; excerpt?: string | null; mediaCount?: number }): string {
  if (p.title?.trim()) return p.title.trim();
  const text = p.excerpt ?? (p.bodyMarkdown ? plainExcerpt(p.bodyMarkdown, 80) : "");
  if (text.trim()) {
    const firstLine = text.trim().split("\n")[0];
    return firstLine.length > 80 ? `${firstLine.slice(0, 79).trimEnd()}…` : firstLine;
  }
  return (p.mediaCount ?? 0) > 1 ? "Fotos & Clips" : "Foto/Clip";
}

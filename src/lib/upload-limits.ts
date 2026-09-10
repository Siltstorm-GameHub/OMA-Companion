/**
 * Klein und ohne Server-Abhängigkeiten (kein prisma-Import) — dieses Modul
 * wird sowohl von Server-Routen als auch von Client-Komponenten importiert.
 */

/** Obergrenze für Fotograf-Video-Clips (Direct-to-Blob-Upload, siehe /api/community-jobs/media/clip-upload). */
export const CLIP_MAX_BYTES = 25_000_000;
export const CLIP_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const CLIP_EXTENSION_BY_MIME: Record<(typeof CLIP_ALLOWED_TYPES)[number], string> = {
  "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov",
};

/** Erkennt Video-Assets rein an der Dateiendung — reicht, weil clip-upload/route.ts die Endung selbst vergibt. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

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

/** Blob-Pfad-Präfix für Clip-Uploads — auch für den Cleanup-Cronjob (community-job-clip-cleanup). */
export const CLIP_UPLOAD_PREFIX = "community-job-clip/";

/**
 * Wie lange ein hochgeladener Clip ohne zugehörigen JobMediaAsset-Datensatz
 * (Upload abgebrochen, Fehler nach dem Hochladen o.ä.) liegen bleibt, bevor
 * der Cronjob ihn löscht. Bewusst großzügig gewählt (3 Monate) — das Feature
 * wird aktuell kaum genutzt, ein knapperes Fenster lohnt sich erst, wenn
 * mehr hochgeladen wird und verwaiste Uploads schneller Speicher kosten.
 */
export const CLIP_ORPHAN_MAX_AGE_DAYS = 90;

/** Erkennt Video-Assets rein an der Dateiendung — reicht, weil clip-upload/route.ts die Endung selbst vergibt. */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

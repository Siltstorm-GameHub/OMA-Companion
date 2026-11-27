/**
 * OMA Hub → Downloads: gemeinsame Konstanten für Server-Routen UND Client-Komponenten
 * (darum ohne prisma-Import).
 *
 * Dateien gehen per Direct-to-Blob-Upload vom Browser direkt zu Vercel Blob
 * (/api/admin/hub-downloads/upload liefert nur das Token) — Setup-Dateien sind oft
 * deutlich größer als das Body-Limit von Vercel Functions.
 */

export const HUB_DOWNLOAD_CATEGORIES = [
  { key: "wallpaper", label: "Hintergrundbilder", singular: "Hintergrundbild" },
  { key: "setup", label: "Setup-Dateien", singular: "Setup-Datei" },
  { key: "other", label: "Sonstiges", singular: "Datei" },
] as const;

export type HubDownloadCategory = (typeof HUB_DOWNLOAD_CATEGORIES)[number]["key"];

export function isHubDownloadCategory(v: unknown): v is HubDownloadCategory {
  return HUB_DOWNLOAD_CATEGORIES.some((c) => c.key === v);
}

/** Blob-Ordner — der Upload-Token wird nur für Pfade darunter ausgestellt. */
export const HUB_DOWNLOAD_PREFIX = "hub-downloads/";

/** Obergrenze je Datei. Achtung: der Blob-Speicher des Vercel-Plans ist insgesamt begrenzt. */
export const HUB_DOWNLOAD_MAX_BYTES = 500 * 1024 * 1024;

/**
 * Erlaubte MIME-Typen. Browser melden für .exe/.msi/.7z je nach System unterschiedliche
 * (oder gar keine) Typen — der Client fällt dann auf application/octet-stream zurück,
 * darum steht der hier mit drin. Hochladen dürfen ohnehin nur Moderatoren/Admins.
 */
export const HUB_DOWNLOAD_ALLOWED_TYPES = [
  "image/*",
  "video/*",
  "audio/*",
  "font/*",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-msdownload",
  "application/x-msi",
  "application/x-ms-installer",
  "application/vnd.microsoft.portable-executable",
  "application/x-apple-diskimage",
  "application/vnd.android.package-archive",
  "application/json",
  "text/plain",
  "application/octet-stream",
];

/** Dateiname für den Blob-Pfad: nur harmlose Zeichen, Endung bleibt erhalten. */
export function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  return (cleaned || "datei").slice(0, 120);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toLocaleString("de-DE", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export type HubDownloadDTO = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  published: boolean;
  sortOrder: number;
  downloadCount: number;
  createdAt: string;
};

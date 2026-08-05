/** Bild-Registry für Abzeichen.
 *
 *  Zweck: eigene Grafiken einhängen, ohne Aufrufstellen anzufassen. Die
 *  Abzeichen werden an sieben Stellen gerendert (Profil, Rückblick, Admin);
 *  ohne diese Schicht müsste jede davon angepasst werden, sobald ein Motiv
 *  dazukommt.
 *
 *  Eigenes Bild einhängen — zwei Schritte, kein Code:
 *    1. Datei nach public/badges/ legen, z.B. public/badges/welcome.png
 *    2. Hier eine Zeile ergänzen:  welcome: "/badges/welcome.png"
 *
 *  Alles ohne Eintrag fällt automatisch auf das Emoji aus badges.ts bzw.
 *  CustomBadge.icon zurück. Die Registry darf also jederzeit lückenhaft sein —
 *  ein halb bebildertes Set sieht gemischt aus, aber nichts geht kaputt.
 *
 *  Empfohlene Bildgrösse: 128×128 px, PNG oder WebP mit Transparenz. Grösser
 *  bringt nichts, die grösste Darstellung im UI ist ~40 px (2x = 80 px).
 */

/** System-Abzeichen: Schlüssel ist die `id` aus BADGE_DEFS in lib/badges.ts. */
const SYSTEM_BADGE_ART: Record<string, string> = {
  // Beispiel — auskommentiert lassen, bis die Datei wirklich existiert,
  // sonst rendert ein kaputtes Bild statt des Emoji-Fallbacks:
  // welcome: "/badges/welcome.png",
};

/** Admin-erstellte Abzeichen: Schlüssel ist die CustomBadge-ID aus der DB.
 *  Custom-Abzeichen bekommen ihr Bild langfristig besser über ein imageUrl-Feld
 *  am Modell (siehe B7) — diese Map ist die Übergangslösung, solange das Feld
 *  noch nicht existiert. */
const CUSTOM_BADGE_ART: Record<string, string> = {};

/** Liefert den Bildpfad zu einem Abzeichen, oder null für den Emoji-Fallback.
 *  `key` ist die System-ID ("welcome") oder eine Custom-ID mit Präfix
 *  ("custom:clx123…") — genau das Format, das BadgesSection bereits benutzt. */
export function badgeArt(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("custom:")) {
    return CUSTOM_BADGE_ART[key.slice("custom:".length)] ?? null;
  }
  return SYSTEM_BADGE_ART[key] ?? null;
}

/** Erkennt, ob ein icon-Wert bereits ein Bild statt eines Emoji ist. Damit
 *  funktionieren Abzeichen, deren icon-Feld in der DB direkt auf eine URL
 *  gesetzt wurde, ohne Registry-Eintrag. */
export function isImageIcon(icon: string | null | undefined): boolean {
  if (!icon) return false;
  return icon.startsWith("/") || icon.startsWith("http://") || icon.startsWith("https://");
}

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

/** System-Abzeichen: Schlüssel ist die `id` aus BADGE_DEFS in lib/badges.ts.
 *
 *  Vollständig — alle 21 Abzeichen haben eine eigene Grafik. Erzeugt aus neun
 *  Rohmotiven, die sich die Stufen einer Familie teilen; unterschieden wird über
 *  die Ringfarbe (Bronze → Silber → Gold → Crimson). Erzeugt und gepflegt von
 *  scripts/process-badge-art.ts — die Zuordnung Abzeichen → Motiv/Stufe steht
 *  dort in der BADGES-Tabelle und ist die Quelle der Wahrheit. */
const SYSTEM_BADGE_ART: Record<string, string> = {
  welcome:     "/badges/welcome.png",

  voice_1h:    "/badges/voice_1h.png",
  voice_10h:   "/badges/voice_10h.png",
  voice_50h:   "/badges/voice_50h.png",

  msg_50:      "/badges/msg_50.png",
  msg_500:     "/badges/msg_500.png",

  event_1:     "/badges/event_1.png",
  event_5:     "/badges/event_5.png",
  event_10:    "/badges/event_10.png",
  event_25:    "/badges/event_25.png",

  event_win_1: "/badges/event_win_1.png",
  event_win_5: "/badges/event_win_5.png",

  mvp_1:       "/badges/mvp_1.png",
  mvp_3:       "/badges/mvp_3.png",

  t_1:         "/badges/t_1.png",
  t_win:       "/badges/t_win.png",
  t_win_5:     "/badges/t_win_5.png",

  pts_500:     "/badges/pts_500.png",
  pts_2k:      "/badges/pts_2k.png",
  pts_5k:      "/badges/pts_5k.png",
  pts_10k:     "/badges/pts_10k.png",
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

/**
 * Vorlagen-Cover für Events und Eventreihen ohne eigenes Bild bzw. ohne
 * passendes Spiel-Cover. Die Dateien liegen unter public/event-covers/:
 *   - logo-*.jpg  → scripts/generate-logo-covers.mjs (OBS-Pausen-Motive + OMA-Logo)
 *   - *.svg       → scripts/generate-event-covers.mjs (gezeichnete Themen-Motive)
 *
 * Gespeichert wird der relative Pfad (z.B. "/event-covers/turnier.svg") direkt
 * in coverImageUrl — die Web-Ansicht lädt ihn wie jede andere URL, das
 * Discord-Rendering (branded-cover.ts) liest ihn direkt von der Platte.
 */
export interface EventCoverPreset {
  id: string;
  label: string;
  url: string;
}

const LOGO_PRESETS: EventCoverPreset[] = [
  { id: "logo-esports",    label: "OMA Arena" },
  { id: "logo-hexagon",    label: "OMA Hex-Arena" },
  { id: "logo-lounge",     label: "OMA Lounge" },
  { id: "logo-neonstreet", label: "OMA Neon-Straße" },
  { id: "logo-synthwave",  label: "OMA Synthwave" },
  { id: "logo-racing",     label: "OMA Rennstrecke" },
  { id: "logo-space",      label: "OMA Raumstation" },
  { id: "logo-station",    label: "OMA Sternennacht" },
  { id: "logo-castle",     label: "OMA Fantasy" },
  { id: "logo-cozy",       label: "OMA Gemütlich" },
].map((p) => ({ ...p, url: `/event-covers/${p.id}.jpg` }));

const MOTIF_PRESETS: EventCoverPreset[] = [
  { id: "turnier",   label: "Turnier" },
  { id: "community", label: "Community-Abend" },
  { id: "koop",      label: "Koop & Raid" },
  { id: "quiz",      label: "Quiz & Party" },
  { id: "racing",    label: "Racing" },
  { id: "shooter",   label: "Action & Shooter" },
  { id: "retro",     label: "Retro & Arcade" },
  { id: "strategie", label: "Strategie" },
  { id: "sport",     label: "Sport" },
  { id: "allround",  label: "Allround" },
].map((p) => ({ ...p, url: `/event-covers/${p.id}.svg` }));

export const EVENT_COVER_PRESETS: EventCoverPreset[] = [...LOGO_PRESETS, ...MOTIF_PRESETS];

/** Cover, die das OMA-Logo schon groß im Bild tragen — dort kein zusätzliches Logo-Badge einblenden. */
export function coverHasOwnLogo(url: string | null | undefined): boolean {
  return !!url && url.startsWith("/event-covers/logo-");
}

/** Cover-URL aus einem Erstell-Request prüfen: nur Vorlagen-Pfade unter /event-covers/ oder
 *  https-URLs (Uploads im Blob-Store bzw. eingefügte Links). Alles andere → null. */
export function sanitizeCoverUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!url || url.length > 500) return null;
  if (/^\/event-covers\/[a-z0-9-]+\.(jpg|svg|png|webp)$/.test(url)) return url;
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/** Ist die URL eine der Vorlagen? Normale User (ohne Mod-Rolle) dürfen nur Vorlagen als Cover setzen. */
export function isPresetCover(url: string | null | undefined): boolean {
  return !!url && EVENT_COVER_PRESETS.some(p => p.url === url);
}

/** Cover aus einem Request für die Rolle des Aufrufers: Mods alles Gültige, sonst nur Vorlagen. */
export function allowedCoverUrl(raw: unknown, isModerator: boolean): string | null {
  const url = sanitizeCoverUrl(raw);
  return url && (isModerator || isPresetCover(url)) ? url : null;
}

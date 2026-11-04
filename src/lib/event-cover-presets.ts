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

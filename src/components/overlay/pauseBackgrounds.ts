/**
 * Hintergründe der Pausen-Szene — vom Streamer in den Overlay-Einstellungen wählbar. Bewusst ohne
 * React, damit Server (Prüfen der Auswahl), Overlay und Einstellungs-Vorschau dieselbe Liste nutzen.
 *
 * Die Bilder (public/overlay/pause/*.jpg, 1920×1080) wurden mit Canva generiert (Design
 * "OMA Overlay – Pausen-Hintergründe"). Jedes bekommt im normalen Modus eine eigene, leichte
 * Effekt-Ebene (siehe PauseBackground.tsx, Schlüssel = key); im Leicht-Modus bleiben sie statisch.
 */

export type PauseBackground = {
  key: string;
  label: string;
  /** Für welche Art Stream das Motiv gedacht ist — als Hinweis in der Auswahl. */
  hint: string;
  /** null = kein Bild (reine Farbfläche). */
  image: string | null;
  /** CSS-Hintergrund ohne Bild bzw. Abdunklung über dem Bild (damit Text lesbar bleibt). */
  overlay: string;
};

const DIM = "linear-gradient(180deg, rgba(6,6,9,0.35) 0%, rgba(6,6,9,0.2) 35%, rgba(6,6,9,0.55) 100%)";

export const PAUSE_BACKGROUNDS: PauseBackground[] = [
  {
    key: "dark", label: "Dunkel", hint: "Schlicht, deckend", image: null,
    overlay: "radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.16), rgba(6,6,9,0.96) 60%)",
  },
  {
    key: "transparent", label: "Durchsichtig", hint: "Spiel scheint durch", image: null,
    overlay: "rgba(6,6,9,0.55)",
  },
  { key: "synthwave", label: "Synthwave", hint: "Retro & Arcade", image: "/overlay/pause/synthwave.jpg", overlay: DIM },
  { key: "pixel", label: "Pixel-Nacht", hint: "Indie & Pixel-Games", image: "/overlay/pause/pixel.jpg", overlay: DIM },
  { key: "neoncity", label: "Neon-Stadt", hint: "Shooter & Cyberpunk", image: "/overlay/pause/neoncity.jpg", overlay: DIM },
  { key: "esports", label: "Esports-Arena", hint: "Competitive & Turniere", image: "/overlay/pause/esports.jpg", overlay: DIM },
  { key: "cozy", label: "Gemütlich", hint: "Just Chatting & Chill", image: "/overlay/pause/cozy.jpg", overlay: DIM },
  { key: "mountains", label: "Bergsee", hint: "Adventure & Survival", image: "/overlay/pause/mountains.jpg", overlay: DIM },
  { key: "space", label: "Weltraum", hint: "Sci-Fi & Space", image: "/overlay/pause/space.jpg", overlay: DIM },
  { key: "racing", label: "Rennstrecke", hint: "Racing & Sport", image: "/overlay/pause/racing.jpg", overlay: DIM },
];

export type PauseBackgroundKey = string;
export const DEFAULT_PAUSE_BACKGROUND: PauseBackgroundKey = "dark";

export function isPauseBackground(v: unknown): v is PauseBackgroundKey {
  return typeof v === "string" && PAUSE_BACKGROUNDS.some(b => b.key === v);
}

export function getPauseBackground(key: string | null | undefined): PauseBackground {
  return PAUSE_BACKGROUNDS.find(b => b.key === key) ?? PAUSE_BACKGROUNDS[0];
}

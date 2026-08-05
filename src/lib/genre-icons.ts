export type GenreIcon = { src: string; alt: string };

const GENRE_RULES: { keywords: string[]; icon: GenreIcon }[] = [
  {
    keywords: ["beat-em up", "beat em up", "beat-em-up", "fighting", "fight", "prügler", "kampfspiel", "fighter"],
    icon: { src: "/Beat-em-Up%20Icon.png", alt: "Beat-em-Up" },
  },
  {
    keywords: ["racing", "rennen", "rennspiel", "rennspiele", "kart"],
    icon: { src: "/Racing%20Icon.png", alt: "Racing" },
  },
  {
    keywords: ["arcade"],
    icon: { src: "/Arcade%20Icon.png", alt: "Arcade" },
  },
  {
    keywords: ["sport", "sports", "sportspiel", "sportspiele", "fußball", "basketball", "tennis"],
    icon: { src: "/Sport%20Icon.png", alt: "Sport" },
  },
  {
    keywords: ["shooter", "fps", "ego-shooter", "ego shooter", "first person", "taktik shooter", "taktisch", "tactical", "battle royale"],
    icon: { src: "/Shooter%20Icon.png", alt: "Shooter" },
  },
  {
    keywords: ["community", "party", "quiz", "coop", "co-op", "casual"],
    icon: { src: "/Community%20Icon.png", alt: "Community" },
  },

  // ── Erweiterte Zuordnungen ────────────────────────────────────────────────
  // Diese Genres hatten bisher gar kein Icon und fielen auf null zurück. Bis
  // eigene Motive existieren, werden sie dem thematisch nächsten der sechs
  // vorhandenen Icons zugeordnet — sichtbar etwas ist besser als sichtbar
  // nichts. Kommt ein eigenes Motiv dazu, hier einfach die src austauschen.
  {
    keywords: ["strategie", "strategy", "rts", "aufbau", "tycoon", "simulation", "sim", "management", "puzzle", "rätsel", "denkspiel", "brettspiel", "board", "karten", "cards"],
    icon: { src: "/Community%20Icon.png", alt: "Strategie & Denkspiele" },
  },
  {
    keywords: ["horror", "survival", "zombie", "grusel", "escape"],
    icon: { src: "/Shooter%20Icon.png", alt: "Horror & Survival" },
  },
  {
    keywords: ["rpg", "rollenspiel", "mmo", "mmorpg", "adventure", "abenteuer", "open world", "sandbox", "crafting", "soulslike"],
    icon: { src: "/Arcade%20Icon.png", alt: "Rollenspiel & Adventure" },
  },
  {
    keywords: ["platformer", "jump", "jump and run", "jump'n'run", "run", "geschicklichkeit", "rhythm", "rhythmus", "musik", "music"],
    icon: { src: "/Arcade%20Icon.png", alt: "Arcade & Geschicklichkeit" },
  },
  {
    keywords: ["moba", "arena", "duell", "duel", "1v1", "versus", "brawler"],
    icon: { src: "/Beat-em-Up%20Icon.png", alt: "Arena & Duelle" },
  },
  {
    keywords: ["flug", "flight", "space", "weltraum", "sci-fi", "mech", "panzer", "militär", "military", "war"],
    icon: { src: "/Racing%20Icon.png", alt: "Fahrzeuge & Simulation" },
  },
];

export function getGenreIcon(gameType: string | null | undefined): GenreIcon | null {
  if (!gameType) return null;
  const normalized = gameType.toLowerCase().trim();
  for (const rule of GENRE_RULES) {
    if (rule.keywords.some(kw => normalized.includes(kw))) {
      return rule.icon;
    }
  }
  return null;
}

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

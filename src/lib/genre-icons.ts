export type GenreIcon = { src: string; alt: string };

const GENRE_RULES: { keywords: string[]; icon: GenreIcon }[] = [
  {
    keywords: ["horror", "survival horror", "mystery", "grusel"],
    icon: { src: "/Ghost%20New.png", alt: "Horror" },
  },
  {
    keywords: ["shooter", "fps", "ego-shooter", "ego shooter", "first person", "taktik shooter", "taktisch", "tactical"],
    icon: { src: "/Helmet%20New.png", alt: "Shooter" },
  },
  {
    keywords: ["battle royale", "pvp", "competitive", "br"],
    icon: { src: "/Skull%201%20New.png", alt: "Battle Royale" },
  },
  {
    keywords: ["fighting", "fight", "beat-em up", "beat em up", "prügler", "kampfspiel", "fighter"],
    icon: { src: "/Skull%202%20New.png", alt: "Fighting" },
  },
  {
    keywords: ["survival", "crafting", "building", "aufbau", "sandbox", "open world"],
    icon: { src: "/Hammer%20New.png", alt: "Survival / Crafting" },
  },
  {
    keywords: ["strategy", "strategie", "moba", "rts", "echtzeit strategie", "tower defense", "aufbaustrategie"],
    icon: { src: "/Crown%20New.png", alt: "Strategie" },
  },
  {
    keywords: ["rpg", "action-rpg", "action rpg", "rollenspiel", "role playing", "adventure", "abenteuer", "dungeon"],
    icon: { src: "/Diamond%20Icon%20New.png", alt: "RPG / Adventure" },
  },
  {
    keywords: ["party", "coop", "co-op", "casual", "racing", "rennen", "sport", "simulation", "quiz", "arcade"],
    icon: { src: "/Controller%20New.png", alt: "Party / Coop" },
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

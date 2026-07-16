/**
 * Gibt eine Cover-Bild-URL für einen Spielnamen zurück.
 * Nutzt Steam CDN für bekannte Spiele; für unbekannte Titel
 * wird ein data-URL-ähnlicher Fallback-Schlüssel zurückgegeben.
 *
 * Steam CDN Formate:
 *   header.jpg          – 460×215 (16:9 ähnlich)
 *   capsule_616x353.jpg – 616×353 (16:9)
 *   library_600x900.jpg – 600×900 (Hochformat)
 */

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

/** Steam App-ID → Cover-URL */
function steam(appId: number, format: "header" | "capsule_616x353" = "capsule_616x353") {
  return `${STEAM_CDN}/${appId}/${format}.jpg`;
}

/**
 * Bekannte Spiele → Steam App-ID oder externe Cover-URL.
 * Schlüssel sind lowercase, Sonderzeichen entfernt.
 */
const GAME_MAP: Record<string, string> = {
  // ─── Fighting / Party ─────────────────────────────────────────────
  "brawlhalla":             steam(291550),
  "mortal kombat 1":        steam(976310),
  "mortal kombat 11":       steam(976310),
  "street fighter 6":       steam(1794960),
  "tekken 8":               steam(1778820),
  "guilty gear strive":     steam(1384160),

  // ─── Battle Royale ────────────────────────────────────────────────
  "apex legends":           steam(1172470),
  "pubg":                   steam(578080),
  "playerunknowns battlegrounds": steam(578080),
  "fall guys":              steam(1097150),
  "super people":           steam(1190550),

  // ─── Shooter ──────────────────────────────────────────────────────
  "cs2":                    steam(730),
  "counter-strike 2":       steam(730),
  "counter strike 2":       steam(730),
  "csgo":                   steam(730),
  "counter-strike":         steam(730),
  "team fortress 2":        steam(440),
  "tf2":                    steam(440),
  "left 4 dead 2":          steam(550),
  "paladins":               steam(444090),
  "warframe":               steam(230410),
  "deep rock galactic":     steam(548430),
  "helldivers 2":           steam(553850),
  "hunt showdown":          steam(594650),
  "rainbow six siege":      steam(359550),
  "rainbow 6 siege":        steam(359550),
  "r6 siege":               steam(359550),
  "r6s":                    steam(359550),
  "rainbow six extraction": steam(1373780),
  "far cry 6":              steam(1448420),
  "far cry 5":              steam(552520),
  "assassins creed odyssey":       steam(812140),
  "assassins creed valhalla":      steam(2208920),
  "assassins creed mirage":        steam(2096020),
  "the division 2":         steam(2793470),
  "ghost recon breakpoint": steam(1101552),
  "for honor":              steam(304390),
  "riders republic":        steam(1326220),

  // ─── MOBA ─────────────────────────────────────────────────────────
  "dota 2":                 steam(570),
  "dota2":                  steam(570),
  "smite":                  steam(386360),
  "heroes of the storm":    "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/D9HF4ABCGG981593130215878.jpg",

  // ─── RPG / Action ─────────────────────────────────────────────────
  "elden ring":             steam(1245620),
  "baldurs gate 3":         steam(1086940),
  "baldur's gate 3":        steam(1086940),
  "bg3":                    steam(1086940),
  "dark souls 3":           steam(374320),
  "witcher 3":              steam(292030),
  "the witcher 3":          steam(292030),
  "cyberpunk 2077":         steam(1091500),
  "monster hunter rise":    steam(1446780),
  "monster hunter world":   steam(582010),
  "pathfinder wrath of the righteous": steam(1184370),
  "divinity original sin 2": steam(435150),
  "hades":                  steam(1145360),
  "dead cells":             steam(588650),
  "hollow knight":          steam(367520),

  // ─── Survival / Crafting ──────────────────────────────────────────
  "rust":                   steam(252490),
  "valheim":                steam(892970),
  "terraria":               steam(105600),
  "dont starve together":   steam(322330),
  "don't starve together":  steam(322330),
  "ark":                    steam(346110),
  "ark survival evolved":   steam(346110),
  "ark survival ascended":  steam(2399830),
  "the forest":             steam(242760),
  "sons of the forest":     steam(1592110),
  "green hell":             steam(815370),
  "subnautica":             steam(264710),

  // ─── Coop / Party ─────────────────────────────────────────────────
  "among us":               steam(945360),
  "it takes two":           steam(1426210),
  "a way out":              steam(1222700),
  "overcooked 2":           steam(728880),
  "overcooked":             steam(448510),
  "pummel party":           steam(880940),
  "jackbox":                steam(242730),
  "jackbox party pack":     steam(242730),
  "lethal company":         steam(1966720),
  "phasmophobia":           steam(739630),
  "dead by daylight":       steam(381210),
  "dbd":                    steam(381210),
  "devour":                 steam(1274570),
  "the henry stickmin collection": steam(1089980),

  // ─── Strategy ─────────────────────────────────────────────────────
  "age of empires 4":       steam(1466860),
  "age of empires iv":      steam(1466860),
  "civilization 6":         steam(289070),
  "civilisation 6":         steam(289070),
  "crusader kings 3":       steam(1158310),
  "ck3":                    steam(1158310),
  "stellaris":              steam(281990),
  "eu4":                    steam(236850),
  "hearts of iron 4":       steam(394360),
  "hoi4":                   steam(394360),
  "total war warhammer 3":  steam(1466860),
  "starcraft 2":            "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/q0/Q04UPTUEUKLJ1532638463730.jpg",
  "sc2":                    "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/q0/Q04UPTUEUKLJ1532638463730.jpg",

  // ─── Sports / Racing ──────────────────────────────────────────────
  "rocket league":          steam(252950),
  "rl":                     steam(252950),
  "fifa 23":                steam(1811260),
  "fifa 24":                steam(2195250),
  "ea sports fc 24":        steam(2195250),
  "ea sports fc 25":        steam(2432310),
  "f1 23":                  steam(2108330),
  "f1 24":                  steam(2488620),
  "assetto corsa":          steam(244210),
  "dirt rally 2":           steam(690790),

  // ─── Sandbox / Casual ─────────────────────────────────────────────
  "stardew valley":         steam(413150),
  "factorio":               steam(427520),
  "satisfactory":           steam(526870),
  "minecraft":              "https://www.minecraft.net/content/dam/games/minecraft/key-art/Games_Subnav_Minecraft-300x465.jpg",
  "roblox":                 "https://cdn.cloudflare.steamstatic.com/steam/apps/1282100/header.jpg",
  "gta v":                  steam(271590),
  "gta5":                   steam(271590),
  "grand theft auto v":     steam(271590),
  "no mans sky":            steam(275850),
  "sea of thieves":         steam(1172620),

  // ─── Horror ───────────────────────────────────────────────────────
  "resident evil 4":        steam(2050650),
  "re4":                    steam(2050650),
  "resident evil village":  steam(1196590),
  "re8":                    steam(1196590),
  "outlast":                steam(238320),
  "visage":                 steam(594580),
  "the quarry":             steam(1869820),
  "little nightmares 2":    steam(860510),

  // ─── Simulation / Aufbau ──────────────────────────────────────────
  "cities skylines":        steam(255710),
  "cities skylines 2":      steam(949230),
  "planet coaster":         steam(493340),
  "two point hospital":     steam(535930),
  "two point campus":       steam(1397800),
  "powerwash simulator":    steam(1290000),

  // ─── Tabletop digital ─────────────────────────────────────────────
  "tabletop simulator":     steam(286160),
  "tts":                    steam(286160),

  // ─── Card Games ───────────────────────────────────────────────────
  "hearthstone":            "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/13LCZUNBXF961590530869471.jpg",
  "gwent":                  steam(499200),
  "slay the spire":         steam(646570),

  // ─── Other Popular ────────────────────────────────────────────────
  "halo infinite":          steam(1240440),
  "destiny 2":              steam(1085660),
  "warcraft 3":             "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/KY09BKRRYF001588797555074.jpg",
  "wow":                    "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/d5/D56NNTPWJZGA1584130380473.jpg",
  "world of warcraft":      "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/d5/D56NNTPWJZGA1584130380473.jpg",
  "diablo 4":               "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/OG/OGZK9YOFPNAI1686761386641.jpg",
  "diablo iv":              "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/OG/OGZK9YOFPNAI1686761386641.jpg",
  "overwatch 2":            "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/vn/VNQRCZTO07VW1630370699252.jpg",
  "overwatch":              "https://bnetcmsus-a.akamaihd.net/cms/blog_thumbnail/vn/VNQRCZTO07VW1630370699252.jpg",
  "league of legends":      "https://cdn1.epicgames.com/offer/24b84f01a7b04226b8e00c6b7f71a49d/EGS_LeagueofLegends_RiotGames_S1_2560x1440-2d8a1e14e3c48dc63a6fe4a4a88cd0b9",
  "lol":                    "https://cdn1.epicgames.com/offer/24b84f01a7b04226b8e00c6b7f71a49d/EGS_LeagueofLegends_RiotGames_S1_2560x1440-2d8a1e14e4e3c48dc63a6fe4a4a88cd0b9",
  "valorant":               "https://cdn1.epicgames.com/offer/397e61c7-a4a7-491d-abf9-e1da9bbe7ee5/EGS_VALORANT_RiotGames_S1_2560x1440-b64f2c5e6765879e4bfea0fc5f57daa5",
  "fortnite":               "https://cdn2.unrealengine.com/blade-1920x1080-1920x1080-1055684098.jpg",
};

/**
 * Kanonische Anzeigenamen aller bekannten Spiele (für Autocomplete).
 * Duplikate (Abkürzungen, Alternativen) sind bewusst entfernt.
 */
export const KNOWN_GAMES: string[] = [
  // Fighting / Party
  "Brawlhalla", "Mortal Kombat 1", "Mortal Kombat 11",
  "Street Fighter 6", "Tekken 8", "Guilty Gear Strive",
  // Battle Royale
  "Apex Legends", "PUBG", "Fall Guys",
  // Shooter
  "CS2", "Counter-Strike 2", "Team Fortress 2", "Left 4 Dead 2",
  "Deep Rock Galactic", "Helldivers 2", "Hunt Showdown", "Warframe", "Paladins",
  "Rainbow Six Siege", "Rainbow Six Extraction", "Far Cry 6", "Far Cry 5",
  "Assassin's Creed Odyssey", "Assassin's Creed Valhalla", "Assassin's Creed Mirage",
  "The Division 2", "Ghost Recon Breakpoint", "For Honor", "Riders Republic",
  // MOBA
  "Dota 2", "League of Legends", "Smite",
  // RPG / Action
  "Elden Ring", "Baldur's Gate 3", "Dark Souls 3",
  "The Witcher 3", "Cyberpunk 2077", "Monster Hunter Rise",
  "Monster Hunter World", "Hades", "Dead Cells", "Hollow Knight",
  // Survival / Crafting
  "Rust", "Valheim", "Terraria", "Don't Starve Together",
  "ARK: Survival Evolved", "ARK: Survival Ascended",
  "The Forest", "Sons of the Forest", "Green Hell", "Subnautica",
  // Coop / Party
  "Among Us", "It Takes Two", "A Way Out",
  "Overcooked 2", "Overcooked", "Pummel Party",
  "Jackbox Party Pack", "Lethal Company", "Phasmophobia",
  "Dead by Daylight", "Devour",
  // Strategy
  "Age of Empires 4", "Civilization 6", "Crusader Kings 3",
  "Stellaris", "EU4", "Hearts of Iron 4",
  "Total War: Warhammer 3", "Starcraft 2",
  // Sports / Racing
  "Rocket League", "FIFA 23", "FIFA 24",
  "EA Sports FC 24", "EA Sports FC 25",
  "F1 23", "F1 24", "Assetto Corsa", "DiRT Rally 2",
  // Sandbox / Casual
  "Minecraft", "Stardew Valley", "Factorio", "Satisfactory",
  "GTA V", "No Man's Sky", "Sea of Thieves", "Roblox",
  // Horror
  "Resident Evil 4", "Resident Evil Village",
  "Outlast", "The Quarry", "Little Nightmares 2",
  // Simulation / Aufbau
  "Cities: Skylines", "Cities: Skylines 2", "Planet Coaster",
  "Two Point Hospital", "Two Point Campus", "PowerWash Simulator",
  // Tabletop / Card
  "Tabletop Simulator", "Hearthstone", "Gwent", "Slay the Spire",
  // Sonstige
  "Halo Infinite", "Destiny 2", "Overwatch 2",
  "Valorant", "Fortnite", "Diablo IV",
  "World of Warcraft", "Warcraft 3",
  "Baldur's Gate 3", "Divinity: Original Sin 2",
  "Path of Exile", "Slay the Spire",
].sort((a, b) => a.localeCompare(b, "de"));

/** Normalisiert einen Spielnamen für den Lookup */
function normalizeGameName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")          // Apostrophe entfernen
    .replace(/[^a-z0-9 ]/g, " ")  // Sonderzeichen → Leerzeichen
    .replace(/\s+/g, " ")          // Mehrfach-Spaces
    .trim();
}

/**
 * Session-weiter Cache: normierter Spielname → exaktes Steam-Cover, das der
 * Nutzer im Autocomplete-Dropdown (GameNameInput) tatsächlich ausgewählt hat.
 * Eine erneute Steam-Suche über den fertigen Namen (z.B. in GameCover nach
 * dem Speichern) kann für mehrdeutige Titel ein anderes App-Ergebnis liefern
 * als das ursprünglich angeklickte — dieser Cache verhindert, dass danach
 * ein abweichendes Cover angezeigt wird.
 */
export const pickedCoverCache = new Map<string, string>();

export function normalizeForCoverCache(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Gibt die beste verfügbare Cover-URL für ein Spiel zurück.
 * @returns URL-String oder `null` wenn kein Treffer
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getGameCoverUrl(gameName: string | null | undefined): string | null {
  if (!gameName) return null;
  const key = normalizeGameName(gameName);
  // Exakter Treffer
  if (GAME_MAP[key]) return GAME_MAP[key];
  // Wort-Grenzen-Treffer (z.B. "Brawlhalla OMA Cup" → "brawlhalla").
  // Wichtig: KEIN roher Teilstring-Vergleich — kurze Abkürzungen wie "rl" (Rocket League)
  // stecken sonst versehentlich in ganz anderen Wörtern (z.B. "palwo-RL-d" → Palworld).
  for (const [mapKey, url] of Object.entries(GAME_MAP)) {
    const mapKeyInKey = new RegExp(`\\b${escapeRegExp(mapKey)}\\b`).test(key);
    const keyInMapKey = new RegExp(`\\b${escapeRegExp(key)}\\b`).test(mapKey);
    if (mapKeyInKey || keyInMapKey) return url;
  }
  return null;
}

/**
 * Wie getGameCoverUrl, aber mit Live-Steam-Suche als Fallback.
 * Geeignet für serverseitige Aufrufe (z.B. Discord-Sync).
 */
export async function getGameCoverUrlAsync(gameName: string | null | undefined): Promise<string | null> {
  const staticUrl = getGameCoverUrl(gameName);
  if (staticUrl) return staticUrl;
  if (!gameName) return null;

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=english&cc=DE&f=games`,
      { headers: { "User-Agent": "OMA-Companion/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { items: { id: number; name: string; type: string }[] };
    const first = (data.items ?? []).find(i => i.type === "app");
    if (first) return `https://cdn.cloudflare.steamstatic.com/steam/apps/${first.id}/capsule_616x353.jpg`;
  } catch (err) {
    console.error("[game-cover] Steam-Suche fehlgeschlagen:", err);
  }
  return null;
}

/**
 * Gibt eine konsistente Hintergrundfarbe als CSS-Gradient zurück,
 * basierend auf dem Spielnamen (für den Fallback-Fall).
 */
export function getGameFallbackGradient(gameName: string | null | undefined): string {
  if (!gameName) return "linear-gradient(135deg, rgba(20,184,166,0.3), rgba(139,32,32,0.3))";
  // Einfacher Hash für konsistente Farbe
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = gameName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsla(${hue},60%,35%,0.5), hsla(${(hue + 120) % 360},50%,25%,0.4))`;
}

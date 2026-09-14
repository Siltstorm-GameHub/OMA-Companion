// ============================================
// MOBA-Style-Icons — echte Kit-Assets statt Lucide
// ============================================
// Quelle: Assets/UI/MOBA Style/PNG/ICONS/REGULAR (+ ITEMS für Währung),
// kopiert nach public/battle-cards/moba/icons/ bzw. moba/. Rasterbilder mit
// bereits eingebranntem Glow (Cyan für Kampf-Icons, Orange für Rest) — anders
// als Lucide-Icons NICHT per `color`/`currentColor` einfärbbar, daher pro
// Bedeutung ein eigenes Icon statt eines eingefärbten Universal-Icons.
//
// Für einige rein funktionale UI-Glyphen (Spinner, Play/Pause, Schließen,
// Sparkles, Scherenschnitt, Crown, ThumbsDown, Wind, RotateCcw) hat das Kit
// keine Entsprechung — dort bleibt bewusst Lucide im Einsatz (siehe jeweilige
// Komponente), statt ein thematisch unpassendes Icon zu erzwingen.

const BASE = "/battle-cards/moba/icons";

export const MOBA_ICON = {
  shield: `${BASE}/shield.png`, // Tank
  sword: `${BASE}/sword.png`, // Damage Dealer / Angriff
  crossedSwords: `${BASE}/crossed-swords.png`, // OMA Duels / VS
  magic: `${BASE}/magic.png`, // Support
  map: `${BASE}/map.png`, // Kampagne
  champions: `${BASE}/champions.png`, // Karten
  friends: `${BASE}/friends.png`, // Community / Gegen Spieler
  trophy: `${BASE}/trophy.png`, // Rangliste
  chest: `${BASE}/chest.png`, // Packs
  soundOn: `${BASE}/sound-on.png`,
  soundOff: `${BASE}/sound-off.png`,
  chevronUp: `${BASE}/chevron-up.png`,
  chevronRight: `${BASE}/chevron-right.png`,
  chevronLeft: `${BASE}/chevron-left.png`,
  chevronDown: `${BASE}/chevron-down.png`,
  like: `${BASE}/like.png`, // Passiv positiv
  lock: `${BASE}/lock.png`,
  attack: `${BASE}/attack.png`, // aktiver Skill
  boss: `${BASE}/boss.png`, // NPC
  info: `${BASE}/info.png`,
  profile: `${BASE}/profile.png`, // Community-Karte
  star: `${BASE}/star.png`, // Level-Sterne
  clock: `${BASE}/clock.png`, // wartend
  search: `${BASE}/search.png`,
  help: `${BASE}/help.png`,
  gem: "/battle-cards/moba/gem.png",
  coin: "/battle-cards/moba/coin.png",
  navChampions: `${BASE}/nav-champions.png`, // Kampf-Reiter (Helm-Icon aus Referenz-Screenshot)
  navDungeon: `${BASE}/nav-dungeon.png`, // Kampagne-Reiter (Tor-Icon aus Referenz-Screenshot)
  navInventory: `${BASE}/nav-inventory.png`, // Karten-Reiter (Inventar-Icon aus Referenz-Screenshot)
  navRank: `${BASE}/nav-rank.png`, // Community-Reiter (Rang-Medaillen-Icon aus Referenz-Screenshot)
} as const;

export type MobaIconName = keyof typeof MOBA_ICON;

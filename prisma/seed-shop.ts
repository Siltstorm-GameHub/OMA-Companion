import { prisma } from "../src/lib/prisma";

const ITEMS = [
  // ── Titel ──────────────────────────────────────────────────────
  { name: "Veteran",       description: "Zeige allen, dass du schon lange dabei bist.",            icon: "🎖️", price:   500, type: "title",          value: "Veteran",       category: "cosmetic",  rarity: "common",    sortOrder: 10 },
  { name: "Champion",      description: "Der Titel der Sieger. Verdient durch harte Arbeit.",       icon: "🏆", price:  1000, type: "title",          value: "Champion",      category: "cosmetic",  rarity: "rare",      sortOrder: 11 },
  { name: "OG Member",     description: "Nur für die Allerersten. Zeige deine Treue.",              icon: "👑", price:  1500, type: "title",          value: "OG Member",     category: "cosmetic",  rarity: "epic",      sortOrder: 12 },
  { name: "Arena-Meister", description: "Herrscher der Turniere und Wettkämpfe.",                   icon: "⚔️", price:  1200, type: "title",          value: "Arena-Meister", category: "cosmetic",  rarity: "rare",      sortOrder: 13 },
  { name: "Shadow",        description: "Geheimnisvoll. Selten gesehen, oft gefürchtet.",           icon: "🌑", price:   800, type: "title",          value: "Shadow",        category: "cosmetic",  rarity: "rare",      sortOrder: 14 },
  { name: "Legende",       description: "Nur wenige erreichen diesen Status. Bist du einer?",      icon: "✨", price:  3000, type: "title",          value: "Legende",       category: "cosmetic",  rarity: "legendary", sortOrder: 15 },

  // ── Exklusive Badges ───────────────────────────────────────────
  { name: "💎 Whale",       description: "Für die großen Punktesammler der Community.",             icon: "💎", price:  2000, type: "badge",          value: "shop_whale",    category: "cosmetic",  rarity: "epic",      sortOrder: 20 },
  { name: "🎯 Sharpshooter",description: "Präzise, schnell, unaufhaltsam.",                        icon: "🎯", price:  1000, type: "badge",          value: "shop_sharp",    category: "cosmetic",  rarity: "rare",      sortOrder: 21 },
  { name: "🌟 All-Star",    description: "Einer der Besten in allem was du tust.",                  icon: "🌟", price:  1500, type: "badge",          value: "shop_allstar",  category: "cosmetic",  rarity: "epic",      sortOrder: 22 },

  // ── Profil-Themes ──────────────────────────────────────────────
  { name: "Cyber Blue",    description: "Elektrisches Blau-Cyan — futuristisch und kalt.",          icon: "🔵", price:   800, type: "profile_theme",  value: "cyber",         category: "cosmetic",  rarity: "rare",      sortOrder: 30 },
  { name: "Golden",        description: "Gold und Amber — für die Champions unter euch.",           icon: "🟡", price:  1000, type: "profile_theme",  value: "golden",        category: "cosmetic",  rarity: "rare",      sortOrder: 31 },
  { name: "Void Purple",   description: "Tiefdunkles Violett — mysteriös und mächtig.",             icon: "🟣", price:   800, type: "profile_theme",  value: "void",          category: "cosmetic",  rarity: "rare",      sortOrder: 32 },
  { name: "Emerald",       description: "Leuchtendes Grün — frisch und vital.",                     icon: "🟢", price:   800, type: "profile_theme",  value: "emerald",       category: "cosmetic",  rarity: "common",    sortOrder: 33 },
  { name: "Crimson",       description: "Tiefes Dunkelrot — für die harten Kämpfer.",               icon: "🔴", price:   600, type: "profile_theme",  value: "crimson",       category: "cosmetic",  rarity: "common",    sortOrder: 34 },

  // ── Namens-Farben ──────────────────────────────────────────────
  { name: "Namensfarbe Gold",    description: "Dein Name leuchtet in sattem Gold im Leaderboard.",      icon: "🟡", price:  600, type: "name_color", value: "#f59e0b", category: "cosmetic",  rarity: "rare",      sortOrder: 35 },
  { name: "Namensfarbe Rose",    description: "Dein Name erstrahlt in zartem Rose im Leaderboard.",     icon: "🌸", price:  600, type: "name_color", value: "#fb7185", category: "cosmetic",  rarity: "rare",      sortOrder: 36 },
  { name: "Namensfarbe Cyan",    description: "Futuristisches Cyan — kaum zu übersehen.",               icon: "🔷", price:  600, type: "name_color", value: "#22d3ee", category: "cosmetic",  rarity: "rare",      sortOrder: 37 },
  { name: "Namensfarbe Violet",  description: "Mystisches Violett für echte Legenden.",                 icon: "🟣", price:  800, type: "name_color", value: "#c084fc", category: "cosmetic",  rarity: "epic",      sortOrder: 38 },
  { name: "Namensfarbe Emerald", description: "Frisches Grün — lebendig und auffällig.",                icon: "💚", price:  600, type: "name_color", value: "#34d399", category: "cosmetic",  rarity: "rare",      sortOrder: 39 },
  { name: "Namensfarbe Orange",  description: "Warmes Orange — fällt immer auf.",                       icon: "🟠", price:  500, type: "name_color", value: "#fb923c", category: "cosmetic",  rarity: "common",    sortOrder: 39 },

  // ── Boosts & Privileges ────────────────────────────────────────
  { name: "Streak-Schutz",     description: "Verhindert einmalig einen Streak-Verlust wenn du einen Tag verpasst.",                                icon: "🛡️", price:  300, type: "streak_shield",      value: "1",            category: "boost",     rarity: "common",    sortOrder: 40 },
  { name: "XP-Boost 7 Tage",  description: "+50% Punkte auf alle Aktivitäten für 7 Tage.",                                                        icon: "⚡", price: 1500, type: "xp_boost",           value: "7",            category: "boost",     rarity: "rare",      sortOrder: 41 },
  { name: "Event-Slot",        description: "Garantierter Platz bei einem ausgebuchten Event — überspringt die Warteliste.",                       icon: "🎟️", price:  200, type: "event_slot",         value: "1",            category: "privilege", rarity: "common",    sortOrder: 42 },
  { name: "Discord-Rolle",     description: "Erhalte sofort die exklusive Shop-Veteran Rolle im Discord — sichtbar für alle.",                     icon: "🎭", price: 2000, type: "discord_role",       value: "CONFIGURE_ME", category: "privilege", rarity: "epic",      sortOrder: 43 },
  { name: "Spieltag-Vorschlag",description: "Schlage ein Spiel für den nächsten LUL-Spieltag vor. Dein Vorschlag wird zur Abstimmung gestellt.",  icon: "🎮", price:  800, type: "lul_suggest",        value: "1",            category: "privilege", rarity: "rare",      sortOrder: 44 },
  { name: "Turnier-Sponsoring",description: "Dein Name erscheint als Community-Sponsor auf der nächsten Turnier-Seite. Ewiger Ruhm garantiert.", icon: "🏅", price: 3500, type: "tournament_sponsor", value: "1",            category: "privilege", rarity: "legendary", sortOrder: 45 },
  { name: "Status-Nachricht",  description: "Zeige eine eigene kurze Nachricht unter deinem Namen im Profil — für alle sichtbar.",                icon: "💬", price:  750, type: "status_message",    value: "1",            category: "privilege", rarity: "rare",      sortOrder: 46 },

  // ── Bundles ────────────────────────────────────────────────────
  // value = JSON-Array der enthaltenen ShopItem-IDs
  { name: "Starter-Paket",    description: "Veteran-Titel + Emerald-Theme + Streak-Schutz — perfekt für den Einstieg. Spart 350 Punkte.", icon: "🎁", price: 1050, type: "bundle", value: JSON.stringify(["veteran", "emerald", "streak-shield"]), category: "cosmetic", rarity: "rare",      sortOrder: 50 },
  { name: "Champion-Bundle",  description: "Champion-Titel + Golden-Theme + XP-Boost — für ambitionierte Spieler. Spart 500 Punkte.",    icon: "🎁", price: 3000, type: "bundle", value: JSON.stringify(["champion", "golden", "xp-boost-7"]),   category: "cosmetic", rarity: "epic",      sortOrder: 51 },
  { name: "Legende-Bundle",   description: "Legende-Titel + Void-Theme + Whale-Badge + Discord-Rolle. Spart 1.100 Punkte.",               icon: "🎁", price: 6400, type: "bundle", value: JSON.stringify(["legende", "void-purple", "whale", "discord-rolle"]), category: "cosmetic", rarity: "legendary", sortOrder: 52 },
];

async function main() {
  console.log("Seeding shop items...");
  for (const item of ITEMS) {
    await prisma.shopItem.upsert({
      where:  { id: item.name }, // we use name as stable key for upsert
      update: item,
      create: { ...item, id: item.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
    });
  }
  console.log(`✅ ${ITEMS.length} shop items seeded.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

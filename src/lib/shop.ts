import { prisma } from "./prisma";

export const RARITY_CONFIG = {
  common:    { label: "Gewöhnlich", color: "text-gray-400",   border: "border-gray-500/20",   bg: "from-gray-500/5",    glow: "" },
  rare:      { label: "Selten",     color: "text-blue-400",   border: "border-blue-500/25",   bg: "from-blue-500/8",    glow: "shadow-[0_0_20px_rgba(59,130,246,0.12)]" },
  epic:      { label: "Episch",     color: "text-purple-400", border: "border-purple-500/30", bg: "from-purple-500/10", glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]" },
  legendary: { label: "Legendär",   color: "text-amber-400",  border: "border-amber-500/35",  bg: "from-amber-500/12",  glow: "shadow-[0_0_24px_rgba(251,191,36,0.2)]"  },
} as const;

export const CATEGORY_CONFIG = {
  cosmetic:  { label: "Kosmetik",    icon: "🎨" },
  boost:     { label: "Boosts",      icon: "⚡" },
  privilege: { label: "Privilegien", icon: "🎟️" },
} as const;

export const TYPE_CONFIG: Record<string, { label: string; icon: string; desc: string }> = {
  title:              { label: "Titel",              icon: "🎖️", desc: "Zeige deinen Status neben deinem Namen — im Profil und im Leaderboard." },
  badge:              { label: "Exklusive Abzeichen", icon: "💎", desc: "Shop-exklusive Badges die man nicht durch Aktivität verdienen kann." },
  profile_theme:      { label: "Profil-Themes",      icon: "🎨", desc: "Personalisiere deinen Hero-Banner mit einem eigenen Farbschema." },
  xp_boost:          { label: "XP-Boost",            icon: "⚡", desc: "Verdiene temporär mehr Punkte auf alle Aktivitäten." },
  streak_shield:     { label: "Streak-Schutz",       icon: "🛡️", desc: "Schütze deinen Streak vor Verlust wenn du einen Tag verpasst." },
  event_slot:        { label: "Event-Slot",           icon: "🎟️", desc: "Überspringe die Warteliste bei ausgebuchten Events." },
  discord_role:      { label: "Discord-Rolle",        icon: "🎭", desc: "Erhalte sofort eine exklusive Rolle im Discord-Server." },
  lul_suggest:       { label: "Spieltag-Vorschlag",  icon: "🎮", desc: "Schlage ein Spiel für den nächsten LUL-Spieltag vor." },
  tournament_sponsor:{ label: "Turnier-Sponsoring",  icon: "🏅", desc: "Dein Name erscheint als Community-Sponsor auf Turnier-Seiten." },
};

export const PROFILE_THEMES: Record<string, { from: string; to: string; via: string; border: string }> = {
  default: { from: "from-rose-500/14",    via: "via-transparent", to: "to-violet-500/10", border: "via-rose-500/25"    },
  cyber:   { from: "from-blue-500/14",    via: "via-transparent", to: "to-cyan-500/10",   border: "via-blue-500/25"    },
  golden:  { from: "from-amber-500/16",   via: "via-transparent", to: "to-yellow-500/10", border: "via-amber-500/30"   },
  void:    { from: "from-violet-600/16",  via: "via-transparent", to: "to-purple-800/12", border: "via-violet-500/30"  },
  emerald: { from: "from-emerald-500/14", via: "via-transparent", to: "to-teal-500/10",   border: "via-emerald-500/25" },
  crimson: { from: "from-red-600/14",     via: "via-transparent", to: "to-rose-800/10",   border: "via-red-500/25"     },
};

export const TITLE_STYLES: Record<string, string> = {
  "Veteran":       "text-blue-300   bg-blue-500/10   border-blue-500/20",
  "Champion":      "text-amber-300  bg-amber-500/10  border-amber-500/20",
  "OG Member":     "text-purple-300 bg-purple-500/10 border-purple-500/20",
  "Arena-Meister": "text-rose-300   bg-rose-500/10   border-rose-500/20",
  "Shadow":        "text-gray-400   bg-white/[0.05]  border-white/[0.1]",
  "Legende":       "text-gradient-gaming bg-amber-500/10 border-amber-500/25",
};

export const SHOP_BADGE_META: Record<string, { icon: string; name: string; desc: string }> = {
  shop_whale:   { icon: "💎", name: "Whale",       desc: "Großer Punktesammler" },
  shop_sharp:   { icon: "🎯", name: "Sharpshooter", desc: "Präzise und schnell" },
  shop_allstar: { icon: "🌟", name: "All-Star",    desc: "Bester in allem" },
};

async function assignDiscordRole(discordId: string, roleId: string) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const token   = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !token || !roleId || roleId === "CONFIGURE_ME") return;
  await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
    method:  "PUT",
    headers: { Authorization: `Bot ${token}` },
  });
}

/** Kauft ein Item. Gibt null zurück wenn Punkte nicht reichen oder Item nicht verfügbar. */
export async function purchaseItem(userId: string, itemId: string) {
  const [user, item] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true, discordId: true } }),
    prisma.shopItem.findUnique({ where: { id: itemId } }),
  ]);

  if (!user || !item || !item.active) return { error: "Item nicht verfügbar" };
  if (user.points < item.price)       return { error: "Nicht genug Punkte" };
  if (item.stock !== null && item.stock <= 0) return { error: "Ausverkauft" };

  // Doppelkauf für dauerhafte Items verhindern (außer Einmalitems)
  const isRepeatable = ["streak_shield", "xp_boost", "event_slot", "lul_suggest"].includes(item.type);
  if (!isRepeatable) {
    const existing = await prisma.shopPurchase.findFirst({ where: { userId, itemId } });
    if (existing) return { error: "Bereits gekauft" };
  }

  const expiresAt = item.type === "xp_boost"
    ? new Date(Date.now() + parseInt(item.value) * 86400 * 1000)
    : null;

  const [purchase] = await prisma.$transaction([
    prisma.shopPurchase.create({
      data: { userId, itemId, price: item.price, expiresAt },
    }),
    prisma.user.update({
      where: { id: userId },
      data:  { points: { decrement: item.price } },
    }),
    prisma.pointTransaction.create({
      data: { userId, amount: -item.price, reason: `Shop: ${item.name} gekauft` },
    }),
    ...(item.stock !== null
      ? [prisma.shopItem.update({ where: { id: itemId }, data: { stock: { decrement: 1 } } })]
      : []),
  ]);

  // Sofortiger Effekt für dauerhafte Cosmetics
  if (item.type === "profile_theme") {
    await prisma.user.update({ where: { id: userId }, data: { profileTheme: item.value } });
  }
  if (item.type === "xp_boost") {
    await prisma.user.update({ where: { id: userId }, data: { xpBoostUntil: expiresAt } });
  }
  if (item.type === "streak_shield") {
    await prisma.user.update({ where: { id: userId }, data: { streakShield: true } });
  }
  if (item.type === "discord_role" && user.discordId) {
    await assignDiscordRole(user.discordId, item.value);
  }

  return { purchase, item };
}

/** Aktiviert einen Titel (muss vorher gekauft worden sein) */
export async function activateTitle(userId: string, title: string | null) {
  return prisma.user.update({ where: { id: userId }, data: { activeTitle: title } });
}

/** Prüft ob User aktiven XP-Boost hat */
export function hasActiveXpBoost(xpBoostUntil: Date | null): boolean {
  if (!xpBoostUntil) return false;
  return xpBoostUntil > new Date();
}

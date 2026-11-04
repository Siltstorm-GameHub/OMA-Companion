// Discord-Textkanal eines Events — EINZIGE Quelle für alle Event-Nachrichten (Ankündigung,
// Erinnerung, Start, Umfrage, Ergebnis, Community-Ziel, …).
//
// Reihenfolge: Kanal des Events → Kanal der Eventreihe → null (dann gilt der Kanal der jeweiligen
// Benachrichtigungsregel bzw. der Standardkanal DISCORD_NEWS_CHANNEL_ID). Vorher nutzten die meisten
// Stellen nur event.discordChannelId — Termine einer Reihe, deren Kanal nur an der Reihe hinterlegt
// war, landeten dadurch im Standardkanal.

export function resolveEventChannelId(ev: {
  discordChannelId?: string | null;
  series?: { discordChannelId?: string | null } | null;
} | null | undefined): string | null {
  const own = ev?.discordChannelId?.trim();
  if (own) return own;
  const series = ev?.series?.discordChannelId?.trim();
  return series || null;
}

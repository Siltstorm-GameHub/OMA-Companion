/**
 * Erkennt Bots, die Links für Rich-Preview-Karten abrufen (Discord, Slack,
 * Telegram, WhatsApp, X/Twitter, LinkedIn, Skype, Facebook) — bewusst NICHT
 * Suchmaschinen-Crawler wie Googlebot/Bingbot.
 *
 * Diese Bots führen kein JavaScript aus, folgen aber Redirects und haben nie
 * eine Session. Sie lesen nur die Meta-Tags im <head>, keine echten
 * Seiteninhalte — daher reicht es, ihnen eine leere Hülle mit korrekten
 * Meta-Tags zu zeigen, siehe (dashboard)/layout.tsx.
 *
 * Next.js hat intern eine ähnliche, breitere Liste für sein eigenes
 * Streaming-Metadata-Verhalten (next/dist/.../html-bots.ts) — die schließt
 * aber Suchmaschinen ein und ist kein öffentlicher API-Pfad (nicht aus dem
 * "next"-Paket exportiert, könnte sich jederzeit ändern). Deshalb hier eine
 * eigene, enger gefasste und stabile Liste.
 */
const LINK_PREVIEW_BOT_UA_RE =
  /Discordbot|Slackbot|TelegramBot|WhatsApp|Twitterbot|LinkedInBot|SkypeUriPreview|facebookexternalhit/i;

export function isLinkPreviewBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return LINK_PREVIEW_BOT_UA_RE.test(userAgent);
}

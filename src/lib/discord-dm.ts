/**
 * Discord-Direktnachrichten per REST (kein laufender Bot-Client nötig,
 * funktioniert daher auch aus Vercel Serverless Functions / Cron Jobs).
 * Spiegelt Push- und In-App-Benachrichtigungen an User mit verknüpftem
 * Discord-Account, sofern diese die "Discord-DM"-Einstellung nicht deaktiviert haben.
 */
import { prisma } from "@/lib/prisma";

const BASE = "https://discord.com/api/v10";

export interface DiscordDMPayload {
  title: string;
  body:  string;
  url?:  string;
}

function authHeader() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}` };
}

/** Direktnachricht an einen einzelnen Discord-User senden (ohne Präferenz-Prüfung) */
export async function sendDiscordDM(discordId: string, payload: DiscordDMPayload): Promise<void> {
  try {
    const dmRes = await fetch(`${BASE}/users/@me/channels`, {
      method:  "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body:    JSON.stringify({ recipient_id: discordId }),
    });
    if (!dmRes.ok) return;
    const channel = (await dmRes.json()) as { id?: string };
    if (!channel.id) return;

    const base = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
    await fetch(`${BASE}/channels/${channel.id}/messages`, {
      method:  "POST",
      headers: { ...authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title:       payload.title,
          description: payload.body,
          url:         payload.url ? `${base}${payload.url}` : undefined,
          color:       0x2dd4bf,
          timestamp:   new Date().toISOString(),
        }],
      }),
    });
  } catch {
    // DMs geschlossen, kein Bot-Token o.ä. — ignorieren
  }
}

function isDmEligible(discordId: string | null, notificationPrefs: string): discordId is string {
  if (!discordId) return false;
  const prefs: Record<string, boolean> = JSON.parse(notificationPrefs || "{}");
  return prefs.discordDm !== false;
}

/** Direktnachricht an bestimmte User senden (respektiert die Discord-DM-Einstellung) */
export async function sendDiscordDMToUsers(userIds: string[], payload: DiscordDMPayload): Promise<void> {
  if (!userIds.length) return;
  const users = await prisma.user.findMany({
    where:  { id: { in: userIds }, discordId: { not: null } },
    select: { discordId: true, notificationPrefs: true },
  });
  await Promise.allSettled(
    users
      .filter((u) => isDmEligible(u.discordId, u.notificationPrefs))
      .map((u) => sendDiscordDM(u.discordId!, payload)),
  );
}

/** Direktnachricht an alle User mit verknüpftem Discord-Account senden */
export async function sendDiscordDMToAll(payload: DiscordDMPayload): Promise<void> {
  const users = await prisma.user.findMany({
    where:  { discordId: { not: null } },
    select: { discordId: true, notificationPrefs: true },
  });
  await Promise.allSettled(
    users
      .filter((u) => isDmEligible(u.discordId, u.notificationPrefs))
      .map((u) => sendDiscordDM(u.discordId!, payload)),
  );
}

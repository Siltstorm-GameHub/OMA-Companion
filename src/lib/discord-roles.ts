function getRoleId(envKey: string): string | undefined {
  return process.env[envKey] || undefined;
}

async function discordRequest(
  method: string,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return { status: 0, body: "DISCORD_BOT_TOKEN fehlt" };

  const res = await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: { Authorization: `Bot ${token}` },
  });

  let body: unknown = null;
  try { body = res.status !== 204 ? await res.json() : null; } catch { body = null; }
  return { status: res.status, body };
}

// ── Ansehens-Rollen (offene Community-Jobs) ──────────────────────────────────
// Discord-Rollen richten sich nach der Ansehens-Stufe des Users (Bronze/Silber/Gold/Platin)
// aus der Gesamtleistung aller Community-Jobs. Wer im Ansehens-Fenster nicht aktiv war,
// bekommt keine Rolle. Die früheren Job-Rollen werden beim Abgleich mit entfernt.

/** Env-Variable mit der Discord-Rollen-ID je Ansehens-Stufe (Index 0 = Stufe 1). */
export const REPUTATION_ROLE_ENV_KEYS: readonly string[] = [
  "DISCORD_ROLE_BRONZE", "DISCORD_ROLE_SILBER", "DISCORD_ROLE_GOLD", "DISCORD_ROLE_PLATIN",
];

/** Frühere Berufs-Rollen — werden nur noch entfernt, nie mehr vergeben. */
const LEGACY_JOB_ROLE_ENV_KEYS: readonly string[] = [
  "DISCORD_ROLE_JOURNALIST", "DISCORD_ROLE_FOTOGRAF", "DISCORD_ROLE_MARKETING", "DISCORD_ROLE_COACH", "DISCORD_ROLE_VISIONAER",
];

/**
 * Setzt die Discord-Rolle passend zur Ansehens-Stufe (1–4) oder entfernt alle
 * Ansehens-/Job-Rollen bei `level=null` (im Fenster nicht aktiv).
 */
export async function syncReputationDiscordRole(
  discordId: string | null | undefined, level: number | null,
): Promise<{ ok: boolean; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!discordId || !guildId || !process.env.DISCORD_BOT_TOKEN) {
    return { ok: false, error: "Discord nicht verknüpft oder nicht konfiguriert" };
  }

  const allRoleIds = [...new Set([...REPUTATION_ROLE_ENV_KEYS, ...LEGACY_JOB_ROLE_ENV_KEYS].map(getRoleId).filter(Boolean))] as string[];
  const newRoleId = level ? getRoleId(REPUTATION_ROLE_ENV_KEYS[Math.min(4, Math.max(1, level)) - 1]) : undefined;

  const removeTargets = allRoleIds.filter(id => id !== newRoleId);
  await Promise.allSettled(
    removeTargets.map(roleId => discordRequest("DELETE", `/guilds/${guildId}/members/${discordId}/roles/${roleId}`)),
  );

  if (!newRoleId) return { ok: true }; // nicht aktiv — keine Rolle zu setzen

  const result = await discordRequest("PUT", `/guilds/${guildId}/members/${discordId}/roles/${newRoleId}`);
  return { ok: result.status === 204 || result.status === 200 };
}

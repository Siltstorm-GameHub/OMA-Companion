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

// ── Community-Job-Rollen ─────────────────────────────────────────────────────
// Discord-Rollen basieren auf dem aktiven Community-Job (nur der Beruf, ohne Stufe).
// Arbeitslose User bekommen keine Rolle. Rang-Rollen gibt es nicht mehr.

export const COMMUNITY_JOB_ROLE_ENV_KEYS: Record<string, string> = {
  journalist:         "DISCORD_ROLE_JOURNALIST",
  fotograf:           "DISCORD_ROLE_FOTOGRAF",
  marketing_manager:  "DISCORD_ROLE_MARKETING",
  coach:              "DISCORD_ROLE_COACH",
  visionaer:          "DISCORD_ROLE_VISIONAER",
};

/**
 * Setzt die Discord-Rolle passend zum aktuellen Community-Job (oder entfernt
 * alle Job-Rollen bei `jobKey=null`, z.B. nach Kündigung/Entzug/Vertragsende).
 */
export async function syncCommunityJobDiscordRole(
  discordId: string | null | undefined, jobKey: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!discordId || !guildId || !process.env.DISCORD_BOT_TOKEN) {
    return { ok: false, error: "Discord nicht verknüpft oder nicht konfiguriert" };
  }

  const allRoleIds = [...new Set(Object.values(COMMUNITY_JOB_ROLE_ENV_KEYS).map(getRoleId).filter(Boolean))] as string[];
  const newRoleId = jobKey ? getRoleId(COMMUNITY_JOB_ROLE_ENV_KEYS[jobKey] ?? "") : undefined;

  const removeTargets = allRoleIds.filter(id => id !== newRoleId);
  await Promise.allSettled(
    removeTargets.map(roleId => discordRequest("DELETE", `/guilds/${guildId}/members/${discordId}/roles/${roleId}`)),
  );

  if (!newRoleId) return { ok: true }; // arbeitslos — keine Rolle zu setzen

  const result = await discordRequest("PUT", `/guilds/${guildId}/members/${discordId}/roles/${newRoleId}`);
  return { ok: result.status === 204 || result.status === 200 };
}

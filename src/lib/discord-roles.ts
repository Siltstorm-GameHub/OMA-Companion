import { RANKS, getRank } from "./ranks";

const BASE_URL = `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members`;

async function discordRequest(method: string, path: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: { Authorization: `Bot ${token}` },
  });
}

function getRoleId(envKey: string): string | undefined {
  return process.env[envKey] || undefined;
}

/** Weist einem User seine aktuelle Rang-Rolle zu – unabhängig vom vorherigen Stand. */
export async function assignCurrentRole(
  discordId: string,
  rankPoints: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.DISCORD_GUILD_ID || !process.env.DISCORD_BOT_TOKEN) {
    return { ok: false, error: "DISCORD_GUILD_ID oder DISCORD_BOT_TOKEN fehlt" };
  }

  const rank      = getRank(rankPoints);
  const newRoleId = getRoleId(rank.discordRoleEnvKey);

  const allRoleIds = [...new Set(RANKS.map(r => getRoleId(r.discordRoleEnvKey)).filter(Boolean))] as string[];
  const removeTargets = allRoleIds.filter(id => id !== newRoleId);

  await Promise.allSettled(
    removeTargets.map(roleId =>
      discordRequest("DELETE", `/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`)
    )
  );

  if (newRoleId) {
    await discordRequest("PUT", `/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${newRoleId}`);
  }

  return { ok: true };
}

/** Synchronisiert die Discord-Rolle eines Users wenn sich sein Rang geändert hat. */
export async function syncDiscordRole(
  discordId: string | null | undefined,
  oldPoints: number,
  newPoints: number,
): Promise<void> {
  if (!discordId || !process.env.DISCORD_GUILD_ID || !process.env.DISCORD_BOT_TOKEN) return;

  const oldRank = getRank(oldPoints);
  const newRank = getRank(newPoints);

  // Kein Tier-Wechsel → nichts zu tun
  if (oldRank.discordRoleEnvKey === newRank.discordRoleEnvKey) return;

  const oldRoleId = getRoleId(oldRank.discordRoleEnvKey);
  const newRoleId = getRoleId(newRank.discordRoleEnvKey);

  try {
    // Alle bisherigen Rang-Rollen entfernen (sicherheitshalber alle bekannten)
    const allRoleIds = [...new Set(RANKS.map(r => getRoleId(r.discordRoleEnvKey)).filter(Boolean))] as string[];
    const removeTargets = allRoleIds.filter(id => id !== newRoleId);
    await Promise.allSettled(
      removeTargets.map(roleId =>
        discordRequest("DELETE", `/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`)
      )
    );

    // Neue Rolle hinzufügen
    if (newRoleId) {
      await discordRequest("PUT", `/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}/roles/${newRoleId}`);
    }
  } catch {
    // Niemals die App-Logik durch Discord-Fehler blockieren
  }
}

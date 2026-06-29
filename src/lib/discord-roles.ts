import { RANKS, getRank } from "./ranks";

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

/** Weist einem User seine aktuelle Rang-Rolle zu – gibt Discord-Antwort zurück. */
export async function assignCurrentRole(
  discordId: string,
  rankPoints: number,
): Promise<{ ok: boolean; discordStatus?: number; discordBody?: unknown; error?: string }> {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId || !process.env.DISCORD_BOT_TOKEN) {
    return { ok: false, error: "DISCORD_GUILD_ID oder DISCORD_BOT_TOKEN fehlt" };
  }

  const rank      = getRank(rankPoints);
  const newRoleId = getRoleId(rank.discordRoleEnvKey);

  if (!newRoleId) {
    return { ok: false, error: `Env-Variable ${rank.discordRoleEnvKey} nicht gesetzt` };
  }

  // Alle anderen Rang-Rollen entfernen
  const allRoleIds = [...new Set(RANKS.map(r => getRoleId(r.discordRoleEnvKey)).filter(Boolean))] as string[];
  const removeTargets = allRoleIds.filter(id => id !== newRoleId);
  await Promise.allSettled(
    removeTargets.map(roleId =>
      discordRequest("DELETE", `/guilds/${guildId}/members/${discordId}/roles/${roleId}`)
    )
  );

  // Neue Rolle vergeben
  const result = await discordRequest("PUT", `/guilds/${guildId}/members/${discordId}/roles/${newRoleId}`);

  // 204 = Erfolg, 200 = auch OK (bereits vorhanden)
  const ok = result.status === 204 || result.status === 200;
  return { ok, discordStatus: result.status, discordBody: result.body };
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

  if (oldRank.discordRoleEnvKey === newRank.discordRoleEnvKey) return;

  try {
    await assignCurrentRole(discordId, newPoints);
  } catch {
    // Niemals die App-Logik durch Discord-Fehler blockieren
  }
}

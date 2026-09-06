import { RANKS, getRank, getRankFullLabel } from "./ranks";
import { rankMedal } from "./rank-art";
import { rankUpColor } from "./discord-colors";
import { dispatchNotification } from "./notify-dispatch";

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

/** Weist einem User seine aktuelle Rang-Rolle zu – gibt Discord-Antwort zurück.
 *  @param removeOthers  false = nur neue Rolle hinzufügen, keine DELETEs (schnell, für initialen Bulk-Sync)
 */
export async function assignCurrentRole(
  discordId: string,
  rankPoints: number,
  removeOthers = true,
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

  // Alte Rang-Rollen entfernen – nur wenn gewünscht (nicht beim initialen Bulk-Sync)
  if (removeOthers) {
    const allRoleIds = [...new Set(RANKS.map(r => getRoleId(r.discordRoleEnvKey)).filter(Boolean))] as string[];
    const removeTargets = allRoleIds.filter(id => id !== newRoleId);
    await Promise.allSettled(
      removeTargets.map(roleId =>
        discordRequest("DELETE", `/guilds/${guildId}/members/${discordId}/roles/${roleId}`)
      )
    );
  }

  // Neue Rolle vergeben
  const result = await discordRequest("PUT", `/guilds/${guildId}/members/${discordId}/roles/${newRoleId}`);

  const ok = result.status === 204 || result.status === 200;
  return { ok, discordStatus: result.status, discordBody: result.body };
}

// ── Community-Job-Rollen ─────────────────────────────────────────────────────
// Löst die alte Rang-Rollen-Synchronisation ab (siehe Plan-Abschnitt
// "Discord-Anbindung"): Discord-Rollen basieren jetzt auf dem aktiven
// Community-Job statt auf dem Rang. Arbeitslose User bekommen keine Rolle.

const COMMUNITY_JOB_ROLE_ENV_KEYS: Record<string, string> = {
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

/**
 * Benachrichtigt einen User, wenn sich sein Rang geändert hat.
 *
 * Setzt seit der Community-Job-Umstellung KEINE Discord-Rolle mehr (siehe Plan
 * "Discord-Anbindung": Rang-Rollen-System abgeschafft, Rollen basieren jetzt auf
 * dem aktiven Community-Job, siehe syncCommunityJobDiscordRole oben) — Name
 * bewusst beibehalten, um die bestehenden Aufrufstellen (points.ts, Admin-
 * Punktekorrektur) nicht anfassen zu müssen.
 */
export async function syncDiscordRole(
  userId: string,
  discordId: string | null | undefined,
  oldPoints: number,
  newPoints: number,
): Promise<void> {
  const oldRank = getRank(oldPoints);
  const newRank = getRank(newPoints);
  if (oldRank.discordRoleEnvKey === newRank.discordRoleEnvKey) return;

  if (newRank.min > oldRank.min) {
    // Discord-Embeds brauchen eine öffentlich erreichbare Bild-URL (kein
    // data:-URI wie beim Scheduled-Event-Cover) — /ranks/rank-N.png ist unter
    // der App-Domain bereits genau das.
    const base  = process.env.NEXTAUTH_URL ?? "https://oma-app.de";
    const medal = rankMedal(newRank.tier);

    dispatchNotification("rank_up", {
      users: [userId],
      placeholders: {
        "{username}": discordId ? `<@${discordId}>` : "Du",
        "{rank}":     getRankFullLabel(newRank),
        "{rankEmoji}": newRank.emoji,
      },
      discordColor: rankUpColor(newRank.tier),
      ...(medal && { discordThumbnail: `${base}${medal}` }),
    }).catch(() => {});
  }
}

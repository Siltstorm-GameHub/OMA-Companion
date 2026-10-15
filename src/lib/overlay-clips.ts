import { prisma } from "@/lib/prisma";
import { getBroadcasterClips, getTwitchGameNames, getTwitchUsers } from "@/lib/twitch";
import { sameGame } from "@/lib/game-match";
import { createCache, getCommunityLive } from "@/lib/overlay-state";
import type { ClipSource, OverlayClip } from "@/components/overlay/types";

/**
 * Community-Clip-Loop der OBS-Overlays (Szenen intro/clips/outro des festen Streamer-Links).
 *
 * Die Clips bleiben bei Twitch und laufen im Overlay über den offiziellen Clip-Player (Einbettung
 * ist von Twitch ausdrücklich vorgesehen) — es wird nichts heruntergeladen oder neu geschnitten.
 * Im Pool landen alle Community-Kanäle außer denen, deren Inhaber sich abgemeldet haben
 * (User.overlayClipsOptOut), abzüglich der Clips, die der Inhaber selbst oder Moderatoren
 * ausgeschlossen haben (OverlayClipBlock).
 *
 * Last: Twitch wird pro Kanal höchstens alle CHANNEL_TTL_MS gefragt, der zusammengesetzte Pool
 * ist für alle Overlays derselbe.
 */

const CHANNEL_TTL_MS = 30 * 60_000;
const POOL_TTL_MS = 10 * 60_000;
const BLOCKS_TTL_MS = 30_000;
const LOOKBACK_DAYS = 90;
const CLIPS_PER_CHANNEL = 25;
const RECENT_DAYS = 30;
/** Höchstens so viele Clips je Overlay-Abruf — reicht für weit über eine Stunde Loop. */
const LOOP_LIMIT = 40;
/** Quelle "all": alle Clips des Pools, nur gegen extreme Mengen gedeckelt (Overlay mischt selbst). */
const ALL_LIMIT = 300;
/** Ab so vielen passenden Clips zeigt die Quelle "game" nur das aktuelle Spiel. */
const GAME_MIN_CLIPS = 3;

type ChannelClips = OverlayClip[];

const channelCache = createCache<ChannelClips>();
const poolCache = createCache<OverlayClip[]>();
const blockCache = createCache<Set<string>>();
const broadcasterIdCache = new Map<string, string>();

/** Clips eines Kanals der letzten LOOKBACK_DAYS Tage, unabhängig von Zustimmung und Sperren. */
export function getChannelClips(login: string): Promise<ChannelClips> {
  const key = login.toLowerCase();
  return channelCache.get(key, CHANNEL_TTL_MS, async () => {
    let id = broadcasterIdCache.get(key);
    if (!id) {
      const [user] = await getTwitchUsers([key]).catch(() => []);
      if (!user) return [];
      id = user.id;
      broadcasterIdCache.set(key, id);
    }
    const raw = await getBroadcasterClips(id, new Date(Date.now() - LOOKBACK_DAYS * 86400_000), CLIPS_PER_CHANNEL);
    const games = await getTwitchGameNames(raw.map(c => c.game_id));
    return raw.map(c => ({
      id: c.id,
      title: c.title,
      channel: c.broadcaster_name,
      channelLogin: key,
      creator: c.creator_name,
      durationSec: Math.max(5, Math.min(90, Math.round(c.duration || 30))),
      views: c.view_count,
      game: games.get(c.game_id) ?? null,
      createdAt: c.created_at,
      thumbnailUrl: c.thumbnail_url,
    }));
  });
}

/** Alle Clips aller zustimmenden Community-Kanäle — inkl. gesperrter (die filtert der Aufrufer). */
export function getClipPool(): Promise<OverlayClip[]> {
  return poolCache.get("all", POOL_TTL_MS, async () => {
    const users = await prisma.user.findMany({
      where: { overlayClipsOptOut: false, twitchLogin: { not: null }, leftServerAt: null },
      select: { twitchLogin: true },
    });
    // Twitch-User-IDs gebündelt vorab auflösen, statt einzeln je Kanal.
    const logins = users.map(u => u.twitchLogin!.toLowerCase());
    const missing = logins.filter(l => !broadcasterIdCache.has(l));
    if (missing.length) {
      for (const u of await getTwitchUsers(missing).catch(() => [])) broadcasterIdCache.set(u.login.toLowerCase(), u.id);
    }
    const perChannel = await Promise.all(logins.map(l => getChannelClips(l).catch(() => [])));
    return perChannel.flat();
  });
}

export function getBlockedClipIds(): Promise<Set<string>> {
  return blockCache.get("all", BLOCKS_TTL_MS, async () => {
    const rows = await prisma.overlayClipBlock.findMany({ select: { clipId: true } });
    return new Set(rows.map(r => r.clipId));
  });
}

/** Nach Zustimmung oder Sperre: nächster Abruf baut Pool bzw. Sperrliste neu. */
export function invalidateClipPool() { poolCache.delete("all"); }
export function invalidateClipBlocks() { blockCache.delete("all"); }

/**
 * Clips für den Loop eines Streamers:
 *   - all:    alle freigegebenen Clips (Standard),
 *   - top:    meistgesehene der letzten 90 Tage,
 *   - recent: neueste (letzte 30 Tage, sonst die neuesten überhaupt),
 *   - game:   passend zum Spiel, das der Streamer gerade auf Twitch spielt — zu wenige oder nicht
 *             live → wie "top".
 * Die Reihenfolge mischt das Overlay selbst (jede OBS-Quelle anders).
 */
export async function getOverlayClips(userId: string, source: ClipSource): Promise<OverlayClip[]> {
  const [pool, blocked] = await Promise.all([getClipPool(), getBlockedClipIds()]);
  const clips = pool.filter(c => !blocked.has(c.id));
  const byViews = () => [...clips].sort((a, b) => b.views - a.views);

  if (source === "all") return clips.slice(0, ALL_LIMIT);
  if (source === "recent") {
    const sorted = [...clips].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const since = new Date(Date.now() - RECENT_DAYS * 86400_000).toISOString();
    const fresh = sorted.filter(c => c.createdAt >= since);
    return (fresh.length >= GAME_MIN_CLIPS ? fresh : sorted).slice(0, LOOP_LIMIT);
  }
  if (source === "game") {
    const game = (await getCommunityLive()).get(userId)?.game;
    if (game) {
      const matching = byViews().filter(c => c.game && sameGame(c.game, game));
      if (matching.length >= GAME_MIN_CLIPS) return matching.slice(0, LOOP_LIMIT);
    }
  }
  return byViews().slice(0, LOOP_LIMIT);
}

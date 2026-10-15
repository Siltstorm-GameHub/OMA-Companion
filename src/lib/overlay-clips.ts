import { prisma } from "@/lib/prisma";
import { getBroadcasterClips, getChannelInfos, getTwitchGameNames, getTwitchUsers } from "@/lib/twitch";
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
 * Alters-Hinweis: Clips mit Inhaltskennzeichnung zeigt der Twitch-Player erst nach einem Klick —
 * im Loop wäre nur der Hinweis zu sehen. Twitch nennt die Kennzeichnung nicht je Clip, deshalb:
 *   - Kanäle mit eigener Kennzeichnung (z.B. "ProfanityVulgarity") fallen ganz heraus,
 *   - Spiele ab 18 (automatische Kennzeichnung "MatureGame", sobald ein Community-Kanal sie
 *     streamt) werden in OverlayMatureGame gemerkt; Moderatoren können Spiele auch selbst sperren.
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
/** Automatische Twitch-Kennzeichnung für Spiele ab 18 — betrifft nur Clips dieses Spiels. */
const MATURE_GAME_LABEL = "MatureGame";

type ClipPool = {
  clips: OverlayClip[];
  /** Kanäle mit eigener Inhaltskennzeichnung (login → Kennzeichnungen) — ihre Clips fallen heraus. */
  labelledChannels: Map<string, string[]>;
};

/** Warum ein Clip nicht im Loop läuft (null = läuft). */
export type ClipRestriction = "blocked" | "channel" | "game" | null;

const channelCache = createCache<OverlayClip[]>();
const poolCache = createCache<ClipPool>();
const blockCache = createCache<Set<string>>();
const matureCache = createCache<Map<string, { name: string; source: string }>>();
const broadcasterIdCache = new Map<string, string>();

/** Clips eines Kanals der letzten LOOKBACK_DAYS Tage, unabhängig von Zustimmung und Sperren. */
export function getChannelClips(login: string): Promise<OverlayClip[]> {
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
      gameId: c.game_id || null,
      createdAt: c.created_at,
      thumbnailUrl: c.thumbnail_url,
    }));
  });
}

/** Alle Clips aller teilnehmenden Community-Kanäle — inkl. gesperrter (die filtert der Aufrufer). */
function getClipPool(): Promise<ClipPool> {
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
    const [perChannel, infos] = await Promise.all([
      Promise.all(logins.map(l => getChannelClips(l).catch(() => []))),
      getChannelInfos(logins.map(l => broadcasterIdCache.get(l)!).filter(Boolean)),
    ]);

    const labelledChannels = new Map<string, string[]>();
    const matureGames: { gameId: string; name: string }[] = [];
    for (const info of infos) {
      const labels = info.content_classification_labels ?? [];
      const own = labels.filter(l => l !== MATURE_GAME_LABEL);
      if (own.length) labelledChannels.set(info.broadcaster_login.toLowerCase(), own);
      if (labels.includes(MATURE_GAME_LABEL) && info.game_id) matureGames.push({ gameId: info.game_id, name: info.game_name });
    }
    if (matureGames.length) await rememberMatureGames(matureGames);

    return { clips: perChannel.flat(), labelledChannels };
  });
}

/** Neu erkannte Spiele ab 18 merken (bestehende Einträge, auch von Moderatoren, bleiben unverändert). */
async function rememberMatureGames(games: { gameId: string; name: string }[]) {
  const known = await getMatureGames();
  const fresh = games.filter(g => !known.has(g.gameId));
  if (!fresh.length) return;
  await prisma.overlayMatureGame.createMany({
    data: fresh.map(g => ({ gameId: g.gameId, name: g.name, source: "twitch" })),
    skipDuplicates: true,
  }).catch(() => {});
  matureCache.delete("all");
}

export function getBlockedClipIds(): Promise<Set<string>> {
  return blockCache.get("all", BLOCKS_TTL_MS, async () => {
    const rows = await prisma.overlayClipBlock.findMany({ select: { clipId: true } });
    return new Set(rows.map(r => r.clipId));
  });
}

export function getMatureGames(): Promise<Map<string, { name: string; source: string }>> {
  return matureCache.get("all", BLOCKS_TTL_MS, async () => {
    const rows = await prisma.overlayMatureGame.findMany({ select: { gameId: true, name: true, source: true } });
    return new Map(rows.map(r => [r.gameId, { name: r.name, source: r.source }]));
  });
}

/** Nach Zustimmung oder Sperre: nächster Abruf baut Pool bzw. Sperrlisten neu. */
export function invalidateClipPool() { poolCache.delete("all"); }
export function invalidateClipBlocks() { blockCache.delete("all"); }
export function invalidateMatureGames() { matureCache.delete("all"); }

/** Alle Clips mit dem Grund, warum sie (nicht) im Loop laufen — für Admin- und Profilseite. */
export async function getClipPoolWithRestrictions(): Promise<{
  clips: (OverlayClip & { restriction: ClipRestriction })[];
  labelledChannels: { login: string; labels: string[] }[];
}> {
  const [pool, blocked, mature] = await Promise.all([getClipPool(), getBlockedClipIds(), getMatureGames()]);
  return {
    clips: pool.clips.map(c => ({ ...c, restriction: restrictionOf(c, pool, blocked, mature) })),
    labelledChannels: [...pool.labelledChannels].map(([login, labels]) => ({ login, labels })),
  };
}

/** Restriktion eines einzelnen Clips (z.B. für die eigenen Clips auf der Profilseite). */
export async function getClipRestrictions(clips: OverlayClip[]): Promise<Map<string, ClipRestriction>> {
  const [pool, blocked, mature] = await Promise.all([getClipPool(), getBlockedClipIds(), getMatureGames()]);
  return new Map(clips.map(c => [c.id, restrictionOf(c, pool, blocked, mature)]));
}

function restrictionOf(clip: OverlayClip, pool: ClipPool, blocked: Set<string>, mature: Map<string, unknown>): ClipRestriction {
  if (blocked.has(clip.id)) return "blocked";
  if (pool.labelledChannels.has(clip.channelLogin)) return "channel";
  if (clip.gameId && mature.has(clip.gameId)) return "game";
  return null;
}

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
  const [pool, blocked, mature] = await Promise.all([getClipPool(), getBlockedClipIds(), getMatureGames()]);
  const clips = pool.clips.filter(c => restrictionOf(c, pool, blocked, mature) === null);
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

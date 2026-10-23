import { prisma } from "@/lib/prisma";
import { createCache, getCommunityLive } from "@/lib/overlay-state";
import { runningEventWhere } from "@/lib/overlay-active-event";
import { groupBySameGame } from "@/lib/watch-together-groups";

/**
 * "Zusammen ansehen" (/zusammen) — bis zu 4 Streams von Community-Mitgliedern gleichzeitig.
 * Gezeigt werden nur Twitch-Kanäle von Community-Mitgliedern (keine beliebigen Kanäle unter
 * OMA-Flagge). Die Live-Daten kommen aus dem gemeinsamen Cache von getCommunityLive (max. 1
 * Twitch-Abfrage pro Minute und Server-Prozess) — die Seite ist öffentlich und darf nichts kosten.
 */

export const MAX_WATCH_CHANNELS = 4;

export type WatchMember = {
  userId: string;
  name: string;
  image: string | null;
  twitchLogin: string;
  live: boolean;
  game: string | null;
  title: string | null;
  viewers: number;
};

export type WatchGroup = { key: string; label: string; game: string | null; members: WatchMember[] };

export type UserRow = { id: string; name: string | null; username: string | null; image: string | null; twitchLogin: string | null };

export async function toMembers(users: UserRow[]): Promise<WatchMember[]> {
  const live = await getCommunityLive();
  return users
    .filter(u => u.twitchLogin)
    .map(u => {
      const l = live.get(u.id);
      return {
        userId: u.id,
        name: u.username ?? u.name ?? u.twitchLogin!,
        image: u.image,
        twitchLogin: u.twitchLogin!.toLowerCase(),
        live: !!l,
        game: l?.game || null,
        title: l?.title || null,
        viewers: l?.viewers ?? 0,
      };
    });
}

export const memberSelect = { id: true, name: true, username: true, image: true, twitchLogin: true } as const;

/** Kanäle aus der URL (?c=a,b) — nur Community-Mitglieder, Reihenfolge wie angefragt, max. 4. */
export async function resolveWatchChannels(logins: string[]): Promise<WatchMember[]> {
  const wanted = [...new Set(logins.map(l => l.trim().toLowerCase()).filter(l => /^[a-z0-9_]{2,25}$/.test(l)))].slice(0, MAX_WATCH_CHANNELS);
  if (wanted.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { leftServerAt: null, OR: wanted.map(l => ({ twitchLogin: { equals: l, mode: "insensitive" as const } })) },
    select: memberSelect,
  });
  const members = await toMembers(users);
  return wanted.map(l => members.find(m => m.twitchLogin === l)).filter((m): m is WatchMember => !!m);
}

/** Alle streamenden Beteiligten eines Events (angemeldete Streamer, Spieler, Turnier-/Team-Mitglieder). */
export async function resolveEventWatch(eventId: string): Promise<{ title: string; game: string | null; members: WatchMember[] } | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, hidden: false },
    select: {
      title: true, game: true,
      communityStreamers: { select: { user: { select: memberSelect } } },
      registrations: { where: { role: { not: "spectator" } }, select: { user: { select: memberSelect } } },
      participants: { select: { user: { select: memberSelect } } },
      teams: { select: { members: { select: { user: { select: memberSelect } } } } },
    },
  });
  if (!event) return null;
  const users = new Map<string, UserRow>();
  for (const u of [
    ...event.communityStreamers.map(r => r.user), ...event.registrations.map(r => r.user),
    ...event.participants.map(r => r.user), ...event.teams.flatMap(t => t.members.map(m => m.user)),
  ]) users.set(u.id, u);
  // Live zuerst, dann nach Zuschauern — die ersten 4 Live-Kanäle landen im Raster.
  const members = (await toMembers([...users.values()])).sort((a, b) => Number(b.live) - Number(a.live) || b.viewers - a.viewers);
  return { title: event.title, game: event.game, members };
}

/**
 * Übersicht für /zusammen und das Dashboard:
 *   - auto:   Live-Mitglieder, die dasselbe Spiel streamen (ab 2, max. 4 je Gruppe),
 *   - events: laufende Events mit mindestens 2 live streamenden Beteiligten,
 *   - live:   alle Live-Mitglieder (zum Selbst-Zusammenstellen).
 */
export type WatchOverview = { auto: WatchGroup[]; events: WatchGroup[]; live: WatchMember[]; sessions?: WatchGroup[] };
const overviewCache = createCache<WatchOverview>();
const OVERVIEW_TTL_MS = 60_000;

export function getWatchOverview(): Promise<WatchOverview> {
  return overviewCache.get("all", OVERVIEW_TTL_MS, loadWatchOverview);
}

async function loadWatchOverview(): Promise<WatchOverview> {
  const liveMap = await getCommunityLive();
  const live: WatchMember[] = [...liveMap.values()]
    .map(l => ({ userId: l.userId, name: l.name, image: l.image, twitchLogin: l.twitchLogin.toLowerCase(), live: true, game: l.game || null, title: l.title || null, viewers: l.viewers }))
    .sort((a, b) => b.viewers - a.viewers);

  const auto: WatchGroup[] = groupBySameGame(live)
    .filter(g => g.length >= 2)
    .map(g => g.slice(0, MAX_WATCH_CHANNELS))
    .map(members => ({ key: `auto:${members.map(m => m.twitchLogin).join(",")}`, label: members[0].game ?? "Gemeinsam live", game: members[0].game, members }));

  const events: WatchGroup[] = [];
  if (live.length >= 2) {
    const running = await prisma.event.findMany({
      where: { ...runningEventWhere(Date.now()), hidden: false },
      select: { id: true },
      take: 10,
    });
    for (const e of running) {
      const watch = await resolveEventWatch(e.id);
      const liveMembers = watch?.members.filter(m => m.live) ?? [];
      if (watch && liveMembers.length >= 2) {
        events.push({ key: `event:${e.id}`, label: watch.title, game: watch.game, members: liveMembers.slice(0, MAX_WATCH_CHANNELS) });
      }
    }
  }
  return { auto, events, live };
}

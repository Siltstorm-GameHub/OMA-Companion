import { prisma } from "@/lib/prisma";
import { computeEventPoints, type StatConfig } from "@/lib/series-event-points";
import { loadSeriesRanking } from "@/lib/seriesRanking";
import { getGameCoverUrl } from "@/lib/game-cover";
import { getLiveStreamsForLogins } from "@/lib/twitch";
import { getScopeTitle } from "@/lib/wanderpocal";
import { sameGame } from "@/lib/game-match";
import {
  ELEMENT_KEYS,
  type EventOverlayState, type OverlayStreamer, type ProfileOverlayState, type ElementKey, type SeriesTable,
  type StreamerOverlayPayload, type CommunityItem, type LiveMember, type UpcomingEvent, type OverlayControl,
  PROFILE_ELEMENT_KEYS, type ProfileElementKey,
} from "@/components/overlay/types";
import {
  parseStreamerConfig, defaultStreamerEventLayout, defaultProfileLayout, adaptEventLayout, parseOverlayControl as parseUserControl, activeZoom,
  type StreamerOverlayConfig,
} from "@/components/overlay/layout";
import { defaultPauseLayout, defaultClipLayout } from "@/components/overlay/sceneLayouts";
import { EMPTY_CONTROL } from "@/components/overlay/layout";
import { buildDemoEventState, type DemoFormat } from "@/lib/overlay-demo";
import { chooseActiveEvent, rankActiveEvents, runningEventWhere } from "@/lib/overlay-active-event";

/**
 * Datenquelle aller OBS-Overlays (Event-, Profil- und Streamer-Stream sowie der Startzustand
 * beim Seitenaufbau).
 *
 * Kosten-Hintergrund: Jede offene OBS-Quelle hält einen SSE-Stream offen, der regelmäßig nach
 * Änderungen fragt. Früher lud jeder Stream jede Sekunde den kompletten Event-Baum samt
 * Gesamttabelle der Reihe — obwohl sich die Daten nur bei einem eingetragenen Ergebnis ändern.
 * Jetzt:
 *   1. Ein einzelner, billiger Fingerprint (md5 über die relevanten Zeilen, in der DB berechnet)
 *      entscheidet, ob überhaupt neu geladen werden muss.
 *   2. Alle Streams desselben Server-Prozesses teilen sich einen Cache je Event/User — drei
 *      Streamer mit demselben Event erzeugen dieselbe Last wie einer.
 *   3. Gleichzeitige Anfragen auf denselben Schlüssel werden zusammengelegt (in-flight).
 *   4. Als Sicherheitsnetz wird spätestens nach FULL_RELOAD_MS komplett neu geladen (fängt
 *      Änderungen ab, die der Fingerprint bewusst nicht abdeckt, z.B. Avatar/Name eines Users).
 */

const FINGERPRINT_TTL_MS = 1500;
const FULL_RELOAD_MS = 60_000;
const SERIES_TTL_MS = 30_000;
const PROFILE_TTL_MS = 30_000;
const UPCOMING_TTL_MS = 60_000;
const STREAMER_TTL_MS = 60_000;
const STREAMER_CONFIG_TTL_MS = 2000;
const ACTIVE_EVENT_TTL_MS = 15_000;
const TWITCH_LIVE_TTL_MS = 60_000;
const COMMUNITY_TTL_MS = 60_000;

/** Einfacher TTL-Cache mit Zusammenlegung paralleler Ladevorgänge. */
export function createCache<T>() {
  const values = new Map<string, { value: T; at: number }>();
  const pending = new Map<string, Promise<T>>();
  return {
    peek: (key: string) => values.get(key),
    set: (key: string, value: T) => values.set(key, { value, at: Date.now() }),
    delete: (key: string) => values.delete(key),
    async get(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
      const hit = values.get(key);
      if (hit && Date.now() - hit.at < ttlMs) return hit.value;
      const running = pending.get(key);
      if (running) return running;
      const p = load()
        .then(value => { values.set(key, { value, at: Date.now() }); return value; })
        .finally(() => pending.delete(key));
      pending.set(key, p);
      return p;
    },
  };
}

/** JSON-Rundreise: Date → ISO-String, damit Stream-Payload und Startzustand der Seite exakt
 *  dieselbe Form haben (die Client-Typen erwarten Strings). */
const plain = <T,>(v: unknown): T => JSON.parse(JSON.stringify(v)) as T;

// ── Event ─────────────────────────────────────────────────────────────────────

/** Alles, was das Event-Overlay anzeigt, als ein md5 — eine Abfrage, ein kurzer String zurück. */
async function eventFingerprint(eventId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ fp: string | null; exists: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM "Event" WHERE id = ${eventId}) AS "exists", md5(
      coalesce((SELECT row(e.title, e.status, e.format, e."tournamentStatus", e.game, e."statFields", e."completionData", e."statConfigJson", e."overlayControlJson", e."seriesId")::text FROM "Event" e WHERE e.id = ${eventId}), '')
      || '|' || coalesce((SELECT string_agg(row(m.id, m.round, m.position, m.title, m."player1Id", m."player2Id", m."winnerId", m.score1, m.score2, m."playedAt")::text, ',' ORDER BY m.id) FROM "Match" m WHERE m."eventId" = ${eventId}), '')
      || '|' || coalesce((SELECT string_agg(row(x.id, x."userId", x."teamId", x.placement, x.score, x."statsJson")::text, ',' ORDER BY x.id) FROM "MatchEntry" x JOIN "Match" m ON m.id = x."matchId" WHERE m."eventId" = ${eventId}), '')
      || '|' || coalesce((SELECT string_agg(row(r."userId", r.role)::text, ',' ORDER BY r."userId") FROM "EventRegistration" r WHERE r."eventId" = ${eventId}), '')
      || '|' || coalesce((SELECT string_agg(p."userId", ',' ORDER BY p."userId") FROM "TournamentParticipant" p WHERE p."eventId" = ${eventId}), '')
    ) AS fp`;
  const row = rows[0];
  return row?.exists ? row.fp : null;
}

/** Sicherer Default, falls overlayControlJson fehlt/leer/kaputt ist — Overlay verhält sich dann
 *  exakt wie vor Einführung der Live-Steuerung (siehe Feldkommentar in schema.prisma). */
function parseOverlayControl(raw: string | null): EventOverlayState["control"] {
  if (!raw) return { hidden: [], zoom: null };
  try {
    const parsed = JSON.parse(raw);
    const isKey = (k: unknown): k is ElementKey => typeof k === "string" && (ELEMENT_KEYS as string[]).includes(k);
    return {
      hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter(isKey) : [],
      zoom: isKey(parsed.zoom) ? parsed.zoom : null,
    };
  } catch {
    return { hidden: [], zoom: null };
  }
}

const seriesCache = createCache<SeriesTable | null>();

type EventStateWithoutStreamer = Omit<EventOverlayState, "streamer">;

async function loadEventOverlayState(eventId: string): Promise<{ state: EventStateWithoutStreamer; seriesId: string | null } | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, status: true, format: true, tournamentStatus: true, game: true, statFields: true,
      completionData: true, statConfigJson: true, overlayControlJson: true, seriesId: true,
      series: { select: { seriesStatConfig: true } },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        select: {
          id: true, round: true, position: true, title: true,
          player1Id: true, player2Id: true, winnerId: true, score1: true, score2: true, playedAt: true,
          groupIndex: true, isThirdPlace: true, leg: true,
          entries: { select: { id: true, userId: true, teamId: true, placement: true, score: true, statsJson: true } },
        },
      },
      participants: {
        select: { userId: true, user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
      },
      // Alle Rollen: Zuschauer zählen für die Ligapunkte (Teilnahmepunkte), nicht aber als Teilnehmer.
      registrations: {
        select: { userId: true, role: true, user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
      },
    },
  });
  if (!event) return null;

  // Nicht jedes Event legt TournamentParticipant-Zeilen an — Matches können auch auf User
  // verweisen, die nur über EventRegistration angemeldet sind (siehe tournament/[id]/page.tsx,
  // mergedParticipants). Ohne diesen Merge blieben deren Namen im Overlay ein "?".
  const seen = new Set(event.participants.map(p => p.userId));
  const participants = [
    ...event.participants,
    ...event.registrations.filter(r => r.role !== "spectator" && !seen.has(r.userId)).map(r => ({ userId: r.userId, user: r.user })),
  ];

  // Ligapunkte, die dieses Event je Spieler zur Eventreihe beisteuert — identische Berechnung
  // wie in der Gesamttabelle der Eventreihe (siehe tournament/[id]/page.tsx). Leer, solange das
  // Event keiner Reihe angehört oder die Spielphase noch nicht abgeschlossen ist.
  let ligaPunkteByUser: Record<string, number> = {};
  if (event.series?.seriesStatConfig) {
    let cfg: StatConfig;
    try { cfg = JSON.parse(event.series.seriesStatConfig); } catch { cfg = { participationPoints: 0, stats: [] }; }
    ligaPunkteByUser = computeEventPoints(
      {
        completionData: event.completionData,
        registrations: event.registrations.map(r => ({ userId: r.userId, role: r.role })),
        matches: event.matches.map(m => ({ entries: m.entries.map(e => ({ userId: e.userId, statsJson: e.statsJson })) })),
      },
      cfg,
    ).pointsByUser;
  }

  // Gesamttabelle der Eventreihe — über loadSeriesRanking() (dieselbe Funktion wie das
  // Widget-Ranking), damit hier keine zweite Punkteberechnung entsteht. Teuer (lädt alle Events
  // der Reihe), daher eigener Cache; bei einer Änderung an DIESEM Event wird er vorher verworfen.
  const seriesTable = event.seriesId
    ? await seriesCache.get(event.seriesId, SERIES_TTL_MS, () => loadSeriesRanking(event.seriesId!).catch(() => null))
    : null;

  const state = plain<EventStateWithoutStreamer>({
    id: event.id, title: event.title, status: event.status, format: event.format,
    tournamentStatus: event.tournamentStatus, game: event.game, statFields: event.statFields,
    matches: event.matches, participants, ligaPunkteByUser, seriesTable,
    control: parseOverlayControl(event.overlayControlJson),
  });
  return { state, seriesId: event.seriesId };
}

type EventEntry = { value: EventStateWithoutStreamer | null; fp: string | null; loadedAt: number; checkedAt: number; seriesId: string | null };
const eventEntries = new Map<string, EventEntry>();
const eventPending = new Map<string, Promise<EventEntry>>();

/**
 * Event-Overlay-Zustand (ohne Streamer-Daten). Höchstens alle FINGERPRINT_TTL_MS eine
 * Fingerprint-Abfrage je Event und Server-Prozess, den vollen Ladevorgang nur bei Änderung.
 */
export async function getEventOverlayState(eventId: string): Promise<EventStateWithoutStreamer | null> {
  const cached = eventEntries.get(eventId);
  if (cached && Date.now() - cached.checkedAt < FINGERPRINT_TTL_MS) return cached.value;

  let running = eventPending.get(eventId);
  if (!running) {
    running = (async (): Promise<EventEntry> => {
      const now = Date.now();
      const fp = await eventFingerprint(eventId);
      if (cached && cached.fp === fp && now - cached.loadedAt < FULL_RELOAD_MS) {
        cached.checkedAt = now;
        return cached;
      }
      // Ergebnis/Anmeldung an diesem Event geändert → die Gesamttabelle der Reihe ändert sich mit.
      if (cached?.seriesId && cached.fp !== fp) seriesCache.delete(cached.seriesId);
      const loaded = fp === null ? null : await loadEventOverlayState(eventId);
      const entry: EventEntry = { value: loaded?.state ?? null, fp, loadedAt: now, checkedAt: now, seriesId: loaded?.seriesId ?? null };
      eventEntries.set(eventId, entry);
      return entry;
    })().finally(() => eventPending.delete(eventId));
    eventPending.set(eventId, running);
  }
  return (await running).value;
}

// ── Twitch-Live-Status der Community ─────────────────────────────────────────

const liveCache = createCache<Map<string, LiveMember>>();

/**
 * Wer aus der Community streamt gerade? Ein gemeinsamer Abruf für alle Overlays (Twitch-API,
 * höchstens einmal pro Minute und Server-Prozess). Schlüssel = User-ID. Ohne Twitch-Zugang
 * (lokal) oder bei Fehlern leer — das Overlay fällt dann einfach auf "nicht live" zurück.
 */
export function getCommunityLive(): Promise<Map<string, LiveMember>> {
  return liveCache.get("all", TWITCH_LIVE_TTL_MS, async () => {
    const users = await prisma.user.findMany({
      where: { twitchLogin: { not: null }, leftServerAt: null },
      select: { id: true, name: true, username: true, image: true, twitchLogin: true },
    });
    const byLogin = new Map(users.map(u => [u.twitchLogin!.toLowerCase(), u]));
    const streams = await getLiveStreamsForLogins([...byLogin.keys()]);
    const live = new Map<string, LiveMember>();
    for (const s of streams) {
      const u = byLogin.get(s.user_login.toLowerCase());
      if (!u) continue;
      live.set(u.id, {
        userId: u.id, name: u.username ?? u.name ?? s.user_name, image: u.image,
        twitchLogin: u.twitchLogin!, game: s.game_name, viewers: s.viewer_count, title: s.title,
      });
    }
    return live;
  });
}

// ── Community-Highlights (Clip des Monats, Tagesumfrage, Wanderpokal) ────────

const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const communityCache = createCache<CommunityItem[]>();

/** Inhalte der Community-Kachel — für alle Overlays gleich, daher ein gemeinsamer Eintrag. */
function getCommunityHighlights(): Promise<CommunityItem[]> {
  return communityCache.get("all", COMMUNITY_TTL_MS, async () => {
    const now = new Date();
    const [contest, poll, holders] = await Promise.all([
      prisma.monthlyClipContest.findFirst({
        where: { status: "finished" },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { month: true, winnerNominationIds: true },
      }),
      // Laufende Tagesumfrage, oder eine seit höchstens einem Tag beendete (dann mit Endergebnis).
      prisma.dailyPoll.findFirst({
        where: { isActive: true, startDate: { lte: now }, endDate: { gte: new Date(now.getTime() - 24 * 3600_000) } },
        orderBy: { createdAt: "desc" },
        select: {
          question: true, endDate: true,
          options: { orderBy: { order: "asc" }, select: { id: true, label: true } },
          votes: { select: { optionIds: true } },
        },
      }),
      prisma.wanderpocalHolder.findMany({
        orderBy: { winCount: "desc" },
        take: 3,
        select: { scopeType: true, scopeValue: true, winCount: true, user: { select: { name: true, username: true, image: true } } },
      }),
    ]);

    const items: CommunityItem[] = [];

    const winnerId = contest?.winnerNominationIds[0];
    if (contest && winnerId) {
      const clip = await prisma.clipNomination.findUnique({
        where: { id: winnerId },
        select: { clipTitle: true, customTitle: true, thumbnailUrl: true, twitchCreatorLogin: true, submittedBy: { select: { name: true, username: true } } },
      });
      if (clip) {
        items.push({
          kind: "clip",
          label: `Clip des Monats · ${MONTHS[contest.month - 1] ?? ""}`.trim(),
          title: clip.customTitle ?? clip.clipTitle ?? "Clip",
          thumbnailUrl: clip.thumbnailUrl,
          by: clip.submittedBy?.username ?? clip.submittedBy?.name ?? clip.twitchCreatorLogin ?? null,
        });
      }
    }

    // Nur Umfragen mit festen Antworten — reine Freitext-/Spielvorschlag-Umfragen haben keine Optionen.
    if (poll && poll.options.length > 0) {
      const counts = new Map(poll.options.map(o => [o.id, 0]));
      for (const v of poll.votes) {
        let ids: string[] = [];
        try { ids = v.optionIds ? JSON.parse(v.optionIds) : []; } catch { /* ignore */ }
        for (const id of ids) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
      }
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      items.push({
        kind: "poll",
        question: poll.question,
        totalVotes: poll.votes.length,
        ended: poll.endDate.getTime() < now.getTime(),
        options: poll.options.slice(0, 4).map(o => ({ label: o.label, percent: total ? Math.round((counts.get(o.id)! / total) * 100) : 0 })),
      });
    }

    if (holders.length > 0) {
      items.push({
        kind: "wanderpokal",
        holders: holders.map(h => ({
          title: getScopeTitle(h.scopeType, h.scopeValue),
          name: h.user.username ?? h.user.name ?? "Unbekannt",
          image: h.user.image,
          winCount: h.winCount,
        })),
      });
    }
    return items;
  });
}

// ── Streamer / Profil ─────────────────────────────────────────────────────────

const streamerCache = createCache<OverlayStreamer | null>();

/** Profildaten für die Marken-/Flip-Kachel — ändern sich während eines Streams praktisch nie. */
export function getOverlayStreamer(userId: string): Promise<OverlayStreamer | null> {
  return streamerCache.get(userId, STREAMER_TTL_MS, () => prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, image: true, rankPoints: true, twitchLogin: true },
  }));
}

type UpcomingBase = Omit<UpcomingEvent, "matchesCurrentGame">;
const upcomingCache = createCache<UpcomingBase[]>();
const profileCache = createCache<ProfileOverlayState | null>();

/** Die nächsten Community-Events — für alle Profil-Overlays gleich, daher ein gemeinsamer Eintrag.
 *  Mehr als angezeigt, damit passende Events zum aktuellen Spiel nach vorn rücken können. */
function getUpcomingEvents() {
  return upcomingCache.get("all", UPCOMING_TTL_MS, async () => {
    const events = await prisma.event.findMany({
      where: { startAt: { gt: new Date() }, status: { notIn: ["finished", "closed"] }, hidden: false },
      orderBy: { startAt: "asc" },
      take: 12,
      select: { id: true, title: true, startAt: true, game: true, coverImageUrl: true },
    });
    return plain<UpcomingBase[]>(events.map(e => ({
      id: e.id, title: e.title, startAt: e.startAt, game: e.game,
      coverUrl: e.coverImageUrl ?? getGameCoverUrl(e.game),
    })));
  });
}

export function getProfileOverlayState(userId: string): Promise<ProfileOverlayState | null> {
  return profileCache.get(userId, PROFILE_TTL_MS, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, image: true, rankPoints: true, twitchLogin: true },
    });
    if (!user) return null;
    const [upcoming, live, community] = await Promise.all([getUpcomingEvents(), getCommunityLive(), getCommunityHighlights()]);

    // Passende Events zum gerade gestreamten Spiel zuerst, dann chronologisch.
    const currentGame = live.get(user.id)?.game || null;
    const upcomingEvents = upcoming
      .map(e => ({ ...e, matchesCurrentGame: !!(currentGame && e.game && sameGame(currentGame, e.game)) }))
      .sort((a, b) => Number(b.matchesCurrentGame) - Number(a.matchesCurrentGame))
      .slice(0, 3);

    // Raid-Tipps: andere live streamende Mitglieder, gleiches Spiel zuerst, dann nach Zuschauern.
    const sameAsMine = (m: LiveMember) => Number(!!currentGame && sameGame(currentGame, m.game));
    const liveMembers = [...live.values()]
      .filter(m => m.userId !== user.id)
      .sort((a, b) => sameAsMine(b) - sameAsMine(a) || b.viewers - a.viewers)
      .slice(0, 4);

    return {
      ...user,
      rankLabel: `${user.rankPoints.toLocaleString("de-DE")} Punkte`,
      currentGame,
      upcomingEvents,
      community,
      liveMembers,
    };
  });
}

/** Nach dem Speichern im Profil (Name, Twitch) sofort frische Daten statt bis zu einer Minute alte. */
export function invalidateOverlayUser(userId: string) {
  streamerCache.delete(userId);
  profileCache.delete(userId);
}

// ── Fester Streamer-Link ──────────────────────────────────────────────────────

const configCache = createCache<{ token: string | null; config: StreamerOverlayConfig; control: OverlayControl } | null>();

/** Token, gespeicherte Einstellungen und Live-Steuerung des Streamers — kurz gecacht, damit
 *  Änderungen binnen ~2s in OBS ankommen und ein neu erzeugter Token offene Streams beendet. */
export function getStreamerConfig(userId: string) {
  return configCache.get(userId, STREAMER_CONFIG_TTL_MS, async () => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { overlayToken: true, overlayLayoutJson: true, overlayControlJson: true } });
    if (!user) return null;
    return { token: user.overlayToken, config: parseStreamerConfig(user.overlayLayoutJson), control: parseUserControl(user.overlayControlJson) };
  });
}

export function invalidateStreamerConfig(userId: string) {
  configCache.delete(userId);
}

const activeEventCache = createCache<{ id: string; title: string }[]>();

/** Nach Streamer-An-/Abmeldung: Turniermodus sofort neu bewerten statt nach Ablauf des Caches. */
export function invalidateStreamerActiveEvent(userId: string) {
  activeEventCache.delete(userId);
}

/**
 * Welches Event streamt dieser User gerade? Welche Events zeitlich in Frage kommen, regelt
 * lib/overlay-active-event.ts (u.a. gestartete Turniere über tournamentStatus). Kandidaten sind
 * Events, bei denen er als Streamer angemeldet ist (EventCommunityStreamer) oder mitspielt
 * (Event-Anmeldung als Spieler, Turnier-Teilnehmer oder Team-Mitglied) — jeweils unabhängig davon,
 * ob er gerade live ist: Das Overlay sieht ohnehin nur, wer streamt, und so stimmt der Modus auch
 * schon beim Einrichten. Sortiert: das erste ist die automatische Wahl.
 */
export function getStreamerEventCandidates(userId: string): Promise<{ id: string; title: string }[]> {
  return activeEventCache.get(userId, ACTIVE_EVENT_TTL_MS, async () => {
    const now = Date.now();
    const event = runningEventWhere(now);
    const select = { event: { select: { id: true, title: true, status: true, tournamentStatus: true, startAt: true } } };
    const [streaming, registered, participant, teams] = await Promise.all([
      prisma.eventCommunityStreamer.findMany({ where: { userId, event }, select }),
      prisma.eventRegistration.findMany({ where: { userId, role: { not: "spectator" }, event }, select }),
      prisma.tournamentParticipant.findMany({ where: { userId, event }, select }),
      prisma.teamMember.findMany({ where: { userId, team: { event } }, select: { team: { select } } }),
    ]);
    const candidates = [...streaming, ...registered, ...participant, ...teams.map(t => t.team)].map(r => r.event);
    return rankActiveEvents(candidates, now).map(e => ({ id: e.id, title: e.title }));
  });
}

/** Event im Turniermodus: Wahl aus der Live-Steuerung (falls noch gültig), sonst automatisch.
 *  null → Profil-Modus. */
export async function getStreamerActiveEventId(userId: string, choice?: string | null): Promise<string | null> {
  const candidates = await getStreamerEventCandidates(userId);
  return chooseActiveEvent(candidates.map(c => c.id), choice);
}

/** Warum zeigt das Overlay keinen Turniermodus? Für Live-Steuerung und Einstellungen: gerade
 *  laufende Events, bei denen der User weder Streamer noch Spieler ist. */
export type EventModeReason = {
  running: { id: string; title: string }[];
};

export async function explainStreamerEventMode(userId: string): Promise<EventModeReason> {
  const now = Date.now();
  const [events] = await Promise.all([
    prisma.event.findMany({
      where: { ...runningEventWhere(now), hidden: false },
      orderBy: { startAt: "asc" },
      take: 5,
      select: {
        id: true, title: true,
        communityStreamers: { where: { userId }, select: { id: true } },
        registrations: { where: { userId, role: { not: "spectator" } }, select: { id: true } },
        participants: { where: { userId }, select: { id: true } },
        teams: { where: { members: { some: { userId } } }, select: { id: true } },
      },
    }),
  ]);
  return {
    running: events
      .filter(e => !e.communityStreamers.length && !e.registrations.length && !e.participants.length && !e.teams.length)
      .map(e => ({ id: e.id, title: e.title })),
  };
}

/** Komplette Payload des Streamer-Links — Event-Modus, wenn gerade ein Event gestreamt wird,
 *  sonst Profil-Modus. Ohne gespeichertes Layout greifen die Standard-Layouts. */
export type OverlayPreview = { mode: "event" | "profile"; demo: DemoFormat };

/**
 * `preview` (Layout-Vorschau in der App): erzwingt Turnier- bzw. Normal-Ansicht, ignoriert die
 * Live-Steuerung (Szene, Zoom, Ausblenden) und zeigt ohne laufendes Event ein Beispielturnier.
 */
export async function getStreamerOverlayPayload(
  userId: string, config: StreamerOverlayConfig, liveControl: OverlayControl, preview?: OverlayPreview,
): Promise<StreamerOverlayPayload | null> {
  const control = preview ? { ...EMPTY_CONTROL } : liveControl;
  // Vorschau: immer die automatische Wahl (unabhängig von der Event-Auswahl der Live-Steuerung).
  const [realEventId, streamer] = await Promise.all([
    getStreamerActiveEventId(userId, preview ? null : liveControl.eventChoice),
    getOverlayStreamer(userId),
  ]);
  if (!streamer) return null;
  const eventId = preview?.mode === "profile" ? null : realEventId;
  const common = {
    streamer, pauseText: config.pauseText, lite: config.lite, scene: control.scene, pauseBackground: config.pauseBackground,
    // In der Vorschau immer stumm — sonst spielt die Einstellungsseite Clips mit Ton ab.
    clips: preview ? { ...config.clips, muted: true } : config.clips,
    countdownUntil: control.countdownUntil, clipSkip: control.clipSkip,
    pauseLayout: config.pauseLayout ?? defaultPauseLayout(), clipLayout: config.clipLayout ?? defaultClipLayout(),
  };
  const zoom = activeZoom(control);

  if (preview?.mode === "event" && !eventId) {
    const demo = buildDemoEventState(streamer, preview.demo);
    return {
      mode: "event", eventId: "demo", event: demo,
      layout: adaptEventLayout(config.event ?? defaultStreamerEventLayout(), demo.format), ...common,
    };
  }

  if (eventId) {
    const event = await getEventOverlayState(eventId);
    if (event) {
      const base = config.event ?? defaultStreamerEventLayout();
      // Event-Steuerung (Touchscreen-Widget, gilt für alle Overlays des Events) + eigene Steuerung
      // des Streamers: ausgeblendet ist, was eine der beiden ausblendet; der eigene Zoom hat Vorrang.
      const isKey = (k: string): k is ElementKey => (ELEMENT_KEYS as string[]).includes(k);
      const mergedControl = preview ? { hidden: [], zoom: null } : {
        hidden: [...new Set([...event.control.hidden, ...control.hidden.filter(isKey)])],
        zoom: (zoom && isKey(zoom) ? zoom : null) ?? event.control.zoom,
      };
      return {
        mode: "event", eventId, event: { ...event, streamer, control: mergedControl },
        layout: adaptEventLayout(base, event.format), ...common,
      };
    }
  }

  const profile = await getProfileOverlayState(userId);
  if (!profile) return null;
  const isProfileKey = (k: string): k is ProfileElementKey => (PROFILE_ELEMENT_KEYS as string[]).includes(k);
  return {
    mode: "profile", profile, layout: config.profile ?? defaultProfileLayout(),
    profileControl: { hidden: control.hidden.filter(isProfileKey), zoom: zoom && isProfileKey(zoom) ? zoom : null },
    ...common,
  };
}

/** Kommende (oder seit < 24h laufende) Events, für die der User als Streamer angemeldet ist — für
 *  die Übersicht auf der Einstellungsseite ("erscheint automatisch, sobald es losgeht"). */
export async function getStreamerUpcomingEvents(userId: string) {
  const rows = await prisma.eventCommunityStreamer.findMany({
    where: { userId, event: { status: { notIn: ["finished", "closed"] }, startAt: { gte: new Date(Date.now() - 24 * 3600_000) } } },
    orderBy: { event: { startAt: "asc" } },
    take: 5,
    select: { event: { select: { id: true, title: true, startAt: true } } },
  });
  return rows.map(r => ({ id: r.event.id, title: r.event.title, startAt: r.event.startAt.toISOString() }));
}

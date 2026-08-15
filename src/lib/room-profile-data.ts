import type { WanderpocalHolder, WanderpocalStat, Pokal } from "@prisma/client";
import { prisma } from "./prisma";
import { getRankProgress, type RankEntry } from "./ranks";
import { computeBadges, type Badge } from "./badges";
import { parseFavoriteGames, type FavoriteGame } from "./favorite-games";
import { QUEST_TYPE_META, type QuestType } from "./quests";
import { getAvailableReviewYears } from "./year-review";
import { loadRoom } from "./room";
import { roomLevel } from "./room-layout";
import { getRoomItem } from "./room-items";
import {
  VITRINE_SLOT_RANGES, VITRINE_TOTAL_SLOTS, parseVitrineSlotsJson, parseSlotValue,
  type VitrineItem,
} from "./room-vitrine";

/** Präfix, mit dem BadgesSection Custom-Badges im Showcase markiert. */
const CUSTOM_BADGE_PREFIX = "custom:";

/**
 * Datenlader des Gaming-Zimmers.
 *
 * BEWUSST eigenständig: die alte Profilseite (src/app/(dashboard)/profile) hat
 * ihre eigenen Abfragen und wird nicht angefasst, weil sie später ersatzlos
 * gelöscht wird. Geteilt werden nur reine Lib-Funktionen (getRank,
 * computeBadges, parseFavoriteGames) — kein Seiten-Code.
 *
 * Die Aufteilung Core/Details spiegelt die Bühne wider: Core ist alles, was
 * ohne Interaktion sichtbar ist, Details liegen hinter dem Röhrenmonitor. So
 * lassen sich die Details später ohne Umbau lazy nachladen.
 */

// ── Core ─────────────────────────────────────────────────────────────────────

export interface RoomProfileCore {
  id:              string;
  displayName:     string;
  image:           string | null;
  bio:             string | null;
  createdAt:       Date;
  points:          number;
  rankPoints:      number;
  /** "TT-MM" fürs ProfileEditor-Formular, oder null. Nur für den eigenen User relevant. */
  birthday:        string | null;
  twitchLogin:     string | null;
  bannerUrl:       string | null;
  /** Jahre, für die ein Jahresrückblick existiert (leer = noch kein voller Monat dabei). */
  reviewYears:     number[];
  rank:            RankEntry;
  nextRank:        RankEntry | null;
  rankPct:         number;
  leaderboardRank: number;
  totalUsers:      number;
  eventCount:       number;
  eventWins:        number;
  pollMasterCount:  number;
  pokalCount:        number;
  badgeCount:        number;
  topGames:          string[];
  favoriteGames:     FavoriteGame[];
  vitrine: {
    /** Ein Eintrag je Vitrinen-Fach, index-gleich mit VITRINE_SLOT_RANGES
     *  (0..14) — `null` = Fach ist leer (nichts vorhanden oder bewusst
     *  freigelassen). Jedes Fach kann jeden der drei Typen zeigen, nicht nur
     *  den seiner Standard-Reihe (siehe room-vitrine.ts). */
    slots: (VitrineItem | null)[];
    /** Wie viele besessene Pokale/Wanderpokale/Abzeichen gerade in KEINEM
     *  Fach angezeigt werden — treibt den "+N"-Hinweis auf der Bühne. */
    hiddenCount: number;
    /** ISO-Zeitpunkt der letzten bewussten Fach-Änderung, oder `null`, wenn
     *  der User die Vitrine nie angefasst hat (reine Auto-Belegung). */
    updatedAt: string | null;
  };
}

/** Liest das Showcase-JSON defensiv aus — kaputte Daten dürfen die Seite nie kippen. */
function parseIdList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Siege aus dem finalRankingJson eines beendeten Events ableiten. */
function isWinner(finalRankingJson: string | null, userId: string): boolean {
  try {
    const ranking = JSON.parse(finalRankingJson ?? "[]");
    return Array.isArray(ranking) && ranking[0] === userId;
  } catch {
    return false;
  }
}

function isPollWinner(completionData: string | null, userId: string): boolean {
  try {
    const ids: string[] = (completionData ? JSON.parse(completionData) : {}).pollWinnerIds ?? [];
    return Array.isArray(ids) && ids.includes(userId);
  } catch {
    return false;
  }
}

export async function loadRoomProfileCore(userId: string): Promise<RoomProfileCore | null> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id: true, name: true, username: true, image: true, bio: true, createdAt: true,
      points: true, rankPoints: true, birthday: true, twitchLogin: true, bannerUrl: true,
      showcaseBadgesJson: true, favoriteGamesJson: true, vitrineSlotsJson: true, vitrineUpdatedAt: true,
    },
  });
  if (!user) return null;

  const now = new Date();
  // Abzeichen-Showcase mischt System-Keys und Custom-Badges — letztere sind
  // mit "custom:" präfixiert (siehe BadgesSection.tsx).
  const showcaseBadge = parseIdList(user.showcaseBadgesJson).slice(0, 3);

  const [
    eventCount, startedEvents, higherRanked, totalUsers,
    pokalCount, allPokale, systemBadgeCount, customBadgeCount,
    allCustomBadges, trophies, lulPollWins,
  ] = await Promise.all([
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.event.findMany({
      where:  { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { game: true, finalRankingJson: true, completionData: true },
    }),
    prisma.user.count({ where: { rankPoints: { gt: user.rankPoints } } }),
    prisma.user.count(),
    prisma.pokal.count({ where: { userId } }),
    // Eventreihen-Pokale (isSeries) zuerst, weil sie die selteneren/wertvolleren
    // sind — sonst verdrängt ein frischer Einzel-Pokal einen älteren
    // Serien-Pokal rein nach Datum aus der Standardbelegung. `take` ist eine
    // großzügige Obergrenze, kein Vitrinen-Limit — die Fächer wählen selbst
    // aus, was sie zeigen (siehe resolveVitrineSlots unten).
    prisma.pokal.findMany({
      where:   { userId },
      orderBy: [{ isSeries: "desc" }, { awardedAt: "desc" }],
      take:    100,
    }),
    prisma.userSystemBadge.count({ where: { userId } }),
    prisma.userCustomBadge.count({ where: { userId } }),
    prisma.userCustomBadge.findMany({
      where:   { userId },
      include: { badge: { select: { id: true, icon: true, name: true } } },
      orderBy: { earnedAt: "desc" },
    }),
    prisma.wanderpocalHolder.findMany({ where: { userId } }).catch(() => []),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }).catch(() => 0),
  ]);

  const eventWins       = startedEvents.filter(e => isWinner(e.finalRankingJson, userId)).length;
  const pollMasterCount = startedEvents.filter(e => isPollWinner(e.completionData, userId)).length + lulPollWins;

  const gameCounts = startedEvents.reduce<Record<string, number>>((acc, e) => {
    if (e.game) acc[e.game] = (acc[e.game] ?? 0) + 1;
    return acc;
  }, {});
  const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g);

  const { rank, next, pct } = getRankProgress(user.rankPoints);

  const systemBadges = computeBadges(
    { points: user.points, voiceHours: 0, messageCount: 0, eventCount, tournamentCount: 0,
      tournamentWins: 0, eventWins, mvpCount: pollMasterCount },
    new Set<string>(),
  );
  const earnedSystemBadges = systemBadges.filter(b => b.earned);

  const vitrine = resolveVitrineSlots({
    slotsJson:   user.vitrineSlotsJson,
    showcaseBadgeKeys: showcaseBadge,
    pokale:      allPokale,
    trophies,
    systemBadges: earnedSystemBadges,
    customBadges: allCustomBadges.map(uc => ({ ...uc.badge, earnedAt: uc.earnedAt })),
    updatedAt:   user.vitrineUpdatedAt,
  });

  return {
    id:              user.id,
    displayName:     user.username ?? user.name ?? "Unbekannt",
    image:           user.image,
    bio:             user.bio,
    createdAt:       user.createdAt,
    points:          user.points,
    rankPoints:      user.rankPoints,
    birthday: user.birthday
      ? `${String(user.birthday.getDate()).padStart(2, "0")}-${String(user.birthday.getMonth() + 1).padStart(2, "0")}`
      : null,
    twitchLogin: user.twitchLogin,
    bannerUrl:   user.bannerUrl,
    reviewYears: getAvailableReviewYears(user.createdAt),
    rank,
    nextRank:        next,
    rankPct:         pct,
    leaderboardRank: higherRanked + 1,
    totalUsers,
    eventCount,
    eventWins,
    pollMasterCount,
    pokalCount,
    badgeCount:        systemBadgeCount + customBadgeCount,
    topGames,
    favoriteGames:     parseFavoriteGames(user.favoriteGamesJson),
    vitrine,
  };
}

/**
 * Löst das Fächer-JSON zu 15 konkreten Vitrinen-Inhalten auf.
 *
 * Zwei Durchgänge: zuerst die vom User bewusst gesetzten Fächer (Auswahl
 * ODER explizit leer), danach füllt ein Cursor je Pool (Pokale/Trophäen/
 * Abzeichen) die restlichen, vom User nicht angefassten Fächer nach der
 * Standard-Reihenfolge auf — unter Auslassung bereits verbauter Stücke, damit
 * kein Pokal doppelt auftaucht, nur weil er sowohl von Hand als auch
 * automatisch einsortiert würde.
 */
function resolveVitrineSlots(input: {
  slotsJson: string | null;
  showcaseBadgeKeys: string[];
  pokale: Pokal[];
  trophies: WanderpocalHolder[];
  systemBadges: Badge[];
  customBadges: { id: string; icon: string; name: string; earnedAt: Date }[];
  updatedAt: Date | null;
}): RoomProfileCore["vitrine"] {
  const { slotsJson, showcaseBadgeKeys, pokale, trophies, systemBadges, customBadges, updatedAt } = input;

  const pokalById     = new Map(pokale.map(p => [p.id, p]));
  const trophyByKey   = new Map(trophies.map(t => [`${t.scopeType}:${t.scopeValue}`, t]));
  const systemById    = new Map(systemBadges.map(b => [b.id, b]));
  const customById    = new Map(customBadges.map(b => [b.id, b]));

  function toPokalItem(p: Pokal): VitrineItem {
    return { kind: "pokal", id: p.id, title: p.title, category: p.category, isSeries: p.isSeries, awardedAt: p.awardedAt.toISOString() };
  }
  function toTrophyItem(t: WanderpocalHolder): VitrineItem {
    return { kind: "trophy", scopeType: t.scopeType, scopeValue: t.scopeValue, heldSince: t.heldSince.toISOString(), winCount: t.winCount };
  }
  function toBadgeItem(key: string): VitrineItem | null {
    if (key.startsWith(CUSTOM_BADGE_PREFIX)) {
      const c = customById.get(key.slice(CUSTOM_BADGE_PREFIX.length));
      return c ? { kind: "badge", key, icon: c.icon, name: c.name, desc: "", earnedAt: c.earnedAt.toISOString(), custom: true } : null;
    }
    const s = systemById.get(key);
    return s ? { kind: "badge", key, icon: s.icon, name: s.name, desc: s.desc, earnedAt: null, custom: false } : null;
  }
  function resolveValue(value: string): VitrineItem | null {
    const parsed = parseSlotValue(value);
    if (!parsed) return null;
    if (parsed.kind === "pokal") {
      const p = pokalById.get(parsed.id);
      return p ? toPokalItem(p) : null;
    }
    if (parsed.kind === "trophy") {
      const t = trophyByKey.get(`${parsed.scopeType}:${parsed.scopeValue}`);
      return t ? toTrophyItem(t) : null;
    }
    return toBadgeItem(parsed.key);
  }

  const overrides = parseVitrineSlotsJson(slotsJson);
  const slots: (VitrineItem | null)[] = new Array(VITRINE_TOTAL_SLOTS).fill(null);
  const usedPokalIds   = new Set<string>();
  const usedTrophyKeys = new Set<string>();
  const usedBadgeKeys  = new Set<string>();

  function markUsed(item: VitrineItem) {
    if (item.kind === "pokal") usedPokalIds.add(item.id);
    else if (item.kind === "trophy") usedTrophyKeys.add(`${item.scopeType}:${item.scopeValue}`);
    else usedBadgeKeys.add(item.key);
  }

  // Durchgang 1: vom User gesetzte Fächer (Auswahl oder bewusst leer).
  for (const [idxStr, value] of Object.entries(overrides)) {
    const idx = Number(idxStr);
    if (value === null) continue; // bleibt leer, kein Auto-Fill
    const item = resolveValue(value);
    if (item) { slots[idx] = item; markUsed(item); }
  }

  // Durchgang 2: unangetastete Fächer je Reihe automatisch mit dem
  // Standard-Pool auffüllen (Reihenfolge wie vor der freien Belegung).
  let pokalCursor = 0;
  for (let i = VITRINE_SLOT_RANGES.pokale[0]; i < VITRINE_SLOT_RANGES.pokale[1]; i++) {
    if (i in overrides) continue;
    while (pokalCursor < pokale.length && usedPokalIds.has(pokale[pokalCursor].id)) pokalCursor++;
    if (pokalCursor >= pokale.length) break;
    const item = toPokalItem(pokale[pokalCursor]);
    slots[i] = item; markUsed(item); pokalCursor++;
  }

  let trophyCursor = 0;
  for (let i = VITRINE_SLOT_RANGES.trophies[0]; i < VITRINE_SLOT_RANGES.trophies[1]; i++) {
    if (i in overrides) continue;
    while (trophyCursor < trophies.length && usedTrophyKeys.has(`${trophies[trophyCursor].scopeType}:${trophies[trophyCursor].scopeValue}`)) trophyCursor++;
    if (trophyCursor >= trophies.length) break;
    const item = toTrophyItem(trophies[trophyCursor]);
    slots[i] = item; markUsed(item); trophyCursor++;
  }

  let badgeCursor = 0;
  for (let i = VITRINE_SLOT_RANGES.badges[0]; i < VITRINE_SLOT_RANGES.badges[1]; i++) {
    if (i in overrides) continue;
    while (badgeCursor < showcaseBadgeKeys.length && usedBadgeKeys.has(showcaseBadgeKeys[badgeCursor])) badgeCursor++;
    if (badgeCursor >= showcaseBadgeKeys.length) break;
    const item = toBadgeItem(showcaseBadgeKeys[badgeCursor]);
    badgeCursor++;
    if (item) { slots[i] = item; markUsed(item); }
  }

  const totalOwned = pokale.length + trophies.length + systemBadges.length + customBadges.length;
  const totalShown = usedPokalIds.size + usedTrophyKeys.size + usedBadgeKeys.size;
  const hiddenCount = Math.max(0, totalOwned - totalShown);

  return { slots, hiddenCount, updatedAt: updatedAt ? updatedAt.toISOString() : null };
}

// ── Details (hinter dem Röhrenmonitor) ───────────────────────────────────────

export interface RoomProfileDetails {
  voiceHours:   number;
  messageCount: number;
  coinsEarned:  number;
  coinsSpent:   number;
  events: {
    id: string; title: string; startAt: Date; game: string | null; placement: number | null;
  }[];
  tournaments: { id: string; title: string; wins: number; losses: number; finalRank: number | null; eliminated: boolean }[];
  /** Quest-Metadaten sind hier bereits aufgelöst, weil src/lib/quests.ts Prisma
   *  importiert und damit nicht in eine Client-Komponente gehört. */
  quests: {
    id: string; title: string; target: number; reward: number;
    current: number; completed: boolean; icon: string; bar: string;
  }[];
  /** Digitale Pokale (lösen die Collectibles als Vitrinen-Inhalt ab). */
  pokale: Pokal[];
  badges:       Badge[];
  customBadges: { id: string; icon: string; name: string; desc: string; category: string; earnedAt: string }[];
  showcaseBadgeKeys: string[];
  /** Volle Prisma-Zeilen, weil WanderpocalSection genau die erwartet. */
  trophies:     WanderpocalHolder[];
  trophyStats:  WanderpocalStat[];
  trophyRanks:  Record<string, number>;
}

export async function loadRoomProfileDetails(userId: string): Promise<RoomProfileDetails> {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const [
    user, eventRegs, startedEvents, tournaments, quests, pokale,
    systemBadgeKeys, customBadges, trophies, trophyStats,
    coinsEarnedAgg, coinsSpentAgg, eventCount, tournamentCount, lulPollWins, jobRow,
    room, upgradedRows,
  ] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: {
        points: true, voiceMinutesTotal: true, messagesTotal: true,
        showcaseBadgesJson: true,
      },
    }),
    prisma.eventRegistration.findMany({
      where:   { userId },
      include: { event: { select: { id: true, title: true, startAt: true, game: true, finalRankingJson: true } } },
      orderBy: { joinedAt: "desc" }, take: 5,
    }),
    prisma.event.findMany({
      where:  { startAt: { lte: now }, registrations: { some: { userId } } },
      select: { finalRankingJson: true, completionData: true },
    }),
    prisma.tournamentParticipant.findMany({
      where:   { userId },
      include: { event: { include: { matches: { where: { OR: [{ player1Id: userId }, { player2Id: userId }] } } } } },
      orderBy: { id: "desc" }, take: 10,
    }),
    prisma.quest.findMany({
      where:   { month, year },
      include: { progress: { where: { userId } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pokal.findMany({
      where:   { userId },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.userSystemBadge.findMany({ where: { userId }, select: { badgeKey: true } }),
    prisma.userCustomBadge.findMany({
      where:   { userId },
      include: { badge: { select: { id: true, icon: true, name: true, desc: true, category: true } } },
      orderBy: { earnedAt: "asc" },
    }),
    prisma.wanderpocalHolder.findMany({ where: { userId } }).catch(() => []),
    prisma.wanderpocalStat.findMany({ where: { userId } }).catch(() => []),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.pointTransaction.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.eventRegistration.count({ where: { userId } }),
    prisma.tournamentParticipant.count({ where: { userId } }),
    prisma.lulEntry.count({ where: { userId, communityChamp: true } }).catch(() => 0),
    prisma.userJob.findUnique({ where: { userId }, select: { totalEarned: true } }).catch(() => null),
    loadRoom(userId).catch(() => null),
    prisma.roomItem.findMany({ where: { userId, starter: false }, select: { itemKey: true } }).catch(() => []),
  ]);

  const voiceHours   = Math.floor((user?.voiceMinutesTotal ?? 0) / 60);
  const messageCount = user?.messagesTotal ?? 0;
  const eventWins    = startedEvents.filter(e => isWinner(e.finalRankingJson, userId)).length;
  const pollMaster   = startedEvents.filter(e => isPollWinner(e.completionData, userId)).length + lulPollWins;

  const badges = computeBadges(
    { points: user?.points ?? 0, voiceHours, messageCount, eventCount, tournamentCount,
      tournamentWins: 0, eventWins, mvpCount: pollMaster,
      jobCoinsEarned: jobRow?.totalEarned ?? 0,
      roomLevel: room ? roomLevel(room.placed) : 0,
      hasRoomUpgrade: upgradedRows.some(r => !!getRoomItem(r.itemKey)?.upgradeSlot),
      vitrineItemCount: pokale.length + trophies.length + systemBadgeKeys.length + customBadges.length },
    new Set(systemBadgeKeys.map(b => b.badgeKey)),
  );

  // Rang je Pokal-Scope: eine Abfrage pro Scope, aber parallel.
  const trophyRanks: Record<string, number> = {};
  await Promise.all(trophyStats.map(async stat => {
    const above = await prisma.wanderpocalStat.count({
      where: { scopeType: stat.scopeType, scopeValue: stat.scopeValue, winCount: { gt: stat.winCount } },
    });
    trophyRanks[`${stat.scopeType}:${stat.scopeValue}`] = above + 1;
  }));

  return {
    voiceHours,
    messageCount,
    coinsEarned: coinsEarnedAgg._sum.amount ?? 0,
    coinsSpent:  Math.abs(coinsSpentAgg._sum.amount ?? 0),
    events: eventRegs.map(reg => {
      let placement: number | null = null;
      try {
        const ranking: string[] = JSON.parse(reg.event.finalRankingJson ?? "[]");
        const idx = ranking.indexOf(userId);
        if (idx !== -1) placement = idx + 1;
      } catch { /* kaputtes JSON ignorieren */ }
      return {
        id: reg.event.id, title: reg.event.title, startAt: reg.event.startAt,
        game: reg.event.game, placement,
      };
    }),
    tournaments: tournaments.map(p => ({
      id:         p.event.id,
      title:      p.event.title,
      wins:       p.event.matches.filter(m => m.winnerId === userId).length,
      losses:     p.event.matches.filter(m => m.winnerId && m.winnerId !== userId).length,
      finalRank:  p.finalRank,
      eliminated: p.eliminated,
    })),
    quests: quests.map(q => {
      const meta = QUEST_TYPE_META[q.type as QuestType];
      return {
        id: q.id, title: q.title, target: q.target, reward: q.reward,
        current:   Math.min(q.progress[0]?.current ?? 0, q.target),
        completed: q.progress[0]?.completed ?? false,
        icon: meta?.icon ?? "📜",
        bar:  meta?.bar  ?? "from-teal-600 to-teal-400",
      };
    }),
    pokale,
    badges,
    customBadges: customBadges.map(uc => ({
      id: uc.badge.id, icon: uc.badge.icon, name: uc.badge.name,
      desc: uc.badge.desc, category: uc.badge.category,
      earnedAt: uc.earnedAt.toISOString(),
    })),
    showcaseBadgeKeys: parseIdList(user?.showcaseBadgesJson),
    trophies,
    trophyStats,
    trophyRanks,
  };
}

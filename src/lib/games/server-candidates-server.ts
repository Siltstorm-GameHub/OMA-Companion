/**
 * Community-Gameserver aus der Spieleliste — Datenbank-Logik (nur serverseitig).
 * Regeln, Score und Erkennung: server-candidates.ts.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotificationForUsers, prefAllows } from "@/lib/notifications";
import { sendPushToUsers } from "@/lib/push";
import { matchesGameName } from "./match";
import {
  autoServerValue, canMemberSetServer, candidateScore, isReadyForServer, isServerSource, mightBeServerGame,
  type ServerInterestLevel, type ServerSource,
} from "./server-candidates";

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };

export const SERVER_EDIT_FIELD = "serverCapable";

/** Ergänzungen (inkl. Server-Tauglichkeit) pro Mitglied und 24 h — wie bei den übrigen Angaben */
const DAILY_SERVER_EDIT_LIMIT = 30;

// ── Kandidaten ───────────────────────────────────────────────────────────────

export interface ServerCandidate {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  crossplay: boolean;
  platforms: string[];
  isFree: boolean | null;
  priceCents: number | null;
  priceCurrency: string | null;
  subscriptions: string[];
  source: ServerSource | null;
  inCount: number;
  wishCount: number;
  regular: number;
  casual: number;
  score: number;
  ready: boolean;
  myInterest: ServerInterestLevel | null;
  /** Die ersten Zugesagten (öffentlich, wie "Am Start") */
  people: { id: string; name: string; image: string | null }[];
}

async function interestCounts(gameIds: string[]) {
  if (gameIds.length === 0) return new Map<string, { regular: number; casual: number }>();
  const rows = await prisma.gameServerInterest.groupBy({
    by: ["gameId", "level"],
    where: { gameId: { in: gameIds }, user: { deletedAt: null } },
    _count: { _all: true },
  });
  const out = new Map<string, { regular: number; casual: number }>();
  for (const r of rows) {
    const e = out.get(r.gameId) ?? { regular: 0, casual: 0 };
    if (r.level === "regular") e.regular += r._count._all;
    else e.casual += r._count._all;
    out.set(r.gameId, e);
  }
  return out;
}

/** Server-taugliche, freigeschaltete Spiele, für die es noch keinen Server gibt — nach Score sortiert. */
export async function getServerCandidates(userId?: string): Promise<ServerCandidate[]> {
  const [games, servers] = await Promise.all([
    prisma.game.findMany({
      where: { status: "APPROVED", serverCapable: true },
      select: {
        id: true, slug: true, name: true, nameKey: true, aliases: true, coverUrl: true, minPlayers: true, maxPlayers: true,
        crossplay: true, platforms: true, isFree: true, priceCents: true, priceCurrency: true, subscriptions: true,
        serverSource: true, inCount: true, wishCount: true,
      },
    }),
    prisma.gameServer.findMany({ select: { game: true } }),
  ]);
  const open = games.filter(g => !servers.some(s => matchesGameName(g, s.game, true)));
  const ids = open.map(g => g.id);

  const [counts, mine, people] = await Promise.all([
    interestCounts(ids),
    userId
      ? prisma.gameServerInterest.findMany({ where: { userId, gameId: { in: ids } }, select: { gameId: true, level: true } })
      : Promise.resolve([]),
    prisma.gameServerInterest.findMany({
      where: { gameId: { in: ids }, user: { deletedAt: null } },
      orderBy: [{ level: "desc" }, { createdAt: "asc" }],
      select: { gameId: true, user: { select: { id: true, name: true, username: true, image: true } } },
    }),
  ]);
  const mineBy = new Map(mine.map(m => [m.gameId, m.level as ServerInterestLevel]));

  return open
    .map((g): ServerCandidate => {
      const c = counts.get(g.id) ?? { regular: 0, casual: 0 };
      return {
        id: g.id, slug: g.slug, name: g.name, coverUrl: g.coverUrl, minPlayers: g.minPlayers, maxPlayers: g.maxPlayers,
        crossplay: g.crossplay, platforms: g.platforms, isFree: g.isFree, priceCents: g.priceCents, priceCurrency: g.priceCurrency,
        subscriptions: g.subscriptions, source: isServerSource(g.serverSource) ? g.serverSource : null,
        inCount: g.inCount, wishCount: g.wishCount, regular: c.regular, casual: c.casual,
        score: candidateScore({ ...c, inCount: g.inCount, wishCount: g.wishCount }),
        ready: isReadyForServer(c),
        myInterest: mineBy.get(g.id) ?? null,
        people: people.filter(p => p.gameId === g.id).slice(0, 8)
          .map(p => ({ id: p.user.id, name: p.user.username ?? p.user.name ?? "Mitglied", image: p.user.image })),
      };
    })
    .sort((a, b) => Number(b.ready) - Number(a.ready) || b.score - a.score || a.name.localeCompare(b.name, "de"));
}

/** Kandidaten, die die Schwelle erreicht haben (Admin-Posteingang) */
export async function getReadyServerCandidates(): Promise<ServerCandidate[]> {
  return (await getServerCandidates()).filter(c => c.ready);
}

// ── Spielseite ───────────────────────────────────────────────────────────────

export interface GameServerFit {
  serverCapable: boolean | null;
  source: ServerSource | null;
  /** Schwaches Signal: Frage "Könnte das auf einen OMA-Server?" einblenden */
  mightBe: boolean;
  /** Darf der angemeldete User den Wert setzen bzw. ändern? */
  canEdit: boolean;
  /** Es gibt schon einen Server zum Spiel */
  hasServer: boolean;
  regular: number;
  casual: number;
  myInterest: ServerInterestLevel | null;
}

async function lastServerEdit(gameId: string) {
  return prisma.gameEdit.findFirst({
    where: { gameId, field: SERVER_EDIT_FIELD, revertedAt: null },
    orderBy: { createdAt: "desc" },
    select: { userId: true },
  });
}

export async function getGameServerFit(
  game: { id: string; name: string; nameKey: string; aliases: string[]; modes: string[]; maxPlayers: number | null; serverCapable: boolean | null; serverSource: string | null },
  user: { id: string; isModerator: boolean } | null,
): Promise<GameServerFit> {
  const [servers, counts, mine, last] = await Promise.all([
    prisma.gameServer.findMany({ select: { game: true } }),
    interestCounts([game.id]),
    user ? prisma.gameServerInterest.findUnique({ where: { userId_gameId: { userId: user.id, gameId: game.id } }, select: { level: true } }) : null,
    user && !user.isModerator ? lastServerEdit(game.id) : null,
  ]);
  const c = counts.get(game.id) ?? { regular: 0, casual: 0 };
  return {
    serverCapable: game.serverCapable,
    source: isServerSource(game.serverSource) ? game.serverSource : null,
    mightBe: game.serverCapable === null && mightBeServerGame(game),
    canEdit: !!user && (user.isModerator || canMemberSetServer(game, last?.userId === user.id)),
    hasServer: servers.some(s => matchesGameName(game, s.game, true)),
    regular: c.regular,
    casual: c.casual,
    myInterest: (mine?.level as ServerInterestLevel | undefined) ?? null,
  };
}

// ── Setzen ───────────────────────────────────────────────────────────────────

/** Server-Tauglichkeit setzen (Mitglied oder Team) — wird wie andere Ergänzungen protokolliert. */
export async function setServerCapable(
  user: { id: string; isModerator: boolean }, slug: string, value: boolean,
): Promise<Result<{ serverCapable: boolean; source: ServerSource }>> {
  const game = await prisma.game.findUnique({
    where: { slug }, select: { id: true, status: true, serverCapable: true, serverSource: true, updatedAt: true },
  });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };

  const source: ServerSource = user.isModerator ? "team" : "user";
  if (game.serverCapable === value && game.serverSource === source) return { ok: true, serverCapable: value, source };

  if (!user.isModerator) {
    const last = await lastServerEdit(game.id);
    if (!canMemberSetServer(game, last?.userId === user.id)) {
      return { ok: false, status: 403, error: "Das hat schon jemand eingetragen — Änderungen nimmt das Team vor." };
    }
    const recent = await prisma.gameEdit.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
    });
    if (recent >= DAILY_SERVER_EDIT_LIMIT) {
      return { ok: false, status: 429, error: "Für heute hast du genug ergänzt — danke! Morgen geht's weiter." };
    }
  }

  await prisma.$transaction([
    prisma.game.update({ where: { id: game.id, updatedAt: game.updatedAt }, data: { serverCapable: value, serverSource: source } }),
    prisma.gameEdit.create({
      data: {
        gameId: game.id, userId: user.id, field: SERVER_EDIT_FIELD,
        oldValue: { value: game.serverCapable, source: game.serverSource } as Prisma.InputJsonObject,
        newValue: { value, source } as Prisma.InputJsonObject,
      },
    }),
  ]).catch(err => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw new Error("Das Spiel wurde gerade geändert — bitte Seite neu laden.");
    }
    throw err;
  });
  return { ok: true, serverCapable: value, source };
}

/** Protokoll-Eintrag der Server-Tauglichkeit zurücksetzen (aus revertGameEdit). */
export async function revertServerEdit(edit: {
  id: string; gameId: string; newValue: Prisma.JsonValue; oldValue: Prisma.JsonValue;
  game: { serverCapable: boolean | null; serverSource: string | null };
}): Promise<Result<object>> {
  const next = parseServerEditValue(edit.newValue);
  if (edit.game.serverCapable !== next.value || edit.game.serverSource !== next.source) {
    return { ok: false, status: 409, error: "Der Wert wurde seitdem geändert — bitte direkt im Spiel bearbeiten." };
  }
  const prev = parseServerEditValue(edit.oldValue);
  await prisma.$transaction([
    prisma.game.update({ where: { id: edit.gameId }, data: { serverCapable: prev.value, serverSource: prev.source } }),
    prisma.gameEdit.update({ where: { id: edit.id }, data: { revertedAt: new Date() } }),
  ]);
  return { ok: true };
}

export function parseServerEditValue(v: Prisma.JsonValue): { value: boolean | null; source: string | null } {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    return { value: typeof o.value === "boolean" ? o.value : null, source: typeof o.source === "string" ? o.source : null };
  }
  return { value: null, source: null };
}

/** "Ich wäre dabei" setzen oder (level = null) zurückziehen — nur bei server-tauglichen Spielen. */
export async function setServerInterest(
  userId: string, slug: string, level: ServerInterestLevel | null,
): Promise<Result<{ level: ServerInterestLevel | null; regular: number; casual: number }>> {
  const game = await prisma.game.findUnique({ where: { slug }, select: { id: true, status: true, serverCapable: true } });
  if (!game || game.status !== "APPROVED") return { ok: false, status: 404, error: "Spiel nicht gefunden" };
  if (level && game.serverCapable !== true) {
    return { ok: false, status: 400, error: "Das Spiel ist (noch) nicht als server-tauglich markiert." };
  }
  if (level) {
    await prisma.gameServerInterest.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      create: { userId, gameId: game.id, level },
      update: { level },
    });
  } else {
    await prisma.gameServerInterest.deleteMany({ where: { userId, gameId: game.id } });
  }
  const c = (await interestCounts([game.id])).get(game.id) ?? { regular: 0, casual: 0 };
  return { ok: true, level, ...c };
}

// ── Automatische Erkennung (täglich, cron/game-list-sync) ────────────────────

/** Bekannte Server-Spiele markieren — nur, wo noch nichts eingetragen ist. */
export async function applyServerAutoDetection(): Promise<{ marked: number }> {
  const games = await prisma.game.findMany({
    where: { serverCapable: null, OR: [{ serverSource: null }, { serverSource: "auto" }] },
    select: { id: true, nameKey: true, aliases: true, serverCapable: true, serverSource: true },
  });
  const hits = games.filter(g => autoServerValue(g) === true).map(g => g.id);
  if (hits.length === 0) return { marked: 0 };
  const res = await prisma.game.updateMany({
    where: { id: { in: hits }, serverCapable: null },
    data: { serverCapable: true, serverSource: "auto" },
  });
  return { marked: res.count };
}

// ── Neuer Server ─────────────────────────────────────────────────────────────

/**
 * Ein Server zu einem Kandidaten ist online gegangen: Wer zugesagt hat, bekommt eine Bewerbung (bei
 * offenem Zugang keine nötig) und eine Benachrichtigung. Regelmäßige Zusagen zuerst; ist der Server voll,
 * landen die übrigen auf der Warteliste. Fehler hier dürfen das Anlegen des Servers nicht verhindern.
 */
export async function onServerCreated(server: { id: string; name: string; game: string; maxSlots: number; openAccess: boolean }): Promise<{ notified: number }> {
  const games = await prisma.game.findMany({
    where: { status: "APPROVED", serverCapable: true },
    select: { id: true, name: true, nameKey: true, aliases: true },
  });
  const game = games.find(g => matchesGameName(g, server.game, true));
  if (!game) return { notified: 0 };

  const interests = await prisma.gameServerInterest.findMany({
    where: { gameId: game.id, user: { deletedAt: null } },
    orderBy: [{ level: "desc" }, { createdAt: "asc" }], // "regular" vor "casual"
    select: { userId: true },
  });
  const userIds = interests.map(i => i.userId);
  if (userIds.length === 0) return { notified: 0 };

  if (!server.openAccess) {
    await prisma.serverApplication.createMany({
      data: userIds.map((userId, i) => ({
        serverId: server.id, userId,
        status: i < server.maxSlots ? "pending" : "waitlisted",
        message: "Automatisch angelegt: hat beim Server-Kandidaten „Ich wäre dabei“ gesagt.",
      })),
      skipDuplicates: true,
    });
  }

  const msg = {
    title: `Neuer OMA-Server: ${server.name}`,
    body: server.openAccess
      ? `Du wolltest bei ${game.name} dabei sein — die Zugangsdaten stehen für dich bereit.`
      : `Du wolltest bei ${game.name} dabei sein — deine Bewerbung ist angelegt, das Team schaltet dich frei.`,
    url: "/servers",
  };
  await createNotificationForUsers(userIds, { type: "server", ...msg });
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, notificationPrefs: true } });
  const eligible = users.filter(u => prefAllows(u.notificationPrefs, "server")).map(u => u.id);
  await sendPushToUsers(eligible, msg).catch(err => console.error("[servers] Push", err));
  return { notified: userIds.length };
}

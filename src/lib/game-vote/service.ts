/**
 * Spielwahl für Eventreihen — Datenbank-Teil (nur serverseitig). Regeln und Ablauf: rules.ts.
 *
 * Öffnen und Schließen laufen "lazy" über syncDueEventActivations (Home, Events, Eventseite, Admin) und
 * damit auch über den täglichen Cron event-reminders — wie der automatische Event-Start.
 */

import { prisma } from "@/lib/prisma";
import { COIN_PREFIX } from "@/lib/points";
import { dispatchNotification } from "@/lib/notify-dispatch";
import { ensurePlayerRegistration } from "@/lib/event-registration";
import { refreshEventAnnouncement } from "@/lib/discord-events";
import { VALID_FORMAT_VALUES } from "@/lib/tournament-formats";
import { matchesGameName } from "@/lib/games/match";
import { eventGenreForGame } from "@/lib/games/event-genre";
import { IN_WHERE } from "@/lib/games/service";
import { formatPrice, subscriptionBadges } from "@/lib/games/options";
import {
  buyHint, costRankOf, fitLabel, fitScore, fitsSeries, parseGameVoteConfig, rankCandidates, voteWindow,
  type FitInput,
} from "./rules";

/** Stammspieler: Mitspieler der letzten so vielen Termine der Reihe */
const REGULAR_EVENTS = 6;

type Result<T = object> = ({ ok: true } & T) | { ok: false; status: number; error: string };

// ── Hilfen ──────────────────────────────────────────────────────────────────────

/** Mitspieler der letzten Termine einer Reihe (ohne gelöschte Konten). */
async function seriesRegulars(seriesId: string, beforeEventId?: string): Promise<string[]> {
  const events = await prisma.event.findMany({
    where: { seriesId, ...(beforeEventId ? { id: { not: beforeEventId } } : {}), startAt: { lte: new Date() } },
    orderBy: { startAt: "desc" },
    take: REGULAR_EVENTS,
    select: { id: true },
  });
  if (events.length === 0) return [];
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: { in: events.map(e => e.id) }, role: "player", user: { deletedAt: null } },
    select: { userId: true },
  });
  return [...new Set(regs.map(r => r.userId))];
}

type GameRow = Awaited<ReturnType<typeof loadGames>>[number];
function loadGames(where: { id?: { in: string[] } } = {}) {
  return prisma.game.findMany({
    where: { status: "APPROVED", ...where },
    select: {
      id: true, name: true, nameKey: true, aliases: true, slug: true, coverUrl: true, modes: true, platforms: true, genres: true,
      minPlayers: true, maxPlayers: true, isFree: true, discountPercent: true, subscriptions: true, inCount: true, wishCount: true,
      priceCents: true, priceInitialCents: true, priceCurrency: true,
    },
  });
}

async function fitInputs(games: GameRow[], regulars: string[]): Promise<Map<string, FitInput>> {
  const reactions = regulars.length && games.length
    ? await prisma.gameReaction.findMany({
        where: { userId: { in: regulars }, gameId: { in: games.map(g => g.id) }, OR: [IN_WHERE, { status: "wish" }] },
        select: { gameId: true, status: true, owns: true, wantPlay: true },
      })
    : [];
  const out = new Map<string, FitInput>();
  for (const g of games) {
    const mine = reactions.filter(r => r.gameId === g.id);
    out.set(g.id, {
      regularsIn: mine.filter(r => r.status === "in" || (r.status === null && (r.owns || r.wantPlay))).length,
      regularsWish: mine.filter(r => r.status === "wish").length,
      regularsTotal: regulars.length,
      inCount: g.inCount, wishCount: g.wishCount, isFree: g.isFree, discountPercent: g.discountPercent, subscriptions: g.subscriptions,
    });
  }
  return out;
}

// ── Wahl anlegen ────────────────────────────────────────────────────────────────

/**
 * Spielwahl für einen (Platzhalter-)Termin anlegen: Zeitfenster aus den Reihen-Einstellungen, Kandidaten =
 * Platz 2/3 der Wahl des vorigen Termins + die besten passenden Spiele nach Passt-Wert. Die Spiele der
 * letzten N Termine sind ausgeschlossen. Öffnet sofort, wenn der Beginn erreicht ist.
 */
export async function createGameVote(eventId: string): Promise<Result<{ voteId: string; shortened: boolean }>> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, startAt: true, format: true, seriesId: true, gameVote: { select: { id: true } },
      series: { select: { id: true, gameVoteJson: true, fixedFormat: true, platform: true } },
    },
  });
  if (!event?.series || !event.seriesId) return { ok: false, status: 404, error: "Termin einer Eventreihe nicht gefunden" };
  if (event.gameVote) return { ok: false, status: 409, error: "Für diesen Termin läuft schon eine Spielwahl" };
  const cfg = parseGameVoteConfig(event.series.gameVoteJson);
  const now = new Date();
  if (event.startAt <= now) return { ok: false, status: 400, error: "Der Termin hat schon begonnen" };
  const { opensAt, closesAt, shortened } = voteWindow(event.startAt, now, cfg);

  const seriesInfo = { format: event.format ?? event.series.fixedFormat ?? null, platform: event.series.platform };
  const [games, regulars, recentEvents, previousVote] = await Promise.all([
    loadGames(),
    seriesRegulars(event.seriesId, event.id),
    prisma.event.findMany({
      where: { seriesId: event.seriesId, id: { not: event.id }, startAt: { lt: event.startAt }, game: { not: null } },
      orderBy: { startAt: "desc" },
      take: cfg.excludeLastN,
      select: { game: true },
    }),
    // Wahl des direkt vorigen Termins (für Platz 2/3)
    prisma.event.findFirst({
      where: { seriesId: event.seriesId, id: { not: event.id }, startAt: { lt: event.startAt } },
      orderBy: { startAt: "desc" },
      select: { gameVote: { select: { status: true, candidates: { where: { place: { in: [2, 3] } }, select: { gameId: true } } } } },
    }),
  ]);
  const recentNames = cfg.excludeLastN > 0 ? recentEvents.map(e => e.game!) : [];
  const fitting = games.filter(g => fitsSeries(g, seriesInfo) && !recentNames.some(n => matchesGameName(g, n)));
  const inputs = await fitInputs(fitting, regulars);
  const carryIds = new Set(
    previousVote?.gameVote?.status === "closed" ? previousVote.gameVote.candidates.map(c => c.gameId) : [],
  );
  const carry = fitting.filter(g => carryIds.has(g.id));
  const auto = fitting
    .filter(g => !carryIds.has(g.id))
    .sort((a, b) => fitScore(inputs.get(b.id)!) - fitScore(inputs.get(a.id)!) || b.inCount - a.inCount)
    .slice(0, Math.max(1, cfg.candidateCount - carry.length));

  const vote = await prisma.gameVote.create({
    data: {
      eventId: event.id, seriesId: event.seriesId, opensAt, closesAt, status: "prepared",
      candidates: {
        create: [
          ...carry.map(g => ({ gameId: g.id, origin: "carryover", fitScore: fitScore(inputs.get(g.id)!), fitLabel: fitLabel(inputs.get(g.id)!) || null })),
          ...auto.map(g => ({ gameId: g.id, origin: "auto", fitScore: fitScore(inputs.get(g.id)!), fitLabel: fitLabel(inputs.get(g.id)!) || null })),
        ],
      },
    },
    select: { id: true },
  });
  if (opensAt <= now) await openGameVote(vote.id);
  return { ok: true, voteId: vote.id, shortened };
}

// ── Kandidaten (Mods) ───────────────────────────────────────────────────────────

export async function addCandidate(voteId: string, gameId: string): Promise<Result> {
  const vote = await prisma.gameVote.findUnique({
    where: { id: voteId },
    select: { status: true, event: { select: { format: true } }, series: { select: { id: true, fixedFormat: true, platform: true } } },
  });
  if (!vote) return { ok: false, status: 404, error: "Spielwahl nicht gefunden" };
  if (vote.status === "closed") return { ok: false, status: 409, error: "Die Abstimmung ist schon beendet" };
  const [game] = await loadGames({ id: { in: [gameId] } });
  if (!game) return { ok: false, status: 404, error: "Spiel nicht in der Spieleliste" };
  if (!fitsSeries(game, { format: vote.event.format ?? vote.series.fixedFormat ?? null, platform: vote.series.platform })) {
    return { ok: false, status: 400, error: "Das Spiel passt nicht zur Reihe (Mehrspieler, PvP bei Turnieren, Plattform)" };
  }
  const regulars = await seriesRegulars(vote.series.id);
  const input = (await fitInputs([game], regulars)).get(game.id)!;
  try {
    await prisma.gameVoteCandidate.create({
      data: { voteId, gameId, origin: "mod", fitScore: fitScore(input), fitLabel: fitLabel(input) || null },
    });
  } catch {
    return { ok: false, status: 409, error: "Das Spiel ist schon Kandidat" };
  }
  return { ok: true };
}

/** Kandidat entfernen — seine Stimmen fallen mit weg. */
export async function removeCandidate(candidateId: string): Promise<Result> {
  const cand = await prisma.gameVoteCandidate.findUnique({ where: { id: candidateId }, select: { vote: { select: { status: true } } } });
  if (!cand) return { ok: false, status: 404, error: "Kandidat nicht gefunden" };
  if (cand.vote.status === "closed") return { ok: false, status: 409, error: "Die Abstimmung ist schon beendet" };
  await prisma.gameVoteCandidate.delete({ where: { id: candidateId } });
  return { ok: true };
}

// ── Öffnen ──────────────────────────────────────────────────────────────────────

async function openGameVote(voteId: string) {
  const changed = await prisma.gameVote.updateMany({ where: { id: voteId, status: "prepared" }, data: { status: "open" } });
  if (changed.count === 0) return;
  const vote = await prisma.gameVote.findUnique({
    where: { id: voteId },
    select: {
      closesAt: true, seriesId: true,
      event: { select: { id: true, title: true, hidden: true } },
      series: { select: { name: true, squadId: true, hidden: true } },
      candidates: { select: { game: { select: { name: true } } } },
    },
  });
  if (!vote || vote.event.hidden || vote.series.hidden) return;
  // Benachrichtigt werden Stammspieler der Reihe, bei Squad-Reihen das Squad
  const recipients = vote.series.squadId
    ? (await prisma.squadMembership.findMany({ where: { squadId: vote.series.squadId }, select: { userId: true } })).map(m => m.userId)
    : await seriesRegulars(vote.seriesId, vote.event.id);
  if (recipients.length === 0) return;
  await dispatchNotification("game_vote_open", {
    users: recipients,
    placeholders: {
      "{eventName}": vote.event.title,
      "{seriesName}": vote.series.name,
      "{games}": vote.candidates.map(c => c.game.name).join(", "),
      "{until}": berlinDateTime(vote.closesAt),
    },
    urlOverride: `/tournament/${vote.event.id}`,
  }).catch(err => console.error("[game-vote] Benachrichtigung Abstimmung offen", err));
}

const berlinDateTime = (d: Date) =>
  d.toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

// ── Abstimmen ───────────────────────────────────────────────────────────────────

/**
 * Stimme setzen bzw. korrigieren: candidateIds = alle Spiele, die man spielen würde (leer = keine).
 * Die erste Stimme meldet als Mitspieler an — ist das Event voll oder gesperrt, zählt die Stimme trotzdem.
 * Bei Squad-Reihen stimmt nur das Squad ab.
 */
export async function castBallot(
  userId: string, eventId: string, candidateIdsInput: unknown,
): Promise<Result<{ registration: "registered" | "already" | "none" | "full" | "locked" | "squad" | "closed"; candidateIds: string[] }>> {
  await syncGameVotes();
  const vote = await prisma.gameVote.findUnique({
    where: { eventId },
    select: { id: true, status: true, series: { select: { squadId: true } }, candidates: { select: { id: true } } },
  });
  if (!vote) return { ok: false, status: 404, error: "Für dieses Event gibt es keine Spielwahl" };
  if (vote.status === "prepared") return { ok: false, status: 409, error: "Die Abstimmung hat noch nicht begonnen" };
  if (vote.status === "closed") return { ok: false, status: 409, error: "Die Abstimmung ist schon beendet" };
  if (vote.series.squadId) {
    const member = await prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: vote.series.squadId, userId } } });
    if (!member) return { ok: false, status: 403, error: "Abstimmen dürfen nur Mitglieder des Squads dieser Reihe" };
  }
  const valid = new Set(vote.candidates.map(c => c.id));
  const ids = Array.isArray(candidateIdsInput) ? [...new Set(candidateIdsInput.filter((v): v is string => typeof v === "string" && valid.has(v)))] : [];

  const hadBallots = (await prisma.gameVoteBallot.count({ where: { voteId: vote.id, userId } })) > 0;
  await prisma.$transaction([
    prisma.gameVoteBallot.deleteMany({ where: { voteId: vote.id, userId } }),
    ...(ids.length ? [prisma.gameVoteBallot.createMany({ data: ids.map(candidateId => ({ voteId: vote.id, candidateId, userId })) })] : []),
  ]);

  // Erste Teilnahme → als Mitspieler anmelden. Später (auch nach Abmeldung) nicht erneut.
  let registration: "registered" | "already" | "none" | "full" | "locked" | "squad" | "closed" = "none";
  if (!hadBallots && ids.length > 0) {
    const reg = await ensurePlayerRegistration(userId, eventId);
    registration = reg.result === "blocked" ? reg.block.reason : reg.result;
  }
  return { ok: true, registration, candidateIds: ids };
}

// ── Schließen ───────────────────────────────────────────────────────────────────

/** Fällige Wahlen öffnen und schließen (lazy, siehe Kopfkommentar). */
export async function syncGameVotes(now = new Date()): Promise<void> {
  const [toOpen, toClose] = await Promise.all([
    prisma.gameVote.findMany({ where: { status: "prepared", opensAt: { lte: now }, closesAt: { gt: now } }, select: { id: true } }),
    prisma.gameVote.findMany({ where: { status: { in: ["prepared", "open"] }, closesAt: { lte: now } }, select: { id: true } }),
  ]);
  for (const v of toOpen) await openGameVote(v.id).catch(err => console.error("[game-vote] Öffnen", err));
  for (const v of toClose) await closeGameVote(v.id).catch(err => console.error("[game-vote] Schließen", err));
}

/**
 * Abstimmung auswerten: Spiel ins Event eintragen (mit Genre), Regeln zur Freigabe vorbelegen,
 * Platz 2/3 an die nächste Wahl der Reihe weitergeben, Münzen auszahlen, Discord-Ankündigung
 * aktualisieren, Ergebnis + Kauf-Hinweis an die Mitspieler und Regel-Aufgabe an die Mods.
 */
export async function closeGameVote(voteId: string): Promise<void> {
  // Nur einmal auswerten, auch wenn mehrere Aufrufe gleichzeitig kommen
  const claimed = await prisma.gameVote.updateMany({
    where: { id: voteId, status: { in: ["prepared", "open"] } },
    data: { status: "closed", closedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const vote = await prisma.gameVote.findUnique({
    where: { id: voteId },
    include: {
      event: { select: { id: true, title: true, format: true, startAt: true, seriesId: true } },
      series: { select: { id: true, name: true, gameVoteJson: true, gameRulesJson: true, fixedFormat: true, platform: true } },
      candidates: { include: { ballots: { select: { userId: true } } } },
    },
  });
  if (!vote || vote.candidates.length === 0) return;
  const cfg = parseGameVoteConfig(vote.series.gameVoteJson);
  const games = new Map((await loadGames({ id: { in: vote.candidates.map(c => c.gameId) } })).map(g => [g.id, g]));
  const seriesInfo = { format: vote.event.format ?? vote.series.fixedFormat ?? null, platform: vote.series.platform };

  // Wer es von den Abstimmenden schon "Am Start" hat (Gleichstand)
  const voterIds = [...new Set(vote.candidates.flatMap(c => c.ballots.map(b => b.userId)))];
  const inRows = voterIds.length
    ? await prisma.gameReaction.findMany({
        where: { userId: { in: voterIds }, gameId: { in: vote.candidates.map(c => c.gameId) }, ...IN_WHERE },
        select: { userId: true, gameId: true },
      })
    : [];

  const ranking = rankCandidates(vote.candidates.map(c => {
    const g = games.get(c.gameId);
    const voters = new Set(c.ballots.map(b => b.userId));
    return {
      id: c.id,
      approvals: c.ballots.length,
      votersIn: inRows.filter(r => r.gameId === c.gameId && voters.has(r.userId)).length,
      costRank: g ? costRankOf(g) : 2,
      fitScore: c.fitScore,
      eligible: !!g && fitsSeries(g, seriesInfo),
    };
  }));
  await prisma.$transaction(vote.candidates.map(c => prisma.gameVoteCandidate.update({
    where: { id: c.id },
    data: { approvals: c.ballots.length, place: ranking.find(r => r.id === c.id)?.place ?? null },
  })));
  const winnerCand = vote.candidates.find(c => c.id === ranking.find(r => r.place === 1)?.id);
  const winner = winnerCand ? games.get(winnerCand.gameId) ?? null : null;
  if (!winner) return; // kein wählbarer Kandidat — Mods tragen das Spiel von Hand ein

  await applyWinner(vote.event.id, vote.id, winner, vote.series.gameRulesJson);

  // Platz 2 und 3 → Kandidaten der nächsten Wahl der Reihe (falls schon angelegt; sonst holt createGameVote sie)
  const runnersUp = ranking.filter(r => r.place === 2 || r.place === 3)
    .map(r => vote.candidates.find(c => c.id === r.id)!.gameId);
  if (runnersUp.length > 0) {
    const next = await prisma.gameVote.findFirst({
      where: { seriesId: vote.series.id, status: { in: ["prepared", "open"] }, event: { startAt: { gt: vote.event.startAt } } },
      orderBy: { event: { startAt: "asc" } },
      select: { id: true, candidates: { select: { gameId: true, fitScore: true, fitLabel: true } } },
    });
    if (next) {
      const old = new Map(vote.candidates.map(c => [c.gameId, c]));
      await prisma.gameVoteCandidate.createMany({
        data: runnersUp.map(gameId => ({ voteId: next.id, gameId, origin: "carryover", fitScore: old.get(gameId)?.fitScore ?? 0, fitLabel: old.get(gameId)?.fitLabel ?? null })),
        skipDuplicates: true,
      });
    }
  }

  // Münzen fürs Abstimmen — nur an Abstimmende, die jetzt noch als Mitspieler angemeldet sind
  if (cfg.voteCoins > 0 && voterIds.length > 0) {
    const players = await prisma.eventRegistration.findMany({
      where: { eventId: vote.event.id, role: "player", userId: { in: voterIds } },
      select: { userId: true },
    });
    const reason = `${COIN_PREFIX} Spielwahl: ${vote.event.title}`;
    for (const { userId } of players) {
      const already = await prisma.pointTransaction.findFirst({ where: { userId, reason }, select: { id: true } });
      if (already) continue;
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { points: { increment: cfg.voteCoins } } }),
        prisma.pointTransaction.create({ data: { userId, amount: cfg.voteCoins, reason } }),
      ]);
    }
  }

  await notifyResult(vote.event.id, vote.event.title, winner).catch(err => console.error("[game-vote] Ergebnis-Benachrichtigung", err));
  await notifyModsRules(vote.event.id, vote.event.title, winner.name).catch(err => console.error("[game-vote] Mod-Hinweis", err));
}

/** Gewähltes Spiel eintragen und Regeln/Format zur Freigabe vorbelegen (aus dem Gedächtnis der Reihe). */
async function applyWinner(
  eventId: string, voteId: string, game: { id: string; name: string; genres: string[] }, gameRulesJson: string | null,
) {
  const remembered = parseGameRules(gameRulesJson)[game.id];
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { format: true } });
  await prisma.$transaction([
    prisma.gameVote.update({ where: { id: voteId }, data: { winnerGameId: game.id } }),
    prisma.event.update({
      where: { id: eventId },
      data: {
        game: game.name,
        genre: eventGenreForGame(game.genres) ?? undefined,
        gameRulesPending: true,
        ...(remembered?.rules !== undefined ? { rules: remembered.rules } : {}),
        ...(remembered?.format && event?.format && VALID_FORMAT_VALUES.includes(remembered.format) ? { format: remembered.format } : {}),
      },
    }),
  ]);
  await refreshEventAnnouncement(eventId).catch(err => console.error("[game-vote] Discord-Ankündigung aktualisieren", err));
}

// ── Regeln freigeben ────────────────────────────────────────────────────────────

export type GameRulesMemory = Record<string, { rules: string | null; format: string | null }>;

export function parseGameRules(json: string | null | undefined): GameRulesMemory {
  if (!json) return {};
  try {
    const raw = JSON.parse(json);
    return raw && typeof raw === "object" ? raw as GameRulesMemory : {};
  } catch {
    return {};
  }
}

/**
 * Mod gibt Spiel, Regeln und (bei Turnieren) Format frei. gameId darf ein anderer Kandidat sein (z.B. nach
 * einem knappen Ergebnis). Die Reihe merkt sich Regeln/Format für dieses Spiel als Vorbelegung.
 */
export async function confirmGameRules(
  eventId: string, input: { gameId?: unknown; rules?: unknown; format?: unknown },
): Promise<Result> {
  const vote = await prisma.gameVote.findUnique({
    where: { eventId },
    select: {
      id: true, status: true, winnerGameId: true, candidates: { select: { gameId: true } },
      event: { select: { format: true, seriesId: true } },
      series: { select: { id: true, gameRulesJson: true } },
    },
  });
  if (!vote) return { ok: false, status: 404, error: "Für dieses Event gibt es keine Spielwahl" };
  if (vote.status !== "closed") return { ok: false, status: 409, error: "Die Abstimmung läuft noch" };
  const gameId = typeof input.gameId === "string" ? input.gameId : vote.winnerGameId;
  if (!gameId || !vote.candidates.some(c => c.gameId === gameId)) return { ok: false, status: 400, error: "Bitte einen Kandidaten der Wahl wählen" };
  const [game] = await loadGames({ id: { in: [gameId] } });
  if (!game) return { ok: false, status: 404, error: "Das Spiel ist nicht (mehr) in der Spieleliste" };

  const rules = typeof input.rules === "string" ? input.rules.trim().slice(0, 10_000) || null : null;
  const format = vote.event.format && typeof input.format === "string" && VALID_FORMAT_VALUES.includes(input.format) ? input.format : vote.event.format;

  if (gameId !== vote.winnerGameId) await applyWinner(eventId, vote.id, game, null);
  await prisma.event.update({ where: { id: eventId }, data: { rules, format, gameRulesPending: false } });
  const memory = parseGameRules(vote.series.gameRulesJson);
  memory[gameId] = { rules, format: vote.event.format ? format : null };
  await prisma.eventSeries.update({ where: { id: vote.series.id }, data: { gameRulesJson: JSON.stringify(memory) } });
  return { ok: true };
}

/** Darf ausgelost werden? Nicht während der Spielwahl und nicht vor der Regel-Freigabe. */
export async function gameVoteDrawBlock(eventId: string): Promise<string | null> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { gameRulesPending: true, gameVote: { select: { status: true } } } });
  if (!event) return null;
  if (event.gameVote && event.gameVote.status !== "closed") return "Das Spiel wird noch gewählt — Auslosung erst nach der Abstimmung.";
  if (event.gameRulesPending) return "Regeln fürs gewählte Spiel sind noch nicht freigegeben (Eventseite → Spielwahl).";
  return null;
}

// ── Benachrichtigungen ──────────────────────────────────────────────────────────

/** Ergebnis an die Mitspieler — wer das Spiel noch nicht "Am Start" hat, bekommt den Kauf-Hinweis. */
async function notifyResult(eventId: string, eventTitle: string, game: GameRow) {
  const players = (await prisma.eventRegistration.findMany({ where: { eventId, role: "player" }, select: { userId: true } })).map(r => r.userId);
  if (players.length === 0) return;
  const have = new Set((await prisma.gameReaction.findMany({
    where: { gameId: game.id, userId: { in: players }, ...IN_WHERE }, select: { userId: true },
  })).map(r => r.userId));
  const hint = buyHint(buyInfoOf(game));
  const base = { "{eventName}": eventTitle, "{game}": game.name };
  const url = `/tournament/${eventId}`;
  const groups: [string[], string][] = [
    [players.filter(id => !have.has(id)), hint],
    [players.filter(id => have.has(id)), "Du hast es schon — bis dann!"],
  ];
  for (const [i, [users, text]] of groups.entries()) {
    if (users.length === 0) continue;
    // Kanal-Post (falls in der Regel aktiviert) nur einmal: mit dem Kauf-Hinweis
    await dispatchNotification("game_vote_result", {
      users, placeholders: { ...base, "{hint}": text }, urlOverride: url, skipDiscordChannel: i > 0,
    });
  }
}

export function buyInfoOf(g: Pick<GameRow, "isFree" | "subscriptions" | "priceCents" | "priceInitialCents" | "priceCurrency" | "discountPercent">) {
  return {
    isFree: g.isFree, subscriptions: g.subscriptions, subscriptionLabels: subscriptionBadges(g.subscriptions),
    priceLabel: formatPrice(g.priceCents, g.priceCurrency), initialPriceLabel: formatPrice(g.priceInitialCents, g.priceCurrency),
    discountPercent: g.discountPercent,
  };
}

async function notifyModsRules(eventId: string, eventTitle: string, gameName: string) {
  const mods = (await prisma.user.findMany({ where: { role: { in: ["moderator", "admin"] }, deletedAt: null }, select: { id: true } })).map(u => u.id);
  if (mods.length === 0) return;
  await dispatchNotification("game_vote_rules", {
    users: mods,
    placeholders: { "{eventName}": eventTitle, "{game}": gameName },
    urlOverride: `/tournament/${eventId}`,
    skipDiscordChannel: true,
  });
}

// ── Anzeige (Eventseite) ────────────────────────────────────────────────────────

export interface GameVoteCandidateView {
  id: string;
  gameId: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  origin: string;
  fitLabel: string | null;
  approvals: number;
  place: number | null;
  priceLabel: string | null;
  discountPercent: number;
  isFree: boolean | null;
  subscriptionLabels: string[];
}

export interface GameVoteView {
  id: string;
  status: "prepared" | "open" | "closed";
  opensAt: string;
  closesAt: string;
  winnerGameId: string | null;
  rulesPending: boolean;
  candidates: GameVoteCandidateView[];
  myCandidateIds: string[];
  voterCount: number;
  /** Darf der Betrachter abstimmen (eingeloggt, bei Squad-Reihen im Squad)? */
  canVote: boolean;
  squadName: string | null;
  voteCoins: number;
  /** Kauf-Hinweis zum gewählten Spiel, falls man angemeldet ist und es noch nicht "Am Start" hat */
  buyHint: string | null;
}

export async function getGameVoteView(eventId: string, userId: string | null): Promise<GameVoteView | null> {
  const vote = await prisma.gameVote.findUnique({
    where: { eventId },
    include: {
      event: { select: { gameRulesPending: true } },
      series: { select: { gameVoteJson: true, squadId: true, squad: { select: { name: true } } } },
      candidates: {
        include: {
          game: {
            select: {
              slug: true, name: true, coverUrl: true, isFree: true, discountPercent: true, subscriptions: true,
              priceCents: true, priceInitialCents: true, priceCurrency: true,
            },
          },
          _count: { select: { ballots: true } },
        },
      },
    },
  });
  if (!vote) return null;
  const [mine, voters, isSquadMember] = await Promise.all([
    userId ? prisma.gameVoteBallot.findMany({ where: { voteId: vote.id, userId }, select: { candidateId: true } }) : [],
    prisma.gameVoteBallot.findMany({ where: { voteId: vote.id }, select: { userId: true }, distinct: ["userId"] }),
    userId && vote.series.squadId
      ? prisma.squadMembership.findUnique({ where: { squadId_userId: { squadId: vote.series.squadId, userId } } }).then(Boolean)
      : Promise.resolve(true),
  ]);

  let hint: string | null = null;
  const winner = vote.candidates.find(c => c.gameId === vote.winnerGameId);
  if (userId && vote.status === "closed" && winner) {
    const [reg, has] = await Promise.all([
      prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId, eventId } }, select: { role: true } }),
      prisma.gameReaction.findFirst({ where: { userId, gameId: winner.gameId, ...IN_WHERE }, select: { gameId: true } }),
    ]);
    if (reg?.role === "player" && !has) hint = buyHint(buyInfoOf(winner.game));
  }

  const candidates = vote.candidates
    .map(c => ({
      id: c.id, gameId: c.gameId, slug: c.game.slug, name: c.game.name, coverUrl: c.game.coverUrl, origin: c.origin, fitLabel: c.fitLabel,
      approvals: c.approvals ?? c._count.ballots, place: c.place,
      priceLabel: formatPrice(c.game.priceCents, c.game.priceCurrency), discountPercent: c.game.discountPercent, isFree: c.game.isFree,
      subscriptionLabels: subscriptionBadges(c.game.subscriptions),
    }))
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || (a.origin === "carryover" ? -1 : 0) - (b.origin === "carryover" ? -1 : 0) || a.name.localeCompare(b.name, "de"));

  return {
    id: vote.id,
    status: vote.status as GameVoteView["status"],
    opensAt: vote.opensAt.toISOString(),
    closesAt: vote.closesAt.toISOString(),
    winnerGameId: vote.winnerGameId,
    rulesPending: vote.event.gameRulesPending,
    candidates,
    myCandidateIds: mine.map(m => m.candidateId),
    voterCount: voters.length,
    canVote: !!userId && isSquadMember,
    squadName: vote.series.squad?.name ?? null,
    voteCoins: parseGameVoteConfig(vote.series.gameVoteJson).voteCoins,
    buyHint: hint,
  };
}

/** Spiele, die Mods als Kandidaten hinzufügen können (passend zur Reihe, noch nicht dabei). */
export async function addableGames(eventId: string): Promise<{ id: string; name: string }[]> {
  const vote = await prisma.gameVote.findUnique({
    where: { eventId },
    select: { status: true, candidates: { select: { gameId: true } }, event: { select: { format: true } }, series: { select: { fixedFormat: true, platform: true } } },
  });
  if (!vote || vote.status === "closed") return [];
  const taken = new Set(vote.candidates.map(c => c.gameId));
  const info = { format: vote.event.format ?? vote.series.fixedFormat ?? null, platform: vote.series.platform };
  return (await loadGames())
    .filter(g => !taken.has(g.id) && fitsSeries(g, info))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .map(g => ({ id: g.id, name: g.name }));
}

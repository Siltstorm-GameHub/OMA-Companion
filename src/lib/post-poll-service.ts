import { prisma } from "./prisma";
import { COIN_PREFIX } from "./points";
import { dispatchNotification } from "./notify-dispatch";
import { startOfBerlinDay } from "./time";
import {
  POLL_KINDS, POLL_OPTIONS_MAX, POLL_OPTIONS_MIN, POLL_PARTICIPATION_MAX, POLL_CORRECT_MAX, POLL_QUESTION_MAX, POLL_OPTION_MAX,
  type PollInput,
} from "./post-poll";

/**
 * Umfragen in Beiträgen. Münzen zahlt das System — deshalb mit Schutz gegen Farming:
 *  - Ersteller und Teilnehmer: wer die Umfrage erstellt hat, kann nicht mitmachen
 *  - eine Stimme pro Person, nicht änderbar (Quiz-Fairness)
 *  - Tages-Deckel je User: höchstens DAILY_PARTICIPATION_CAP Teilnahme- und DAILY_CORRECT_CAP Gewinn-Münzen
 *  - Teilnahme-Münzen nur für Konten, die älter als MIN_ACCOUNT_AGE_DAYS sind
 * Auflösung automatisch: Quiz nach Ablauf (Antwort vorab hinterlegt), Event-Gewinner nach Event-Ende.
 */

export const DAILY_PARTICIPATION_CAP = 30;
export const DAILY_CORRECT_CAP = 300;
const MIN_ACCOUNT_AGE_DAYS = 3;
const QUIZ_DEFAULT_DAYS = 7;
const QUIZ_MAX_DAYS = 30;

export type PollResult = { ok: true; coins?: number; notice?: string } | { error: string };

// ── Anlegen / Ändern ────────────────────────────────────────────────────────

/** Prüft eine Umfrage aus dem Editor; Event-Gewinner-Umfragen brauchen ein kommendes Event. */
export async function validatePoll(poll: PollInput, eventId: string | null): Promise<string | null> {
  if (!POLL_KINDS.includes(poll.kind)) return "Ungültige Umfrage-Art";
  const q = poll.question.trim();
  if (!q) return "Frage der Umfrage fehlt";
  if (q.length > POLL_QUESTION_MAX) return `Frage ist zu lang (max. ${POLL_QUESTION_MAX} Zeichen)`;
  if (!Number.isInteger(poll.participationReward) || poll.participationReward < 0 || poll.participationReward > POLL_PARTICIPATION_MAX) {
    return `Teilnahme-Belohnung: 0 bis ${POLL_PARTICIPATION_MAX} Münzen`;
  }
  if (!Number.isInteger(poll.correctReward) || poll.correctReward < 0 || poll.correctReward > POLL_CORRECT_MAX) {
    return `Belohnung fürs Richtigliegen: 0 bis ${POLL_CORRECT_MAX} Münzen`;
  }
  if (poll.kind === "opinion" && poll.correctReward > 0) return "Meinungsumfragen haben keine richtige Antwort";
  if (poll.kind === "event_winner") {
    if (!eventId) return "Für „Wer gewinnt?“ muss der Beitrag einem Event zugeordnet sein";
    const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { startAt: true, status: true, _count: { select: { registrations: { where: { role: "player" } } } } } });
    if (!ev) return "Event nicht gefunden";
    if (ev.status === "finished" || ev.startAt.getTime() <= Date.now()) return "„Wer gewinnt?“ geht nur vor dem Event-Start";
    if (ev._count.registrations < 2) return "Für „Wer gewinnt?“ braucht das Event mindestens 2 angemeldete Spieler";
    return null;
  }
  const options = poll.options.map(o => o.trim()).filter(Boolean);
  if (options.length < POLL_OPTIONS_MIN || options.length > POLL_OPTIONS_MAX) return `${POLL_OPTIONS_MIN} bis ${POLL_OPTIONS_MAX} Antworten`;
  if (options.some(o => o.length > POLL_OPTION_MAX)) return `Antwort ist zu lang (max. ${POLL_OPTION_MAX} Zeichen)`;
  if (new Set(options.map(o => o.toLowerCase())).size !== options.length) return "Antworten müssen sich unterscheiden";
  if (poll.kind === "quiz") {
    if (poll.correctIndex == null || poll.correctIndex < 0 || poll.correctIndex >= options.length) return "Markiere die richtige Antwort";
  }
  if (poll.closesAt) {
    const t = new Date(poll.closesAt).getTime();
    if (Number.isNaN(t) || t < Date.now() + 5 * 60_000) return "Das Ende der Umfrage muss in der Zukunft liegen";
    if (t > Date.now() + QUIZ_MAX_DAYS * 86_400_000) return `Höchstens ${QUIZ_MAX_DAYS} Tage Laufzeit`;
  }
  return null;
}

/**
 * Legt die Umfrage eines Beitrags an, ersetzt sie (solange noch niemand abgestimmt hat) oder entfernt sie
 * (`poll = null`). `undefined` = unverändert.
 */
export async function savePollForReport(reportId: string, eventId: string | null, poll: PollInput | null | undefined): Promise<string | null> {
  if (poll === undefined) return null;
  const existing = await prisma.postPoll.findUnique({ where: { reportId }, select: { id: true, _count: { select: { votes: true } } } });
  if (existing && existing._count.votes > 0) {
    return poll === null ? "Die Umfrage hat schon Stimmen und kann nicht mehr entfernt werden" : null; // mit Stimmen: unverändert lassen
  }
  if (existing) await prisma.postPoll.delete({ where: { id: existing.id } });
  if (poll === null) return null;

  let options: { label: string; userId?: string }[];
  let closesAt: Date | null;
  if (poll.kind === "event_winner") {
    const ev = await prisma.event.findUnique({
      where: { id: eventId! },
      select: { startAt: true, registrations: { where: { role: "player" }, orderBy: { joinedAt: "asc" }, take: POLL_OPTIONS_MAX * 4, select: { user: { select: { id: true, username: true, name: true } } } } },
    });
    if (!ev) return "Event nicht gefunden";
    options = ev.registrations.map(r => ({ label: r.user.username ?? r.user.name ?? "Spieler", userId: r.user.id }));
    closesAt = ev.startAt; // abstimmen bis zum Event-Start
  } else {
    options = poll.options.map(o => o.trim()).filter(Boolean).map(label => ({ label }));
    closesAt = poll.closesAt ? new Date(poll.closesAt)
      : poll.kind === "quiz" ? new Date(Date.now() + QUIZ_DEFAULT_DAYS * 86_400_000) : null;
  }

  const created = await prisma.postPoll.create({
    data: {
      reportId, question: poll.question.trim(), kind: poll.kind, eventId: poll.kind === "event_winner" ? eventId : null,
      participationReward: poll.participationReward, correctReward: poll.kind === "opinion" ? 0 : poll.correctReward, closesAt,
      options: { create: options.map((o, position) => ({ label: o.label.slice(0, POLL_OPTION_MAX), position, userId: o.userId ?? null })) },
    },
    include: { options: { orderBy: { position: "asc" }, select: { id: true } } },
  });
  if (poll.kind === "quiz" && poll.correctIndex != null) {
    await prisma.postPoll.update({ where: { id: created.id }, data: { correctOptionId: created.options[poll.correctIndex]?.id ?? null } });
  }
  return null;
}

// ── Münzen ──────────────────────────────────────────────────────────────────

/** Zahlt (gedeckelt) aus und protokolliert. Gibt die tatsächlich gezahlten Münzen zurück (0 = Deckel erreicht/schon bezahlt). */
async function payPollReward(userId: string, pollId: string, kind: "participation" | "correct", amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const cap = kind === "participation" ? DAILY_PARTICIPATION_CAP : DAILY_CORRECT_CAP;
  const today = await prisma.postPollReward.aggregate({
    where: { userId, kind, createdAt: { gte: startOfBerlinDay() } }, _sum: { coins: true },
  });
  const coins = Math.min(amount, Math.max(0, cap - (today._sum.coins ?? 0)));
  if (coins <= 0) return 0;
  try {
    await prisma.$transaction([
      prisma.postPollReward.create({ data: { pollId, userId, kind, coins } }),
      prisma.user.update({ where: { id: userId }, data: { points: { increment: coins } } }),
      prisma.pointTransaction.create({
        data: { userId, amount: coins, reason: `${COIN_PREFIX} Umfrage: ${kind === "participation" ? "Teilnahme" : "richtig getippt"}` },
      }),
    ]);
    return coins;
  } catch {
    return 0; // schon bezahlt (unique pollId+userId+kind)
  }
}

// ── Abstimmen ───────────────────────────────────────────────────────────────

export async function votePoll(userId: string, pollId: string, optionId: string): Promise<PollResult> {
  const poll = await prisma.postPoll.findUnique({
    where: { id: pollId },
    include: { report: { select: { authorId: true, isDraft: true, hiddenByAdminAt: true } }, options: { select: { id: true } } },
  });
  if (!poll || poll.report.isDraft || poll.report.hiddenByAdminAt) return { error: "Umfrage nicht gefunden" };
  if (poll.report.authorId === userId) return { error: "Bei der eigenen Umfrage kannst du nicht mitmachen" };
  if (poll.resolvedAt || (poll.closesAt && poll.closesAt.getTime() <= Date.now())) return { error: "Die Umfrage ist beendet" };
  if (!poll.options.some(o => o.id === optionId)) return { error: "Ungültige Antwort" };

  try {
    await prisma.postPollVote.create({ data: { pollId, optionId, userId } });
  } catch {
    return { error: "Du hast schon abgestimmt" };
  }

  let coins = 0;
  let notice: string | undefined;
  if (poll.participationReward > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (user && Date.now() - user.createdAt.getTime() >= MIN_ACCOUNT_AGE_DAYS * 86_400_000) {
      coins = await payPollReward(userId, pollId, "participation", poll.participationReward);
      if (coins < poll.participationReward) notice = `Tages-Deckel für Umfrage-Münzen erreicht (${DAILY_PARTICIPATION_CAP} pro Tag)`;
    } else {
      notice = `Teilnahme-Münzen gibt es ab ${MIN_ACCOUNT_AGE_DAYS} Tagen Mitgliedschaft`;
    }
  }
  return { ok: true, coins, notice };
}

// ── Auflösen ────────────────────────────────────────────────────────────────

let lastResolveCheck = 0;

/**
 * Löst fällige Umfragen auf und zahlt Gewinn-Münzen: Quiz nach Ablauf (Antwort war vorab hinterlegt),
 * Event-Gewinner sobald das Event beendet ist (Platz 1 aus dem Event-Abschluss). Lazy aufgerufen wie
 * geplante Beiträge (Dashboard/Event-Seiten/Board) und im täglichen Cron.
 */
export async function resolveDuePolls(now: Date = new Date()): Promise<{ resolved: number; paid: number }> {
  if (now.getTime() - lastResolveCheck < 30_000) return { resolved: 0, paid: 0 };
  lastResolveCheck = now.getTime();

  const candidates = await prisma.postPoll.findMany({
    where: {
      resolvedAt: null,
      OR: [
        { kind: "quiz", closesAt: { lte: now } },
        { kind: "event_winner", eventId: { not: null }, closesAt: { lte: now } }, // ab Event-Start; aufgelöst erst nach Abschluss
        { kind: "opinion", closesAt: { lte: now } },
      ],
    },
    take: 30,
    include: { options: { select: { id: true, userId: true } }, report: { select: { id: true, title: true } } },
  });

  let resolved = 0, paid = 0;
  for (const poll of candidates) {
    let correctOptionId: string | null = poll.correctOptionId;
    if (poll.kind === "event_winner") {
      const ev = await prisma.event.findUnique({ where: { id: poll.eventId! }, select: { status: true, finalRankingJson: true } });
      if (!ev || ev.status !== "finished") continue; // noch nicht entschieden
      let winnerId: string | null = null;
      try { const r = JSON.parse(ev.finalRankingJson ?? "[]"); if (Array.isArray(r) && typeof r[0] === "string") winnerId = r[0]; } catch { /* kein Ergebnis */ }
      correctOptionId = poll.options.find(o => o.userId && o.userId === winnerId)?.id ?? null;
    }
    // Atomar beanspruchen, damit parallel laufende Aufrufe nicht doppelt auszahlen.
    const claimed = await prisma.postPoll.updateMany({ where: { id: poll.id, resolvedAt: null }, data: { resolvedAt: now, correctOptionId } });
    if (claimed.count === 0) continue;
    resolved++;
    if (!correctOptionId || poll.correctReward <= 0 || poll.kind === "opinion") continue;

    const winners = await prisma.postPollVote.findMany({ where: { pollId: poll.id, optionId: correctOptionId }, select: { userId: true } });
    // Nach tatsächlich gezahltem Betrag gruppieren (der Tages-Deckel kann ihn kürzen).
    const rewarded = new Map<number, string[]>();
    for (const w of winners) {
      const coins = await payPollReward(w.userId, poll.id, "correct", poll.correctReward);
      if (coins > 0) { paid += coins; rewarded.set(coins, [...(rewarded.get(coins) ?? []), w.userId]); }
    }
    for (const [coins, users] of rewarded) {
      dispatchNotification("poll_reward", {
        users,
        placeholders: { "{question}": poll.question.slice(0, 80), "{coins}": String(coins), "{url}": `/community-board/report/${poll.report.id}` },
      }).catch(() => {});
    }
  }
  return { resolved, paid };
}

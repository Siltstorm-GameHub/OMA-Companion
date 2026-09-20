import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter, getWeekBounds } from "./community-job-service";
import { dispatchNotification } from "./notify-dispatch";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { sendDiscordMessage } from "./discord-rest";
import { DISCORD_COLORS } from "./discord-colors";
import { formatBerlinDateTime } from "./time";

/**
 * Coach/Manager: erstellt Trainings-Termine für neue/unerfahrene Spieler und
 * bietet niedrigschwellige Ad-hoc-Hilfe an. Anders als bei den anderen Jobs
 * gibt es keinen "Content-Beitrag" im Community-Board — Bewertung läuft über
 * das Profil des Coaches (Ad-hoc) bzw. nach einem Trainings-Termin.
 */

const JOB_KEY = "coach";
const AD_HOC_COOLDOWN_HOURS = 24;

async function requireActiveCoach(userId: string): Promise<boolean> {
  const member = await prisma.communityJobMember.findFirst({
    where: { userId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
  });
  return !!member;
}

export type CreateSessionResult = { ok: true; sessionId: string; sessionIds: string[] } | { error: string };

const MAX_SERIES_WEEKS = 8;

/** UTC-Offset von Europe/Berlin zu einem Zeitpunkt (inkl. Sommerzeit), in ms. */
function berlinOffsetMs(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(d);
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const asUtc = Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day), Number(v.hour), Number(v.minute), Number(v.second));
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** +N Wochen, aber mit gleicher Berliner Uhrzeit — auch über die Sommer-/Winterzeit-Umstellung hinweg. */
function addWeeksKeepingBerlinTime(d: Date, weeks: number): Date {
  const shifted = new Date(d.getTime() + weeks * 7 * 86_400_000);
  return new Date(shifted.getTime() - (berlinOffsetMs(shifted) - berlinOffsetMs(d)));
}

export async function createTrainingSession(
  coachId: string,
  data: {
    title: string; description?: string; startAt: Date; capacity?: number; discordChannelId?: string;
    /** Vorbereitungs-Training für ein Event (optional). */
    eventId?: string;
    /** 1 = einzelner Termin, N = wöchentliche Serie mit N Terminen (max. 8). */
    repeatWeeks?: number;
  },
): Promise<CreateSessionResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (!data.title.trim()) return { error: "Titel erforderlich" };
  if (Number.isNaN(data.startAt.getTime()) || data.startAt.getTime() < Date.now()) return { error: "Termin muss in der Zukunft liegen" };
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1)) return { error: "Kapazität muss mindestens 1 sein" };
  const repeat = data.repeatWeeks ?? 1;
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > MAX_SERIES_WEEKS) return { error: `Serie: 1 bis ${MAX_SERIES_WEEKS} Termine möglich` };

  const seriesId = repeat > 1 ? randomUUID() : null;
  const sessions = [];
  for (let i = 0; i < repeat; i++) {
    sessions.push(await prisma.coachTrainingSession.create({
      data: {
        coachId, title: data.title.trim(), description: data.description ?? null,
        startAt: i === 0 ? data.startAt : addWeeksKeepingBerlinTime(data.startAt, i),
        capacity: data.capacity ?? null, eventId: data.eventId ?? null, seriesId,
      },
    }));
  }
  await prisma.communityJobMember.updateMany({
    where: { userId: coachId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  // Anders als die anderen Jobs bekommt der Coach keinen festen Admin-Kanal
  // (siehe Discord-Anbindung im Plan — Coach nutzt Sterne-Bewertung statt
  // Reaktionen) — hier entscheidet der Coach selbst je Termin, in welchen
  // Kanal die Einladung geht. Rein informativ, kein Reaktions-Voting. Bei einer
  // Serie geht nur EINE Nachricht für den ersten Termin raus.
  if (data.discordChannelId) {
    sendDiscordMessage(data.discordChannelId, {
      title: `🎓 Neuer Trainings-Termin: ${data.title.trim()}`,
      description: data.description || "Neuer Trainings-Termin — meldet euch in der App an!",
      color: DISCORD_COLORS.eventNew,
      fields: [
        { name: "📆 Start", value: formatBerlinDateTime(data.startAt, { dateStyle: "full", timeStyle: "short" }), inline: true },
        ...(repeat > 1 ? [{ name: "🔁 Serie", value: `${repeat} wöchentliche Termine`, inline: true }] : []),
      ],
      footer: { text: "OMA Companion · Community-Jobs · Coach" },
    }).catch(() => {});
  }

  return { ok: true, sessionId: sessions[0].id, sessionIds: sessions.map(s => s.id) };
}

export type SignupResult = { ok: true } | { error: string };

export async function signupForSession(userId: string, sessionId: string): Promise<SignupResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { _count: { select: { signups: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId === userId) return { error: "Du bist der Coach dieses Termins" };
  if (session.startAt.getTime() < Date.now()) return { error: "Termin hat bereits begonnen" };
  if (session.capacity != null && session._count.signups >= session.capacity) return { error: "Termin ist ausgebucht" };

  const existing = await prisma.coachTrainingSignup.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  }).catch(() => null);
  if (existing) return { error: "Du bist bereits angemeldet" };

  await prisma.coachTrainingSignup.create({ data: { sessionId, userId } });
  return { ok: true };
}

export async function unsignFromSession(userId: string, sessionId: string): Promise<SignupResult> {
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.startAt.getTime() < Date.now()) return { error: "Termin hat bereits begonnen" };
  await prisma.coachTrainingSignup.deleteMany({ where: { sessionId, userId } });
  return { ok: true };
}

export type MutationResult = { ok: true } | { error: string };

/** Coach des Termins ODER Admin (isAdmin) darf ändern; Startzeit muss in der Zukunft liegen, Kapazität nicht unter die aktuellen Anmeldungen fallen. */
export async function updateTrainingSession(
  coachId: string, sessionId: string,
  data: { title?: string; description?: string | null; startAt?: Date; capacity?: number | null },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { _count: { select: { signups: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann ihn ändern" };
  if (session.startAt.getTime() < Date.now()) return { error: "Vergangene Termine lassen sich nicht mehr ändern" };
  if (data.title !== undefined && !data.title.trim()) return { error: "Titel erforderlich" };
  if (data.startAt !== undefined && (Number.isNaN(data.startAt.getTime()) || data.startAt.getTime() < Date.now())) {
    return { error: "Termin muss in der Zukunft liegen" };
  }
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1)) return { error: "Kapazität muss mindestens 1 sein" };
  if (data.capacity != null && data.capacity < session._count.signups) {
    return { error: `Es sind bereits ${session._count.signups} Teilnehmer angemeldet` };
  }

  await prisma.coachTrainingSession.update({
    where: { id: sessionId },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startAt !== undefined ? { startAt: data.startAt } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      // Neue Zeit → Tages-Erinnerung darf für den neuen Zeitpunkt nochmal raus.
      ...(data.startAt !== undefined ? { reminderSentAt: null } : {}),
    },
  });

  const titleChanged = data.title !== undefined && data.title.trim() !== session.title;
  const timeChanged = data.startAt !== undefined && data.startAt.getTime() !== session.startAt.getTime();
  if (titleChanged || timeChanged) {
    const [signups, coachName] = await Promise.all([
      prisma.coachTrainingSignup.findMany({ where: { sessionId }, select: { userId: true } }),
      coachDisplayName(session.coachId),
    ]);
    notifyParticipants("coach_session_changed", signups.map(x => x.userId), {
      sessionTitle: data.title?.trim() ?? session.title, when: data.startAt ?? session.startAt, coachName,
    });
  }
  return { ok: true };
}

/** Löschen nur, solange es noch keine Bewertungen gibt (sie hängen per Cascade am Termin). */
export async function deleteTrainingSession(coachId: string, sessionId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { _count: { select: { ratings: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann ihn löschen" };
  if (session._count.ratings > 0) return { error: "Termin hat bereits Bewertungen und kann nicht gelöscht werden" };

  const [signups, coachName] = await Promise.all([
    prisma.coachTrainingSignup.findMany({ where: { sessionId }, select: { userId: true } }),
    coachDisplayName(session.coachId),
  ]);
  await prisma.coachTrainingSession.delete({ where: { id: sessionId } });
  // Nur bei zukünftigen Terminen absagen — ein vergangener Termin fällt niemandem mehr auf.
  if (session.startAt.getTime() > Date.now()) {
    notifyParticipants("coach_session_cancelled", signups.map(x => x.userId), { sessionTitle: session.title, when: session.startAt, coachName });
  }
  return { ok: true };
}

export type RateResult = { ok: true } | { error: string };

/** Bewertung nach einem Trainings-Termin — ein Teilnehmer, ein Rating pro Termin. */
export async function rateAfterTraining(
  raterId: string, coachId: string, trainingSessionId: string, stars: number, reason: string,
): Promise<RateResult> {
  const validation = validateRatingInput(raterId, coachId, stars, reason);
  if (validation) return validation;

  const session = await prisma.coachTrainingSession.findUnique({ where: { id: trainingSessionId } });
  if (!session || session.coachId !== coachId) return { error: "Termin gehört nicht zu diesem Coach" };
  if (session.startAt.getTime() > Date.now()) return { error: "Der Termin hat noch nicht stattgefunden" };

  const signup = await prisma.coachTrainingSignup.findUnique({
    where: { sessionId_userId: { sessionId: trainingSessionId, userId: raterId } },
  }).catch(() => null);
  if (!signup) return { error: "Nur Teilnehmer dieses Termins können bewerten" };

  const existing = await prisma.coachRating.findUnique({
    where: { coachId_raterId_trainingSessionId: { coachId, raterId, trainingSessionId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diesen Termin bereits bewertet" };

  await prisma.coachRating.create({ data: { coachId, raterId, trainingSessionId, stars, reason } });
  onCommunityJobVoteCast(raterId).catch(() => {});
  return { ok: true };
}

/** Ad-hoc-Bewertung ohne Trainings-Bezug — jeder darf, mit Cooldown pro Rater-Coach-Paar. */
export async function rateAdHoc(raterId: string, coachId: string, stars: number, reason: string): Promise<RateResult> {
  const validation = validateRatingInput(raterId, coachId, stars, reason);
  if (validation) return validation;

  const cooldownSince = new Date(Date.now() - AD_HOC_COOLDOWN_HOURS * 3_600_000);
  const recent = await prisma.coachRating.findFirst({
    where: { coachId, raterId, trainingSessionId: null, createdAt: { gte: cooldownSince } },
  });
  if (recent) return { error: `Du kannst diesen Coach erst wieder in ${AD_HOC_COOLDOWN_HOURS}h bewerten` };

  await prisma.coachRating.create({ data: { coachId, raterId, trainingSessionId: null, stars, reason } });
  onCommunityJobVoteCast(raterId).catch(() => {});
  return { ok: true };
}

function validateRatingInput(raterId: string, coachId: string, stars: number, reason: string): RateResult | null {
  if (raterId === coachId) return { error: "Du kannst dich nicht selbst bewerten" };
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return { error: "Bewertung muss 1-5 Sterne sein" };
  if (!reason.trim()) return { error: "Begründung erforderlich" };
  return null;
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

/**
 * Score = Ø Sterne × Anzahl gültiger Bewertungen diese Woche (siehe Plan-Gehaltsstufen)
 * PLUS Anwesenheit: 0,5 Punkte je vom Coach als anwesend eingetragenem Teilnehmer der
 * Termine dieser Woche, gedeckelt bei 10 Teilnehmern (= max. 5 Punkte). So zählt auch
 * tatsächliches Coachen, nicht nur das Einsammeln von Bewertungen — der Deckel begrenzt
 * Missbrauch durch selbst eingetragene Anwesenheit.
 */
const ATTENDANCE_POINTS_PER_PERSON = 0.5;
const ATTENDANCE_COUNTED_MAX = 10;

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const [agg, attended] = await Promise.all([
    prisma.coachRating.aggregate({
      where: {
        coachId: userId, createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
      _avg: { stars: true }, _count: { _all: true },
    }),
    prisma.coachTrainingSignup.count({
      where: { attended: true, session: { coachId: userId, startAt: { gte: weekStart, lt: weekEnd } } },
    }),
  ]);
  return (agg._avg.stars ?? 0) * agg._count._all + Math.min(attended, ATTENDANCE_COUNTED_MAX) * ATTENDANCE_POINTS_PER_PERSON;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.coachRating.count({
    where: {
      raterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

// ── Benachrichtigungen an Teilnehmer ─────────────────────────────────────────

async function coachDisplayName(coachId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: coachId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Der Coach";
}

function notifyParticipants(ruleKey: string, userIds: string[], vars: { sessionTitle: string; when: Date; coachName: string }): void {
  if (userIds.length === 0) return;
  dispatchNotification(ruleKey, {
    users: userIds,
    placeholders: {
      "{sessionTitle}": vars.sessionTitle, "{coachName}": vars.coachName,
      "{when}": formatBerlinDateTime(vars.when, { dateStyle: "full", timeStyle: "short" }),
    },
  }).catch(() => {});
}

// ── Anwesenheit ──────────────────────────────────────────────────────────────

/** Coach des Termins ODER Admin trägt ein, ob ein angemeldeter Teilnehmer da war (null = zurücksetzen). Erst ab Terminbeginn. */
export async function markAttendance(
  coachId: string, sessionId: string, userId: string, attended: boolean | null,
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann die Anwesenheit eintragen" };
  if (session.startAt.getTime() > Date.now()) return { error: "Der Termin hat noch nicht begonnen" };

  const updated = await prisma.coachTrainingSignup.updateMany({ where: { sessionId, userId }, data: { attended } });
  if (updated.count === 0) return { error: "Dieser Spieler war nicht angemeldet" };
  return { ok: true };
}

// ── Verfügbarkeit (Ad-hoc-Hilfe) ─────────────────────────────────────────────

/** `minutes` = jetzt für so lange verfügbar (15–480), `null` = Verfügbarkeit beenden. */
export async function setAvailability(
  coachId: string, minutes: number | null, discordChannelId?: string,
): Promise<{ ok: true; availableUntil: string | null } | { error: string }> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (minutes !== null && (!Number.isInteger(minutes) || minutes < 15 || minutes > 480)) {
    return { error: "Dauer muss zwischen 15 Minuten und 8 Stunden liegen" };
  }

  const availableUntil = minutes === null ? null : new Date(Date.now() + minutes * 60_000);
  await prisma.communityJobMember.updateMany({
    where: { userId: coachId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { availableUntil },
  });

  if (availableUntil && discordChannelId) {
    const name = await coachDisplayName(coachId);
    sendDiscordMessage(discordChannelId, {
      title: `🎓 ${name} hilft gerade`,
      description: "Fragen zu Spielen, Einstieg oder Community? Melde dich direkt bei diesem Coach.",
      color: DISCORD_COLORS.eventNew,
      fields: [{ name: "🟢 Verfügbar bis", value: formatBerlinDateTime(availableUntil, { dateStyle: "short", timeStyle: "short" }), inline: true }],
      footer: { text: "OMA Companion · Community-Jobs · Coach" },
    }).catch(() => {});
  }
  return { ok: true, availableUntil: availableUntil ? availableUntil.toISOString() : null };
}

// ── Mentees ──────────────────────────────────────────────────────────────────

export async function listMentees(coachId: string) {
  const mentees = await prisma.coachMentee.findMany({
    where: { coachId },
    orderBy: { createdAt: "desc" },
    include: { mentee: { select: { id: true, username: true, name: true, image: true } } },
  });
  const attended = mentees.length === 0 ? [] : await prisma.coachTrainingSignup.groupBy({
    by: ["userId"],
    where: { attended: true, userId: { in: mentees.map(m => m.menteeId) }, session: { coachId } },
    _count: { _all: true },
  });
  const attendedByUser = new Map(attended.map(a => [a.userId, a._count._all]));
  return mentees.map(m => ({ id: m.id, note: m.note, createdAt: m.createdAt, mentee: m.mentee, trainingsAttended: attendedByUser.get(m.menteeId) ?? 0 }));
}

export async function addMentee(coachId: string, menteeId: string, note?: string): Promise<MutationResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (menteeId === coachId) return { error: "Du kannst dich nicht selbst als Mentee hinzufügen" };
  const user = await prisma.user.findUnique({ where: { id: menteeId }, select: { id: true } });
  if (!user) return { error: "Spieler nicht gefunden" };

  await prisma.coachMentee.upsert({
    where: { coachId_menteeId: { coachId, menteeId } },
    create: { coachId, menteeId, note: note?.trim() || null },
    update: note !== undefined ? { note: note.trim() || null } : {},
  });
  return { ok: true };
}

export async function updateMenteeNote(coachId: string, id: string, note: string): Promise<MutationResult> {
  const updated = await prisma.coachMentee.updateMany({ where: { id, coachId }, data: { note: note.trim() || null } });
  return updated.count === 0 ? { error: "Mentee nicht gefunden" } : { ok: true };
}

export async function removeMentee(coachId: string, id: string): Promise<MutationResult> {
  const deleted = await prisma.coachMentee.deleteMany({ where: { id, coachId } });
  return deleted.count === 0 ? { error: "Mentee nicht gefunden" } : { ok: true };
}

// ── Auswertung + Wochenziel ──────────────────────────────────────────────────

/** Mindestens so viele eigene Termine pro Woche gelten als Wochenziel (rein informativ, kein Einfluss aufs Gehalt). */
export const WEEKLY_SESSION_GOAL = 1;

export async function getCoachStats(coachId: string) {
  const now = new Date();
  const { weekStart, weekEnd } = getWeekBounds(now);
  const since = new Date(now.getTime() - 56 * 86_400_000);

  const [sessionsThisWeek, ratings, pastSessions] = await Promise.all([
    prisma.coachTrainingSession.count({ where: { coachId, startAt: { gte: weekStart, lt: weekEnd } } }),
    prisma.coachRating.findMany({
      where: { coachId, createdAt: { gte: since }, OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] },
      select: { stars: true, createdAt: true },
    }),
    prisma.coachTrainingSession.findMany({
      where: { coachId, startAt: { lt: now, gte: new Date(now.getTime() - 90 * 86_400_000) } },
      orderBy: { startAt: "desc" },
      take: 10,
      include: { signups: { select: { attended: true } }, ratings: { select: { stars: true } } },
    }),
  ]);

  const byWeek = new Map<number, { sum: number; count: number }>();
  for (const r of ratings) {
    const key = getWeekBounds(r.createdAt).weekStart.getTime();
    const cur = byWeek.get(key) ?? { sum: 0, count: 0 };
    cur.sum += r.stars; cur.count += 1;
    byWeek.set(key, cur);
  }
  const weekly = [...byWeek.entries()].sort((a, b) => a[0] - b[0])
    .map(([ts, v]) => ({ weekStart: new Date(ts).toISOString(), average: v.sum / v.count, count: v.count }));

  const sessions = pastSessions.map(s => ({
    id: s.id, title: s.title, startAt: s.startAt.toISOString(),
    signups: s.signups.length,
    attended: s.signups.filter(x => x.attended === true).length,
    unmarked: s.signups.filter(x => x.attended === null).length,
    ratingCount: s.ratings.length,
    ratingAverage: s.ratings.length > 0 ? s.ratings.reduce((sum, r) => sum + r.stars, 0) / s.ratings.length : null,
  }));

  return { weeklyGoal: WEEKLY_SESSION_GOAL, sessionsThisWeek, weekly, sessions };
}

// ── Tägliche Erinnerung (Cron) ───────────────────────────────────────────────

/** Erinnert Teilnehmer und Coach an Termine, die in den nächsten 24 Stunden beginnen — je Termin nur einmal. */
export async function runCoachSessionReminders(referenceDate: Date = new Date()): Promise<{ reminded: number }> {
  const sessions = await prisma.coachTrainingSession.findMany({
    where: { reminderSentAt: null, startAt: { gt: referenceDate, lte: new Date(referenceDate.getTime() + 24 * 3_600_000) } },
    include: { signups: { select: { userId: true } } },
  });
  for (const s of sessions) {
    const coachName = await coachDisplayName(s.coachId);
    notifyParticipants("coach_session_reminder", [...new Set([s.coachId, ...s.signups.map(x => x.userId)])], {
      sessionTitle: s.title, when: s.startAt, coachName,
    });
    await prisma.coachTrainingSession.update({ where: { id: s.id }, data: { reminderSentAt: referenceDate } });
  }
  return { reminded: sessions.length };
}

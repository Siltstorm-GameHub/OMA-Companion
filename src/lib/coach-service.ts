import { randomUUID } from "crypto";
import { withCollabBonus } from "./collab-bonus";
import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter, getWeekBounds } from "./community-job-service";
import { dispatchNotification } from "./notify-dispatch";
import { countGuideVoteScore } from "./coach-guide-service";
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
    /** Treffpunkt-Link (z.B. Discord-Voice-Kanal). */
    meetingUrl?: string;
    /** 1 = einzelner Termin, N = wöchentliche Serie mit N Terminen (max. 8). */
    repeatWeeks?: number;
  },
): Promise<CreateSessionResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (!data.title.trim()) return { error: "Titel erforderlich" };
  if (Number.isNaN(data.startAt.getTime()) || data.startAt.getTime() < Date.now()) return { error: "Termin muss in der Zukunft liegen" };
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1)) return { error: "Kapazität muss mindestens 1 sein" };
  const meeting = normalizeMeetingUrl(data.meetingUrl);
  if ("error" in meeting) return meeting;
  const repeat = data.repeatWeeks ?? 1;
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > MAX_SERIES_WEEKS) return { error: `Serie: 1 bis ${MAX_SERIES_WEEKS} Termine möglich` };

  const seriesId = repeat > 1 ? randomUUID() : null;
  const sessions = [];
  for (let i = 0; i < repeat; i++) {
    sessions.push(await prisma.coachTrainingSession.create({
      data: {
        coachId, title: data.title.trim(), description: data.description ?? null,
        startAt: i === 0 ? data.startAt : addWeeksKeepingBerlinTime(data.startAt, i),
        capacity: data.capacity ?? null, eventId: data.eventId ?? null, seriesId, meetingUrl: meeting.value,
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
  await prisma.coachTrainingWaitlistEntry.deleteMany({ where: { sessionId, userId } });
  return { ok: true };
}

export async function unsignFromSession(userId: string, sessionId: string): Promise<SignupResult> {
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.startAt.getTime() < Date.now()) return { error: "Termin hat bereits begonnen" };
  await prisma.coachTrainingSignup.deleteMany({ where: { sessionId, userId } });
  await promoteFromWaitlist(sessionId);
  return { ok: true };
}

export type MutationResult = { ok: true } | { error: string };

const MEETING_URL_MAX = 300;

/** Treffpunkt-Link: leer → null, sonst muss es eine http(s)-URL sein. */
function normalizeMeetingUrl(url: string | null | undefined): { ok: true; value: string | null } | { error: string } {
  if (url === undefined || url === null || !url.trim()) return { ok: true, value: null };
  const trimmed = url.trim();
  if (trimmed.length > MEETING_URL_MAX) return { error: "Treffpunkt-Link ist zu lang" };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
  } catch {
    return { error: "Treffpunkt muss ein Link (https://…) sein" };
  }
  return { ok: true, value: trimmed };
}

/** Berliner Wandzeit-Verschiebung: `orig` um dieselbe Differenz verschieben wie `oldRef` → `newRef`, aber mit gleicher Berliner Uhrzeit. */
function shiftKeepingBerlinTime(orig: Date, oldRef: Date, newRef: Date): Date {
  const candidate = new Date(orig.getTime() + (newRef.getTime() - oldRef.getTime()));
  const adjust = (berlinOffsetMs(candidate) - berlinOffsetMs(orig)) - (berlinOffsetMs(newRef) - berlinOffsetMs(oldRef));
  return new Date(candidate.getTime() - adjust);
}

/**
 * Coach des Termins ODER Admin (isAdmin) darf ändern. Startzeit muss in der Zukunft liegen, Kapazität nicht
 * unter die aktuellen Anmeldungen fallen. `scope: "series"` wendet die Änderung auf diesen und alle
 * folgenden (zukünftigen) Termine derselben Serie an; eine neue Startzeit verschiebt sie alle um dieselbe
 * Differenz. `message` wird den angemeldeten Teilnehmern in der Benachrichtigung mitgegeben.
 */
export async function updateTrainingSession(
  coachId: string, sessionId: string,
  data: { title?: string; description?: string | null; startAt?: Date; capacity?: number | null; meetingUrl?: string | null },
  opts: { isAdmin?: boolean; scope?: "single" | "series"; message?: string } = {},
): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann ihn ändern" };
  if (session.startAt.getTime() < Date.now()) return { error: "Vergangene Termine lassen sich nicht mehr ändern" };
  if (data.title !== undefined && !data.title.trim()) return { error: "Titel erforderlich" };
  if (data.startAt !== undefined && (Number.isNaN(data.startAt.getTime()) || data.startAt.getTime() < Date.now())) {
    return { error: "Termin muss in der Zukunft liegen" };
  }
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1)) return { error: "Kapazität muss mindestens 1 sein" };
  const meeting = data.meetingUrl !== undefined ? normalizeMeetingUrl(data.meetingUrl) : undefined;
  if (meeting && "error" in meeting) return meeting;

  const targets = opts.scope === "series" && session.seriesId
    ? await prisma.coachTrainingSession.findMany({
        where: { seriesId: session.seriesId, startAt: { gte: session.startAt, gt: new Date() } },
        include: { signups: { select: { userId: true } } }, orderBy: { startAt: "asc" },
      })
    : await prisma.coachTrainingSession.findMany({ where: { id: sessionId }, include: { signups: { select: { userId: true } } } });

  if (data.capacity != null) {
    const tooFull = targets.find(t => t.signups.length > data.capacity!);
    if (tooFull) return { error: `Im Termin „${tooFull.title}“ sind bereits ${tooFull.signups.length} Teilnehmer angemeldet` };
  }
  const newStarts = new Map<string, Date>();
  if (data.startAt !== undefined) {
    for (const t of targets) {
      const next = t.id === session.id ? data.startAt : shiftKeepingBerlinTime(t.startAt, session.startAt, data.startAt);
      if (next.getTime() < Date.now()) return { error: "Ein Termin der Serie würde dadurch in der Vergangenheit liegen" };
      newStarts.set(t.id, next);
    }
  }

  await prisma.$transaction(targets.map(t => prisma.coachTrainingSession.update({
    where: { id: t.id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startAt !== undefined ? { startAt: newStarts.get(t.id)!, reminderSentAt: null } : {}), // neue Zeit → Erinnerung darf nochmal raus
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(meeting ? { meetingUrl: meeting.value } : {}),
    },
  })));

  if (data.capacity !== undefined) for (const t of targets) await promoteFromWaitlist(t.id);

  const titleChanged = data.title !== undefined && data.title.trim() !== session.title;
  const timeChanged = data.startAt !== undefined && data.startAt.getTime() !== session.startAt.getTime();
  const meetingChanged = meeting !== undefined && meeting.value !== session.meetingUrl;
  if (titleChanged || timeChanged || meetingChanged) {
    const userIds = [...new Set(targets.flatMap(t => t.signups.map(x => x.userId)))];
    const coachName = await coachDisplayName(session.coachId);
    notifyParticipants("coach_session_changed", userIds, {
      sessionTitle: `${data.title?.trim() ?? session.title}${targets.length > 1 ? " (Serie)" : ""}`,
      when: newStarts.get(session.id) ?? session.startAt, coachName,
      note: opts.message, meeting: meeting?.value ?? session.meetingUrl,
    });
  }
  return { ok: true };
}

/**
 * Löschen nur, solange es noch keine Bewertungen gibt (sie hängen per Cascade am Termin).
 * `scope: "series"` löscht diesen und alle folgenden Termine der Serie.
 */
export async function deleteTrainingSession(
  coachId: string, sessionId: string, opts: { isAdmin?: boolean; scope?: "single" | "series"; message?: string } = {},
): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann ihn löschen" };

  const targets = opts.scope === "series" && session.seriesId
    ? await prisma.coachTrainingSession.findMany({
        where: { seriesId: session.seriesId, startAt: { gte: session.startAt } },
        include: { signups: { select: { userId: true } }, _count: { select: { ratings: true } } }, orderBy: { startAt: "asc" },
      })
    : await prisma.coachTrainingSession.findMany({
        where: { id: sessionId }, include: { signups: { select: { userId: true } }, _count: { select: { ratings: true } } },
      });
  if (targets.some(t => t._count.ratings > 0)) return { error: "Termin hat bereits Bewertungen und kann nicht gelöscht werden" };

  const coachName = await coachDisplayName(session.coachId);
  await prisma.coachTrainingSession.deleteMany({ where: { id: { in: targets.map(t => t.id) } } });

  // Nur bei zukünftigen Terminen absagen — ein vergangener Termin fällt niemandem mehr auf.
  const upcoming = targets.filter(t => t.startAt.getTime() > Date.now());
  if (upcoming.length > 0) {
    notifyParticipants("coach_session_cancelled", [...new Set(upcoming.flatMap(t => t.signups.map(x => x.userId)))], {
      sessionTitle: `${session.title}${targets.length > 1 ? " (Serie)" : ""}`, when: upcoming[0].startAt, coachName, note: opts.message,
    });
  }
  return { ok: true };
}

// ── Warteliste ───────────────────────────────────────────────────────────────

export async function joinWaitlist(userId: string, sessionId: string): Promise<SignupResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { _count: { select: { signups: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId === userId) return { error: "Du bist der Coach dieses Termins" };
  if (session.startAt.getTime() < Date.now()) return { error: "Termin hat bereits begonnen" };
  if (session.capacity == null || session._count.signups < session.capacity) return { error: "Es sind noch Plätze frei — melde dich direkt an" };
  if (await prisma.coachTrainingSignup.findUnique({ where: { sessionId_userId: { sessionId, userId } } })) return { error: "Du bist bereits angemeldet" };

  await prisma.coachTrainingWaitlistEntry.upsert({
    where: { sessionId_userId: { sessionId, userId } }, create: { sessionId, userId }, update: {},
  });
  return { ok: true };
}

export async function leaveWaitlist(userId: string, sessionId: string): Promise<SignupResult> {
  await prisma.coachTrainingWaitlistEntry.deleteMany({ where: { sessionId, userId } });
  return { ok: true };
}

/** Rückt Wartende (in Reihenfolge der Eintragung) nach, solange Plätze frei sind, und benachrichtigt sie. */
export async function promoteFromWaitlist(sessionId: string): Promise<number> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { signups: true } }, waitlist: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || session.startAt.getTime() < Date.now() || session.waitlist.length === 0) return 0;

  const free = session.capacity == null ? session.waitlist.length : Math.max(0, session.capacity - session._count.signups);
  const promoted = session.waitlist.slice(0, free);
  if (promoted.length === 0) return 0;

  const coachName = await coachDisplayName(session.coachId);
  for (const entry of promoted) {
    await prisma.$transaction([
      prisma.coachTrainingSignup.upsert({
        where: { sessionId_userId: { sessionId, userId: entry.userId } }, create: { sessionId, userId: entry.userId }, update: {},
      }),
      prisma.coachTrainingWaitlistEntry.delete({ where: { id: entry.id } }),
    ]);
    notifyParticipants("coach_waitlist_promoted", [entry.userId], { sessionTitle: session.title, when: session.startAt, coachName });
  }
  return promoted.length;
}

// ── Nachbereitung ────────────────────────────────────────────────────────────

const SUMMARY_MAX = 1500;

/** Coach schickt nach dem Termin eine Zusammenfassung/Tipps an alle Teilnehmer, die nicht als "nicht erschienen" markiert sind. */
export async function sendSessionSummary(
  coachId: string, sessionId: string, summary: string, opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { signups: { select: { userId: true, attended: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId !== coachId && !opts.isAdmin) return { error: "Nur der Coach dieses Termins kann eine Zusammenfassung senden" };
  if (session.startAt.getTime() > Date.now()) return { error: "Der Termin hat noch nicht begonnen" };
  const text = summary.trim();
  if (!text) return { error: "Text erforderlich" };
  if (text.length > SUMMARY_MAX) return { error: `Zusammenfassung ist zu lang (max. ${SUMMARY_MAX} Zeichen)` };

  await prisma.coachTrainingSession.update({ where: { id: sessionId }, data: { summary: text } });
  const recipients = session.signups.filter(s => s.attended !== false).map(s => s.userId);
  if (recipients.length > 0) {
    dispatchNotification("coach_session_summary", {
      users: recipients,
      placeholders: { "{sessionTitle}": session.title, "{summary}": text.length > 400 ? `${text.slice(0, 397)}…` : text },
    }).catch(() => {});
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
 * Termine dieser Woche, gedeckelt bei 10 Teilnehmern (= max. 5 Punkte),
 * PLUS 1 Punkt je Daumen-hoch auf seine Anleitungen im Community-Board. So zählt auch
 * tatsächliches Coachen, nicht nur das Einsammeln von Bewertungen — der Deckel begrenzt
 * Missbrauch durch selbst eingetragene Anwesenheit.
 */
const ATTENDANCE_POINTS_PER_PERSON = 0.5;
const ATTENDANCE_COUNTED_MAX = 10;

registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const [agg, attended, guideVotes] = await Promise.all([
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
    countGuideVoteScore(userId, weekStart, weekEnd),
  ]);
  return withCollabBonus(JOB_KEY, userId, weekStart, weekEnd, (agg._avg.stars ?? 0) * agg._count._all + Math.min(attended, ATTENDANCE_COUNTED_MAX) * ATTENDANCE_POINTS_PER_PERSON + guideVotes);
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

function notifyParticipants(
  ruleKey: string, userIds: string[],
  vars: { sessionTitle: string; when: Date; coachName: string; note?: string; meeting?: string | null },
): void {
  if (userIds.length === 0) return;
  dispatchNotification(ruleKey, {
    users: userIds,
    placeholders: {
      "{sessionTitle}": vars.sessionTitle, "{coachName}": vars.coachName,
      "{when}": formatBerlinDateTime(vars.when, { dateStyle: "full", timeStyle: "short" }),
      // Immer setzen — nicht ersetzte Platzhalter würden sonst wörtlich in der Nachricht landen.
      "{note}": vars.note?.trim() ? ` Hinweis: ${vars.note.trim()}` : "",
      "{meeting}": vars.meeting ? ` Treffpunkt: ${vars.meeting}` : "",
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
      sessionTitle: s.title, when: s.startAt, coachName, meeting: s.meetingUrl,
    });
    await prisma.coachTrainingSession.update({ where: { id: s.id }, data: { reminderSentAt: referenceDate } });
  }
  return { reminded: sessions.length };
}

// ── Hilfe anfragen (unabhängig von der Verfügbarkeit) ────────────────────────

const HELP_MESSAGE_MAX = 500;
const HELP_REQUESTS_PER_DAY = 3;

async function userDisplayName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Jemand";
}

export async function createHelpRequest(requesterId: string, coachId: string, message: string): Promise<MutationResult> {
  const text = message.trim();
  if (!text) return { error: "Bitte beschreibe kurz, wobei du Hilfe brauchst" };
  if (text.length > HELP_MESSAGE_MAX) return { error: `Nachricht ist zu lang (max. ${HELP_MESSAGE_MAX} Zeichen)` };
  if (requesterId === coachId) return { error: "Du kannst dich nicht selbst um Hilfe bitten" };
  if (!(await requireActiveCoach(coachId))) return { error: "Dieser Nutzer ist gerade kein aktiver Coach" };

  if (await prisma.coachHelpRequest.findFirst({ where: { requesterId, coachId, status: "OPEN" } })) {
    return { error: "Du hast bei diesem Coach bereits eine offene Anfrage" };
  }
  const recent = await prisma.coachHelpRequest.count({
    where: { requesterId, createdAt: { gte: new Date(Date.now() - 24 * 3_600_000) } },
  });
  if (recent >= HELP_REQUESTS_PER_DAY) return { error: `Du kannst pro Tag höchstens ${HELP_REQUESTS_PER_DAY} Anfragen stellen` };

  await prisma.coachHelpRequest.create({ data: { coachId, requesterId, message: text } });
  dispatchNotification("coach_help_request", {
    users: [coachId],
    placeholders: { "{requesterName}": await userDisplayName(requesterId), "{message}": text },
  }).catch(() => {});
  return { ok: true };
}

/** Offene Anfragen zuerst, danach die zuletzt beantworteten. */
export async function listHelpRequests(coachId: string) {
  const [open, answered] = await Promise.all([
    prisma.coachHelpRequest.findMany({
      where: { coachId, status: "OPEN" }, orderBy: { createdAt: "asc" },
      include: { requester: { select: { id: true, username: true, name: true } } },
    }),
    prisma.coachHelpRequest.findMany({
      where: { coachId, status: "ANSWERED" }, orderBy: { answeredAt: "desc" }, take: 5,
      include: { requester: { select: { id: true, username: true, name: true } } },
    }),
  ]);
  return [...open, ...answered];
}

export async function countOpenHelpRequests(coachId: string): Promise<number> {
  return prisma.coachHelpRequest.count({ where: { coachId, status: "OPEN" } });
}

/** Coach schließt eine Anfrage ab; mit `reply` bekommt die anfragende Person die Antwort als Benachrichtigung. */
export async function answerHelpRequest(coachId: string, id: string, reply?: string): Promise<MutationResult> {
  const request = await prisma.coachHelpRequest.findUnique({ where: { id } });
  if (!request || request.coachId !== coachId) return { error: "Anfrage nicht gefunden" };
  if (request.status !== "OPEN") return { error: "Anfrage ist bereits beantwortet" };
  const text = reply?.trim() ?? "";
  if (text.length > HELP_MESSAGE_MAX) return { error: `Antwort ist zu lang (max. ${HELP_MESSAGE_MAX} Zeichen)` };

  await prisma.coachHelpRequest.update({
    where: { id }, data: { status: "ANSWERED", reply: text || null, answeredAt: new Date() },
  });
  if (text) {
    dispatchNotification("coach_help_answered", {
      users: [request.requesterId],
      placeholders: { "{coachName}": await coachDisplayName(coachId), "{reply}": text },
    }).catch(() => {});
  }
  return { ok: true };
}

// ── Neulinge ─────────────────────────────────────────────────────────────────

const NEWCOMER_DAYS = 14;
const OUTREACH_MESSAGE_MAX = 300;

/** Neue Spieler (< 14 Tage dabei) ohne jede Trainings-Anmeldung — samt Status, ob der Coach sie schon kontaktiert hat. */
export async function getNewcomers(coachId: string) {
  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      id: { not: coachId }, createdAt: { gte: new Date(now.getTime() - NEWCOMER_DAYS * 86_400_000) },
      coachTrainingSignups: { none: {} },
    },
    orderBy: { createdAt: "desc" }, take: 30,
    select: { id: true, username: true, name: true, image: true, createdAt: true },
  });
  if (users.length === 0) return { newcomers: [], nextSession: null };

  const ids = users.map(u => u.id);
  const nextSession = await prisma.coachTrainingSession.findFirst({
    where: { coachId, startAt: { gt: now } }, orderBy: { startAt: "asc" }, select: { id: true, title: true, startAt: true },
  });
  const [events, outreach, mentees] = await Promise.all([
    prisma.eventRegistration.groupBy({ by: ["userId"], where: { userId: { in: ids } }, _count: { _all: true } }),
    prisma.coachOutreach.findMany({ where: { coachId, userId: { in: ids } }, select: { userId: true, kind: true } }),
    prisma.coachMentee.findMany({ where: { coachId, menteeId: { in: ids } }, select: { menteeId: true } }),
  ]);
  const eventsBy = new Map(events.map(e => [e.userId, e._count._all]));
  const menteeSet = new Set(mentees.map(m => m.menteeId));

  return {
    nextSession,
    newcomers: users.map(u => ({
      ...u,
      eventsJoined: eventsBy.get(u.id) ?? 0,
      isMentee: menteeSet.has(u.id),
      welcomed: outreach.some(o => o.userId === u.id && o.kind === "welcome"),
      invited: nextSession ? outreach.some(o => o.userId === u.id && o.kind === `invite:${nextSession.id}`) : false,
    })),
  };
}

async function recordOutreach(coachId: string, userId: string, kind: string): Promise<boolean> {
  try {
    await prisma.coachOutreach.create({ data: { coachId, userId, kind } });
    return true;
  } catch {
    return false; // Unique-Verstoß = schon gesendet
  }
}

export async function sendWelcome(coachId: string, userId: string, message?: string): Promise<MutationResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (userId === coachId) return { error: "Ungültiger Empfänger" };
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) return { error: "Spieler nicht gefunden" };
  const text = message?.trim() || "Schön, dass du da bist! Ich helfe beim Einstieg — wenn du Fragen hast, nutze im Community-Board einfach „Hilfe anfragen“.";
  if (text.length > OUTREACH_MESSAGE_MAX) return { error: `Nachricht ist zu lang (max. ${OUTREACH_MESSAGE_MAX} Zeichen)` };

  if (!(await recordOutreach(coachId, userId, "welcome"))) return { error: "Du hast diesem Spieler bereits eine Willkommens-Nachricht geschickt" };
  dispatchNotification("coach_welcome", {
    users: [userId], placeholders: { "{coachName}": await coachDisplayName(coachId), "{message}": text },
  }).catch(() => {});
  return { ok: true };
}

export async function inviteToSession(coachId: string, userId: string, sessionId: string): Promise<MutationResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.coachId !== coachId) return { error: "Termin nicht gefunden" };
  if (session.startAt.getTime() < Date.now()) return { error: "Termin hat bereits begonnen" };
  if (userId === coachId) return { error: "Ungültiger Empfänger" };

  if (!(await recordOutreach(coachId, userId, `invite:${sessionId}`))) return { error: "Dieser Spieler wurde bereits zu diesem Termin eingeladen" };
  notifyParticipants("coach_invite", [userId], { sessionTitle: session.title, when: session.startAt, coachName: await coachDisplayName(coachId) });
  return { ok: true };
}

// ── Spezialgebiete ───────────────────────────────────────────────────────────

const SPECIALTIES_MAX = 6;
const SPECIALTY_LENGTH_MAX = 30;

export async function setSpecialties(coachId: string, list: string[]): Promise<{ ok: true; specialties: string[] } | { error: string }> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  const seen = new Set<string>();
  const specialties: string[] = [];
  for (const raw of list) {
    const tag = raw.trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    if (tag.length > SPECIALTY_LENGTH_MAX) return { error: `Ein Spezialgebiet darf höchstens ${SPECIALTY_LENGTH_MAX} Zeichen lang sein` };
    seen.add(tag.toLowerCase());
    specialties.push(tag);
  }
  if (specialties.length > SPECIALTIES_MAX) return { error: `Höchstens ${SPECIALTIES_MAX} Spezialgebiete möglich` };

  await prisma.communityJobMember.updateMany({
    where: { userId: coachId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } }, data: { specialties },
  });
  return { ok: true, specialties };
}

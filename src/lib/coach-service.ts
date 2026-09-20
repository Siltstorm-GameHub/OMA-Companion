import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
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

export type CreateSessionResult = { ok: true; sessionId: string } | { error: string };

export async function createTrainingSession(
  coachId: string,
  data: { title: string; description?: string; startAt: Date; capacity?: number; discordChannelId?: string },
): Promise<CreateSessionResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (!data.title.trim()) return { error: "Titel erforderlich" };
  if (Number.isNaN(data.startAt.getTime()) || data.startAt.getTime() < Date.now()) return { error: "Termin muss in der Zukunft liegen" };
  if (data.capacity != null && (!Number.isInteger(data.capacity) || data.capacity < 1)) return { error: "Kapazität muss mindestens 1 sein" };

  const session = await prisma.coachTrainingSession.create({
    data: {
      coachId, title: data.title.trim(), description: data.description ?? null,
      startAt: data.startAt, capacity: data.capacity ?? null,
    },
  });
  await prisma.communityJobMember.updateMany({
    where: { userId: coachId, jobKey: JOB_KEY, status: { in: ["ACTIVE", "WARNED"] } },
    data: { lastContributionAt: new Date() },
  });

  // Anders als die anderen Jobs bekommt der Coach keinen festen Admin-Kanal
  // (siehe Discord-Anbindung im Plan — Coach nutzt Sterne-Bewertung statt
  // Reaktionen) — hier entscheidet der Coach selbst je Termin, in welchen
  // Kanal die Einladung geht. Rein informativ, kein Reaktions-Voting.
  if (data.discordChannelId) {
    sendDiscordMessage(data.discordChannelId, {
      title: `🎓 Neuer Trainings-Termin: ${data.title.trim()}`,
      description: data.description || "Neuer Trainings-Termin — meldet euch in der App an!",
      color: DISCORD_COLORS.eventNew,
      fields: [{ name: "📆 Start", value: formatBerlinDateTime(data.startAt, { dateStyle: "full", timeStyle: "short" }), inline: true }],
      footer: { text: "OMA Companion · Community-Jobs · Coach" },
    }).catch(() => {});
  }

  return { ok: true, sessionId: session.id };
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
    },
  });
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

  await prisma.coachTrainingSession.delete({ where: { id: sessionId } });
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

/** Score = Ø Sterne × Anzahl gültiger Bewertungen diese Woche (siehe Plan-Gehaltsstufen). */
registerScoreResolver(JOB_KEY, async (userId, weekStart, weekEnd) => {
  const agg = await prisma.coachRating.aggregate({
    where: {
      coachId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
    _avg: { stars: true }, _count: { _all: true },
  });
  return (agg._avg.stars ?? 0) * agg._count._all;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.coachRating.count({
    where: {
      raterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
      OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
    },
  });
});

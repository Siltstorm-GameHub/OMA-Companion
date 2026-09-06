import { prisma } from "./prisma";
import { registerScoreResolver, registerOwnVoteCounter } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";

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
  data: { title: string; description?: string; startAt: Date; capacity?: number },
): Promise<CreateSessionResult> {
  if (!(await requireActiveCoach(coachId))) return { error: "Du bist gerade kein aktiver Coach" };
  if (!data.title.trim()) return { error: "Titel erforderlich" };
  if (data.startAt.getTime() < Date.now()) return { error: "Termin muss in der Zukunft liegen" };

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
  return { ok: true, sessionId: session.id };
}

export type SignupResult = { ok: true } | { error: string };

export async function signupForSession(userId: string, sessionId: string): Promise<SignupResult> {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, include: { _count: { select: { signups: true } } },
  });
  if (!session) return { error: "Termin nicht gefunden" };
  if (session.coachId === userId) return { error: "Du bist der Coach dieses Termins" };
  if (session.capacity != null && session._count.signups >= session.capacity) return { error: "Termin ist ausgebucht" };

  const existing = await prisma.coachTrainingSignup.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
  }).catch(() => null);
  if (existing) return { error: "Du bist bereits angemeldet" };

  await prisma.coachTrainingSignup.create({ data: { sessionId, userId } });
  return { ok: true };
}

export type RateResult = { ok: true } | { error: string };

/** Bewertung nach einem Trainings-Termin — ein Teilnehmer, ein Rating pro Termin. */
export async function rateAfterTraining(
  raterId: string, coachId: string, trainingSessionId: string, stars: number, reason: string,
): Promise<RateResult> {
  const validation = validateRatingInput(raterId, coachId, stars, reason);
  if (validation) return validation;

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
    where: { coachId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
    _avg: { stars: true }, _count: { _all: true },
  });
  return (agg._avg.stars ?? 0) * agg._count._all;
});

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  return prisma.coachRating.count({
    where: { raterId: userId, createdAt: { gte: weekStart, lt: weekEnd }, disputeResolution: { not: "OVERTURNED" } },
  });
});

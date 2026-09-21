import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";

/**
 * Werbe-Anfragen: Ein Coach bittet die Marketing Manager, einen seiner Trainings-Termine zu bewerben.
 * Ein Manager erfüllt die Anfrage mit einem Werbe-Post zum Termin (siehe createMarketingPost mit trainingSessionId).
 */

const NOTE_MAX = 300;
const MAX_OPEN_PER_COACH = 3;

export type PromotionResult = { ok: true } | { error: string };

export async function createPromotionRequest(requesterId: string, data: { trainingSessionId: string; note?: string }): Promise<PromotionResult> {
  const coach = await prisma.communityJobMember.findFirst({ where: { userId: requesterId, jobKey: "coach", status: { in: ["ACTIVE", "WARNED"] } } });
  if (!coach) return { error: "Nur aktive Coaches können Werbung für ihre Trainings anfragen" };

  const session = await prisma.coachTrainingSession.findUnique({ where: { id: data.trainingSessionId } });
  if (!session || session.coachId !== requesterId) return { error: "Termin nicht gefunden" };
  if (session.startAt.getTime() < Date.now()) return { error: "Der Termin liegt in der Vergangenheit" };
  const note = data.note?.trim().slice(0, NOTE_MAX) || null;

  const [existing, open, posted] = await Promise.all([
    prisma.promotionRequest.findFirst({ where: { trainingSessionId: session.id, status: "OPEN" }, select: { id: true } }),
    prisma.promotionRequest.count({ where: { requesterId, status: "OPEN" } }),
    prisma.marketingPost.count({ where: { trainingSessionId: session.id, hiddenByAdminAt: null } }),
  ]);
  if (existing) return { error: "Für diesen Termin läuft schon eine Anfrage" };
  if (posted > 0) return { error: "Dieser Termin wird bereits beworben" };
  if (open >= MAX_OPEN_PER_COACH) return { error: `Du hast schon ${MAX_OPEN_PER_COACH} offene Werbe-Anfragen` };

  await prisma.promotionRequest.create({ data: { requesterId, trainingSessionId: session.id, note } });

  const [managers, user] = await Promise.all([
    prisma.communityJobMember.findMany({ where: { jobKey: "marketing_manager", status: { in: ["ACTIVE", "WARNED"] } }, select: { userId: true } }),
    prisma.user.findUnique({ where: { id: requesterId }, select: { username: true, name: true } }),
  ]);
  if (managers.length > 0) {
    dispatchNotification("promotion_request", {
      users: managers.map(m => m.userId),
      placeholders: {
        "{requesterName}": user?.username ?? user?.name ?? "Ein Coach", "{title}": session.title,
        "{date}": session.startAt.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit" }),
      },
    }).catch(() => {});
  }
  return { ok: true };
}

export async function listOpenPromotionRequests() {
  const items = await prisma.promotionRequest.findMany({
    where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 30,
    include: { requester: { select: { id: true, username: true, name: true } } },
  });
  const sessions = await prisma.coachTrainingSession.findMany({
    where: { id: { in: items.map(i => i.trainingSessionId) } },
    select: { id: true, title: true, startAt: true, eventId: true, meetingUrl: true },
  });
  const byId = new Map(sessions.map(s => [s.id, s]));
  // Vergangene Termine sind nicht mehr bewerbbar.
  return items.flatMap(i => {
    const s = byId.get(i.trainingSessionId);
    return s && s.startAt.getTime() > Date.now() ? [{ ...i, session: s }] : [];
  });
}

/** Status je Termin für die Terminliste des Coaches: offen / erledigt. */
export async function promotionStatusForCoach(coachId: string) {
  const [requests, posts] = await Promise.all([
    prisma.promotionRequest.findMany({ where: { requesterId: coachId, status: "OPEN" }, select: { trainingSessionId: true } }),
    prisma.marketingPost.findMany({ where: { trainingSessionId: { not: null }, hiddenByAdminAt: null, createdAt: { gte: new Date(Date.now() - 120 * 86_400_000) } }, select: { trainingSessionId: true } }),
  ]);
  return {
    requested: requests.map(r => r.trainingSessionId),
    promoted: [...new Set(posts.map(p => p.trainingSessionId).filter((x): x is string => !!x))],
  };
}

/** Vom Marketing-Manager-Service aufgerufen, wenn ein Post zu einem Termin entsteht: offene Anfragen erfüllen, Coach informieren. */
export async function fulfillPromotionRequests(trainingSessionId: string, postId: string): Promise<void> {
  const open = await prisma.promotionRequest.findMany({ where: { trainingSessionId, status: "OPEN" } });
  if (open.length === 0) return;
  await prisma.promotionRequest.updateMany({ where: { trainingSessionId, status: "OPEN" }, data: { status: "FULFILLED", postId, fulfilledAt: new Date() } });
  const session = await prisma.coachTrainingSession.findUnique({ where: { id: trainingSessionId }, select: { title: true } });
  dispatchNotification("promotion_fulfilled", {
    users: [...new Set(open.map(o => o.requesterId))], placeholders: { "{title}": session?.title ?? "Dein Training" },
  }).catch(() => {});
}

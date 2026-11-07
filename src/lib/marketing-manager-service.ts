import { prisma } from "./prisma";
import { canWorkCommunityJobs } from "./community-job-access";
import { postDisplayTitle } from "./post-display";
import { dispatchNotification } from "./notify-dispatch";

/**
 * Werbe-Werkzeuge des Content Creators: Event-/Trainings-Fakten für die Werbe-Vorlagen, Kampagnen
 * (Ankündigung → Erinnerung → Heute) und die Admin-Bestätigung "extern gepostet". Werbe-Posts selbst
 * sind seit der Zusammenlegung Beiträge (journalist-service.ts); die Tabelle MarketingPost ist Archiv.
 */

export type MutationResult = { ok: true } | { error: string };
export type VoteResult = { ok: true } | { error: string };

/** Admin bestätigt, dass ein Beitrag extern (z.B. Instagram) gepostet wurde — seit der Zusammenlegung ein Beitrag (JobReport). */
export async function setAdminConfirmedPosted(postId: string, confirmed: boolean): Promise<VoteResult> {
  const post = await prisma.jobReport.findUnique({
    where: { id: postId }, select: { authorId: true, title: true, bodyMarkdown: true, confirmedNotified: true },
  });
  if (!post) return { error: "Beitrag nicht gefunden" };
  await prisma.jobReport.update({ where: { id: postId }, data: { adminConfirmedPosted: confirmed } });
  // Einmalig: Autor erfährt, dass sein Beitrag extern veröffentlicht wurde.
  if (confirmed && !post.confirmedNotified) {
    await prisma.jobReport.update({ where: { id: postId }, data: { confirmedNotified: true } });
    dispatchNotification("marketing_post_confirmed", {
      users: [post.authorId],
      placeholders: { "{title}": postDisplayTitle(post).slice(0, 80), "{url}": `/community-board/report/${postId}` },
    }).catch(() => {});
  }
  return { ok: true };
}

// ── Event-Fakten, Kampagnen, Auswertung ──────────────────────────────────────

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://oma-app.de";

export async function getMarketingEventFacts(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, game: true, startAt: true, hidden: true, coverImageUrl: true, maxPlayers: true,
      _count: { select: { registrations: true } },
    },
  });
  if (!event || event.hidden) return null;
  return {
    id: event.id, title: event.title, game: event.game, startAt: event.startAt.toISOString(),
    registered: event._count.registrations, url: `${BASE_URL}/tournament/${event.id}`,
    imageUrl: event.coverImageUrl, maxPlayers: event.maxPlayers,
  };
}

/** Fakten zu einem Coach-Trainings-Termin für den Werbetext-Baukasten. */
export async function getMarketingTrainingFacts(sessionId: string) {
  const session = await prisma.coachTrainingSession.findUnique({
    where: { id: sessionId }, select: { id: true, title: true, startAt: true, _count: { select: { signups: true } } },
  });
  if (!session) return null;
  return {
    id: session.id, title: session.title, game: null as string | null, startAt: session.startAt.toISOString(),
    registered: session._count.signups, url: `${BASE_URL}/profile`, training: true,
  };
}

export async function createCampaign(authorId: string, data: { eventId: string; title?: string }): Promise<{ ok: true; campaignId: string } | { error: string }> {
  if (!(await canWorkCommunityJobs(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
  const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { title: true, startAt: true, hidden: true } });
  if (!event || event.hidden) return { error: "Event nicht gefunden" };
  if (event.startAt.getTime() < Date.now()) return { error: "Das Event hat schon begonnen" };
  const existing = await prisma.marketingCampaign.findFirst({ where: { authorId, eventId: data.eventId }, select: { id: true } });
  if (existing) return { error: "Für dieses Event hast du schon eine Kampagne" };
  const campaign = await prisma.marketingCampaign.create({
    data: { authorId, eventId: data.eventId, title: data.title?.trim().slice(0, 80) || `Kampagne: ${event.title}` },
  });
  return { ok: true, campaignId: campaign.id };
}

export async function listMyCampaigns(userId: string) {
  return prisma.marketingCampaign.findMany({
    where: { authorId: userId, event: { startAt: { gte: new Date(Date.now() - 86_400_000) } } },
    orderBy: { event: { startAt: "asc" } },
    select: {
      id: true, title: true, eventId: true,
      event: { select: { id: true, title: true, startAt: true } },
      // Seit der Zusammenlegung sind Kampagnen-Schritte Beiträge (JobReport.template = Schritt).
      reports: {
        where: { OR: [{ isDraft: false }, { scheduledAt: { not: null } }] }, orderBy: { publishedAt: "asc" },
        select: { id: true, template: true, publishedAt: true, scheduledAt: true, isDraft: true },
      },
    },
  }).then(list => list.map(({ reports, ...c }) => ({
    ...c,
    posts: reports.map(r => ({ id: r.id, kind: r.template, createdAt: r.publishedAt, scheduledAt: r.isDraft ? r.scheduledAt : null })),
  })));
}

export async function deleteCampaign(authorId: string, campaignId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const campaign = await prisma.marketingCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "Kampagne nicht gefunden" };
  if (campaign.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diese Kampagne zu löschen" };
  await prisma.marketingCampaign.delete({ where: { id: campaignId } }); // Posts bleiben erhalten (campaignId → null)
  return { ok: true };
}


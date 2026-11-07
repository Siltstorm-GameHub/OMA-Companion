import { prisma } from "./prisma";
import { isGameCoverUrl } from "./game-cover-url";
import type { ScoreStream } from "./score-engine";
import { canWorkCommunityJobs, recordContribution, overLimitNotice } from "./community-job-access";
import { registerOwnVoteCounter, getWeekBounds } from "./community-job-service";
import { onCommunityJobVoteCast } from "./community-job-vote-incentives";
import { announceCommunityJobContent } from "./discord-community-jobs";
import { getCommunityJob, CONTENT_CREATOR_KEY } from "./community-jobs";
import { getAnnouncementChannel } from "./community-job-config";
import { isVideoUrl } from "./upload-limits";
import { isReportCategory, reportCategoryLabel, REPORT_TITLE_MAX, REPORT_BODY_MAX, CONTRIBUTION_MAX } from "./report-categories";
import { plainExcerpt } from "./report-text";
import { dispatchNotification } from "./notify-dispatch";
import { notifyAssetUsed } from "./fotograf-service";
import { extractMentionedUserIds } from "./report-mentions";
import { isMarketingTemplate } from "./marketing-templates";
import { fulfillPromotionRequests } from "./promotion-request-service";
import { fulfillPhotoRequest } from "./photo-request-service";
import { POST_MEDIA_MAX, isAllowedMediaUrl, postDisplayTitle } from "./post-display";
import { validatePoll, savePollForReport } from "./post-poll-service";
import type { PollInput } from "./post-poll";

export function appBaseUrl(): string { return process.env.NEXTAUTH_URL ?? "https://oma-app.de"; }
export function reportPath(id: string): string { return `/community-board/report/${id}`; }

async function userDisplayName(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, name: true } }).catch(() => null);
  return u?.username ?? u?.name ?? "Jemand";
}

/** Benachrichtigt neu genannte Nutzer (`[@Name](user:id)`), je Bericht nur einmal pro Person. */
async function notifyMentions(reportId: string, authorId: string, title: string, body: string): Promise<void> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId }, select: { notifiedMentions: true } });
  if (!report) return;
  const wanted = extractMentionedUserIds(body).filter(id => id !== authorId && !report.notifiedMentions.includes(id));
  if (wanted.length === 0) return;
  const existing = await prisma.user.findMany({ where: { id: { in: wanted } }, select: { id: true } });
  const ids = existing.map(u => u.id);
  if (ids.length === 0) return;
  await prisma.jobReport.update({ where: { id: reportId }, data: { notifiedMentions: [...report.notifiedMentions, ...ids] } });
  dispatchNotification("report_mention", {
    users: ids, placeholders: { "{authorName}": await userDisplayName(authorId), "{title}": title, "{url}": reportPath(reportId) },
  }).catch(() => {});
}

async function validateSeries(authorId: string, seriesId: string | null | undefined): Promise<string | null> {
  if (!seriesId) return null;
  const series = await prisma.reportSeries.findUnique({ where: { id: seriesId }, select: { authorId: true } });
  return series && series.authorId === authorId ? null : "Reihe nicht gefunden";
}

/**
 * Journalist: Berichte + Ergänzungen anderer Journalisten, Daumen-hoch-Bewertung.
 * Siehe Plan-Abschnitt "Zusammengesetzte Beiträge" — ein Bericht kann ein
 * Fotograf-Bild als Cover haben und von mehreren Journalisten ergänzt werden,
 * jede Komponente wird unabhängig bewertet und dem jeweiligen Autor angerechnet.
 * Berichte können als Entwurf gespeichert werden (nur für den Autor sichtbar, nicht im
 * Board, keine Bewertung, kein Discord-Post) und später veröffentlicht werden.
 */

/** Seit der Zusammenlegung: Beiträge zählen für den Content Creator (Gehalt, Tageslimit, Ankündigungskanal). */
const JOB_KEY = CONTENT_CREATOR_KEY;

/** Offene Jobs: jeder (nicht gelöschte) User darf als Journalist schreiben. */
async function requireActiveJournalist(userId: string): Promise<boolean> {
  return canWorkCommunityJobs(userId);
}

/** Bild/Clip eines Beitrags: `id` = schon gespeichertes Medium dieses Beitrags, sonst neuer Upload (`url`). */
export interface PostMediaInput {
  id?: string; url: string; caption?: string | null; type?: string | null;
  /** Clips: Wiedergabe-Bereich in Sekunden und gewähltes Vorschaubild. */
  clipStart?: number | null; clipEnd?: number | null; posterUrl?: string | null;
}

/**
 * Ein "Beitrag" (früher Bericht, Fotos/Clips oder Werbe-Post): Titel optional, Text und/oder Bilder/Clips,
 * optional Event, Werbe-Vorlage, Kampagne, beworbener Trainings-Termin oder erfüllter Bildwunsch.
 */
interface ReportInput {
  title: string; bodyMarkdown: string; category?: string | null; eventId?: string | null;
  coverAssetId?: string | null; seriesId?: string | null;
  /** Spiel-Cover statt Fotograf-Bild als Titelbild (schließt coverAssetId aus). */
  gameCoverUrl?: string | null; gameCoverName?: string | null;
  /** Bilder/Clips in Reihenfolge — `undefined` = unverändert (beim Bearbeiten). */
  media?: PostMediaInput[];
  /** Album für neu hochgeladene Bilder (optional). */
  albumId?: string | null;
  template?: string | null; campaignId?: string | null; trainingSessionId?: string | null;
  /** Bildwunsch, den dieser Beitrag erfüllt (erstes Bild wird verknüpft). */
  photoRequestId?: string | null;
  /** Geplant veröffentlichen: Beitrag bleibt Entwurf und erscheint automatisch zu diesem Zeitpunkt. null = Planung aufheben. */
  scheduledAt?: Date | null;
  /** Umfrage im Beitrag — Objekt = anlegen/ersetzen (solange keine Stimmen), null = entfernen, undefined = unverändert. */
  poll?: PollInput | null;
}

const SCHEDULE_MAX_DAYS = 60;

function validateSchedule(at: Date | null | undefined): string | null {
  if (!at) return null;
  if (Number.isNaN(at.getTime())) return "Ungültiger Zeitpunkt";
  if (at.getTime() < Date.now() + 60_000) return "Der geplante Zeitpunkt muss in der Zukunft liegen";
  if (at.getTime() > Date.now() + SCHEDULE_MAX_DAYS * 86_400_000) return `Höchstens ${SCHEDULE_MAX_DAYS} Tage im Voraus planbar`;
  return null;
}

const MEDIA_TYPES = ["CLIP", "COLLAGE", "SCREENSHOT", "BANNER", "GRAPHIC"];

/** Prüft die Beitrags-Zusätze (Medien, Werbe-Vorlage, Kampagne, Training, Album). */
async function validatePostExtras(authorId: string, data: Partial<ReportInput>): Promise<string | null> {
  if (data.media) {
    if (data.media.length > POST_MEDIA_MAX) return `Höchstens ${POST_MEDIA_MAX} Bilder/Clips pro Beitrag`;
    for (const m of data.media) {
      if (!m.id && !isAllowedMediaUrl(m.url)) return "Ungültige Datei (nur eigene Uploads)";
      if (m.caption && m.caption.length > 300) return "Bildunterschrift ist zu lang (max. 300 Zeichen)";
      if (m.posterUrl && !isAllowedMediaUrl(m.posterUrl)) return "Ungültiges Vorschaubild";
      if (m.clipStart != null && (!Number.isFinite(m.clipStart) || m.clipStart < 0)) return "Ungültiger Clip-Start";
      if (m.clipEnd != null && (!Number.isFinite(m.clipEnd) || m.clipEnd <= (m.clipStart ?? 0))) return "Clip-Ende muss nach dem Start liegen";
    }
  }
  if (data.template && !isMarketingTemplate(data.template)) return "Ungültige Werbe-Vorlage";
  if (data.campaignId && !(await prisma.marketingCampaign.findFirst({ where: { id: data.campaignId, authorId }, select: { id: true } }))) {
    return "Kampagne nicht gefunden";
  }
  if (data.trainingSessionId && !(await prisma.coachTrainingSession.findUnique({ where: { id: data.trainingSessionId }, select: { id: true } }))) {
    return "Trainings-Termin nicht gefunden";
  }
  if (data.albumId && !(await prisma.jobMediaAlbum.findFirst({ where: { id: data.albumId, authorId }, select: { id: true } }))) {
    return "Album nicht gefunden";
  }
  return validateSchedule(data.scheduledAt);
}

/**
 * Setzt die Bilder/Clips eines Beitrags auf genau die übergebene Liste: neue Uploads werden als Medium
 * (Mediathek) angelegt, bestehende umsortiert/umbeschriftet, entfernte nur gelöst (bleiben in der Mediathek).
 * Gibt die IDs in Reihenfolge zurück.
 */
async function syncReportMedia(
  reportId: string, authorId: string, eventId: string | null, media: PostMediaInput[], albumId?: string | null,
): Promise<string[]> {
  const current = await prisma.jobMediaAsset.findMany({ where: { reportId }, select: { id: true } });
  const currentIds = new Set(current.map(c => c.id));
  const ids: string[] = [];
  for (const [position, m] of media.entries()) {
    const caption = m.caption?.trim() || null;
    const clip = { clipStart: m.clipStart ?? null, clipEnd: m.clipEnd ?? null, posterUrl: m.posterUrl || null };
    if (m.id && currentIds.has(m.id)) {
      await prisma.jobMediaAsset.update({ where: { id: m.id }, data: { position, caption, ...clip } });
      ids.push(m.id);
      continue;
    }
    if (!isAllowedMediaUrl(m.url)) continue;
    const type = m.type && MEDIA_TYPES.includes(m.type) ? m.type : isVideoUrl(m.url) ? "CLIP" : "SCREENSHOT";
    const created = await prisma.jobMediaAsset.create({
      data: { authorId, eventId, url: m.url, caption, type, reportId, position, albumId: albumId || null, ...(type === "CLIP" ? clip : {}) },
    });
    ids.push(created.id);
  }
  const keep = new Set(ids);
  const detach = [...currentIds].filter(id => !keep.has(id));
  if (detach.length > 0) await prisma.jobMediaAsset.updateMany({ where: { id: { in: detach } }, data: { reportId: null } });
  return ids;
}

/** Nach dem Veröffentlichen: beworbenen Termin als "beworben" melden und einen Bildwunsch erfüllen. */
async function afterPublishExtras(reportId: string, authorId: string, trainingSessionId: string | null, photoRequestId?: string | null): Promise<void> {
  if (trainingSessionId) await fulfillPromotionRequests(trainingSessionId, reportId).catch(() => {});
  if (photoRequestId) {
    const first = await prisma.jobMediaAsset.findFirst({ where: { reportId }, orderBy: { position: "asc" }, select: { id: true } });
    if (first) await fulfillPhotoRequest(authorId, photoRequestId, first.id).catch(() => {});
  }
}

/** Prüft Länge/Kategorie und dass verknüpfte Datensätze existieren (Cover nur Standbilder, kein Video). */
async function validateReportRefs(data: Partial<ReportInput>): Promise<string | null> {
  // Titel ist optional (reine Foto-/Werbe-Beiträge); dass Text ODER Bild vorhanden ist, prüft hasContent().
  if (data.title !== undefined && data.title.trim().length > REPORT_TITLE_MAX) return `Titel ist zu lang (max. ${REPORT_TITLE_MAX} Zeichen)`;
  if (data.bodyMarkdown !== undefined && data.bodyMarkdown.length > REPORT_BODY_MAX) return `Text ist zu lang (max. ${REPORT_BODY_MAX} Zeichen)`;
  if (data.category && !isReportCategory(data.category)) return "Ungültige Kategorie";
  if (data.eventId && !(await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } }))) return "Event nicht gefunden";
  if (data.gameCoverUrl && !isGameCoverUrl(data.gameCoverUrl)) return "Ungültiges Spiel-Cover";
  if (data.gameCoverName && data.gameCoverName.length > 100) return "Spielname ist zu lang";
  if (data.coverAssetId) {
    const asset = await prisma.jobMediaAsset.findUnique({ where: { id: data.coverAssetId }, select: { url: true, hiddenByAdminAt: true } });
    if (!asset || asset.hiddenByAdminAt) return "Titelbild nicht gefunden";
    if (isVideoUrl(asset.url)) return "Als Titelbild ist nur ein Standbild möglich, kein Video";
  }
  return null;
}

export type CreateReportResult = { ok: true; reportId: string; notice?: string } | { error: string };

/** `draft: true` speichert nur einen Entwurf (kein Discord-Post, zählt nicht als Beitrag für die Aktivität). */
export async function createReport(
  authorId: string,
  data: ReportInput & { draft?: boolean },
): Promise<CreateReportResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
  const invalid = (await validateReportRefs(data)) ?? (await validateSeries(authorId, data.seriesId)) ?? (await validatePostExtras(authorId, data));
  if (invalid) return { error: invalid };
  if (data.poll) {
    const pollError = await validatePoll(data.poll, data.eventId || null);
    if (pollError) return { error: pollError };
  }
  const hasContent = !!data.bodyMarkdown.trim() || (data.media?.length ?? 0) > 0 || !!data.coverAssetId || !!data.gameCoverUrl || !!data.poll;
  if (!hasContent) return { error: "Schreib einen Text oder füge ein Bild/einen Clip hinzu" };

  const report = await prisma.jobReport.create({
    data: {
      authorId, title: data.title.trim(), bodyMarkdown: data.bodyMarkdown,
      eventId: data.eventId || null,
      coverAssetId: data.gameCoverUrl ? null : data.coverAssetId || null,
      gameCoverUrl: data.gameCoverUrl || null, gameCoverName: data.gameCoverUrl ? data.gameCoverName?.trim() || null : null,
      category: data.category || null, seriesId: data.seriesId || null, isDraft: data.draft === true || !!data.scheduledAt,
      template: data.template || null, campaignId: data.campaignId || null, trainingSessionId: data.trainingSessionId || null,
      scheduledAt: data.scheduledAt ?? null,
    },
  });
  const isDraft = data.draft === true || !!data.scheduledAt;
  if (data.media?.length) await syncReportMedia(report.id, authorId, data.eventId || null, data.media, data.albumId);
  if (data.poll) await savePollForReport(report.id, data.eventId || null, data.poll);
  const displayTitle = postDisplayTitle({ title: data.title, bodyMarkdown: data.bodyMarkdown, mediaCount: data.media?.length });
  const notice = isDraft ? undefined : await afterPublish(report.id, authorId, displayTitle, data.bodyMarkdown, data.category ?? null);
  if (!isDraft) await afterPublishExtras(report.id, authorId, data.trainingSessionId || null, data.photoRequestId);
  if (data.coverAssetId && !data.gameCoverUrl && !isDraft) notifyAssetUsed(data.coverAssetId, authorId, "report", displayTitle, reportPath(report.id)).catch(() => {});
  return { ok: true, reportId: report.id, notice };
}

/** Gemeinsam für "direkt veröffentlicht" und "Entwurf veröffentlicht": Tageslimit buchen + Discord-Ankündigung. Gibt ggf. einen Limit-Hinweis zurück. */
async function afterPublish(reportId: string, authorId: string, title: string, body: string, category: string | null): Promise<string | undefined> {
  const booked = await recordContribution(authorId, JOB_KEY, "report", [reportId]);
  announceAndStore(reportId, authorId, title, body, category).catch(() => {});
  notifyMentions(reportId, authorId, title, body).catch(() => {});
  return overLimitNotice(booked);
}

async function announceAndStore(reportId: string, authorId: string, title: string, body: string, category: string | null): Promise<void> {
  const [author, channelId] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorId }, select: { username: true, name: true } }),
    getAnnouncementChannel(JOB_KEY),
  ]);
  const label = reportCategoryLabel(category);
  // Vorschaubild: Titelbild, sonst Spiel-Cover, sonst erstes Bild des Beitrags (keine Clips).
  const post = await prisma.jobReport.findUnique({
    where: { id: reportId },
    select: { gameCoverUrl: true, coverAsset: { select: { url: true } }, media: { orderBy: { position: "asc" }, select: { url: true } } },
  });
  const imageUrl = post?.coverAsset?.url ?? post?.gameCoverUrl ?? post?.media.find(m => !isVideoUrl(m.url))?.url;
  const messageId = await announceCommunityJobContent({
    title: label ? `${label}: ${title}` : title, description: plainExcerpt(body, 300),
    authorName: author?.username ?? author?.name ?? "Unbekannt",
    jobEmoji: getCommunityJob(CONTENT_CREATOR_KEY)?.emoji ?? "🎬", channelId, imageUrl,
    url: `${appBaseUrl()}${reportPath(reportId)}`,
  });
  if (messageId) await prisma.jobReport.update({ where: { id: reportId }, data: { discordMessageId: messageId } });
}

/** Entwurf veröffentlichen: ab jetzt im Board sichtbar und bewertbar (Veröffentlichungsdatum = jetzt). */
export async function publishReport(authorId: string, reportId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu veröffentlichen" };
  if (!report.isDraft) return { error: "Bericht ist bereits veröffentlicht" };
  if (!(await requireActiveJournalist(report.authorId))) return { error: "Community-Jobs sind für dieses Konto nicht verfügbar" };

  await prisma.jobReport.update({ where: { id: reportId }, data: { isDraft: false, publishedAt: new Date(), scheduledAt: null } });
  const mediaCount = await prisma.jobMediaAsset.count({ where: { reportId } });
  const notice = await afterPublish(reportId, report.authorId, postDisplayTitle({ ...report, mediaCount }), report.bodyMarkdown, report.category);
  await afterPublishExtras(reportId, report.authorId, report.trainingSessionId);
  return { ok: true, notice };
}

/**
 * Geplante Beiträge veröffentlichen, deren Zeitpunkt erreicht ist. Es gibt keinen Minuten-Cron —
 * deshalb lazy beim Laden von Dashboard/Event-Seiten/Board (siehe event-lifecycle.ts, community-board)
 * und zusätzlich im täglichen Community-Job-Cron. Jeder Beitrag wird atomar "beansprucht", damit er
 * bei gleichzeitigen Aufrufen nur einmal veröffentlicht und angekündigt wird.
 */
let lastScheduledCheck = 0;
export async function publishDueScheduledPosts(now: Date = new Date()): Promise<{ published: number }> {
  if (now.getTime() - lastScheduledCheck < 30_000) return { published: 0 }; // höchstens alle 30 s je Server-Instanz
  lastScheduledCheck = now.getTime();
  const due = await prisma.jobReport.findMany({
    where: { isDraft: true, scheduledAt: { lte: now } }, orderBy: { scheduledAt: "asc" }, take: 20,
    select: { id: true, authorId: true, title: true, bodyMarkdown: true, category: true, trainingSessionId: true },
  });
  let published = 0;
  for (const r of due) {
    const claimed = await prisma.jobReport.updateMany({
      where: { id: r.id, isDraft: true, scheduledAt: { lte: now } },
      data: { isDraft: false, publishedAt: now, scheduledAt: null },
    });
    if (claimed.count === 0) continue;
    published++;
    const mediaCount = await prisma.jobMediaAsset.count({ where: { reportId: r.id } });
    await afterPublish(r.id, r.authorId, postDisplayTitle({ ...r, mediaCount }), r.bodyMarkdown, r.category).catch(() => {});
    await afterPublishExtras(r.id, r.authorId, r.trainingSessionId).catch(() => {});
    dispatchNotification("post_scheduled_published", {
      users: [r.authorId], placeholders: { "{title}": postDisplayTitle({ ...r, mediaCount }), "{url}": reportPath(r.id) },
    }).catch(() => {});
  }
  return { published };
}

/** Für den Lese-Ansicht/Bearbeiten-Abruf: Entwürfe nur für Autor bzw. Admin. */
export async function getReportForViewer(viewerId: string, reportId: string, opts: { isAdmin?: boolean } = {}) {
  const report = await prisma.jobReport.findUnique({
    where: { id: reportId },
    include: {
      event: { select: { id: true, title: true } },
      media: { orderBy: { position: "asc" }, select: { id: true, url: true, caption: true, type: true, clipStart: true, clipEnd: true, posterUrl: true } },
      poll: { include: { options: { orderBy: { position: "asc" }, select: { id: true, label: true } }, _count: { select: { votes: true } } } },
    },
  });
  if (!report || report.hiddenByAdminAt) return null;
  if (report.isDraft && report.authorId !== viewerId && !opts.isAdmin) return null;
  const { poll, ...rest } = report;
  // Umfrage im Editor-Format — nur für den Autor (die Quiz-Antwort bleibt sonst bis zur Auflösung geheim).
  const editPoll = poll && report.authorId === viewerId ? {
    question: poll.question, kind: poll.kind, options: poll.options.map(o => o.label),
    correctIndex: poll.correctOptionId ? poll.options.findIndex(o => o.id === poll.correctOptionId) : null,
    participationReward: poll.participationReward, correctReward: poll.correctReward,
    closesAt: poll.closesAt ? poll.closesAt.toISOString() : null, locked: poll._count.votes > 0,
  } : null;
  return { ...rest, poll: editPoll };
}

export type ContributeResult = { ok: true; contributionId: string; notice?: string } | { error: string };

/** Jeder aktive Journalist darf frei, ohne Freigabe des Original-Autors, ergänzen. */
export async function addContribution(
  authorId: string, reportId: string, bodyMarkdown: string,
): Promise<ContributeResult> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };
  if (bodyMarkdown.length > CONTRIBUTION_MAX) return { error: `Ergänzung ist zu lang (max. ${CONTRIBUTION_MAX} Zeichen)` };

  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report || report.isDraft || report.hiddenByAdminAt) return { error: "Bericht nicht gefunden" };

  const contribution = await prisma.jobReportContribution.create({
    data: { reportId, authorId, bodyMarkdown: bodyMarkdown.trim() },
  });
  const booked = await recordContribution(authorId, JOB_KEY, "contribution", [contribution.id]);

  // Autor benachrichtigen + in der Ergänzung genannte Personen (der Autor selbst bekommt nur die Ergänzungs-Nachricht).
  const authorName = await userDisplayName(authorId);
  const placeholders = { "{authorName}": authorName, "{title}": report.title, "{url}": reportPath(reportId) };
  // Den Autor informiert die tägliche Sammel-Benachrichtigung (content-digest.ts) statt einer Einzelmeldung.
  const mentioned = extractMentionedUserIds(bodyMarkdown).filter(id => id !== authorId && id !== report.authorId);
  if (mentioned.length > 0) {
    const existing = await prisma.user.findMany({ where: { id: { in: mentioned } }, select: { id: true } });
    if (existing.length > 0) dispatchNotification("report_mention", { users: existing.map(u => u.id), placeholders }).catch(() => {});
  }
  return { ok: true, contributionId: contribution.id, notice: overLimitNotice(booked) };
}

export type MutationResult = { ok: true; notice?: string } | { error: string };

/**
 * Autor ODER Admin (isAdmin) darf bearbeiten. `bodyMarkdown` ist bewusst optional
 * (bleibt unverändert, wenn nicht mitgegeben) — die Admin-Moderationsansicht
 * bearbeitet dort nur Titel + Bild. Verknüpfungen: `null` = entfernen, `undefined` = unverändert.
 */
export async function updateReport(
  authorId: string, reportId: string,
  data: {
    title: string; bodyMarkdown?: string; coverAssetId?: string | null; category?: string | null;
    gameCoverUrl?: string | null; gameCoverName?: string | null;
    eventId?: string | null; seriesId?: string | null; editNote?: string;
    media?: PostMediaInput[]; albumId?: string | null;
    template?: string | null; campaignId?: string | null; trainingSessionId?: string | null;
    scheduledAt?: Date | null;
    poll?: PollInput | null;
  },
  opts: { isAdmin?: boolean } = {},
): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu bearbeiten" };
  const invalid = (await validateReportRefs(data)) ?? (await validateSeries(report.authorId, data.seriesId)) ?? (await validatePostExtras(report.authorId, data));
  if (invalid) return { error: invalid };
  const nextBody = data.bodyMarkdown ?? report.bodyMarkdown;
  const nextMediaCount = data.media !== undefined ? data.media.length : await prisma.jobMediaAsset.count({ where: { reportId } });
  const nextHasCover = data.coverAssetId !== undefined || data.gameCoverUrl !== undefined
    ? !!data.coverAssetId || !!data.gameCoverUrl : !!report.coverAssetId || !!report.gameCoverUrl;
  if (!nextBody.trim() && nextMediaCount === 0 && !nextHasCover) return { error: "Schreib einen Text oder füge ein Bild/einen Clip hinzu" };
  if (data.scheduledAt && !report.isDraft) return { error: "Nur Entwürfe lassen sich zeitlich planen" };
  const nextEventId = data.eventId !== undefined ? data.eventId || null : report.eventId;
  if (data.poll) {
    const hasVotes = await prisma.postPollVote.count({ where: { poll: { reportId } } });
    if (!hasVotes) {
      const pollError = await validatePoll(data.poll, nextEventId);
      if (pollError) return { error: pollError };
    }
  }

  // Veröffentlichte Berichte: bei inhaltlicher Änderung die alte Fassung sichern und "Korrigiert am" setzen.
  const contentChanged = !report.isDraft
    && (data.title.trim() !== report.title || (data.bodyMarkdown !== undefined && data.bodyMarkdown !== report.bodyMarkdown));
  const note = data.editNote?.trim().slice(0, 200) || null;

  const revisionOps = contentChanged
    ? [prisma.jobReportRevision.create({ data: { reportId, title: report.title, bodyMarkdown: report.bodyMarkdown, note } })]
    : [];
  await prisma.$transaction([...revisionOps, prisma.jobReport.update({
    where: { id: reportId },
    data: {
      ...(contentChanged ? { editedAt: new Date(), lastEditNote: note } : {}),
      ...(data.seriesId !== undefined ? { seriesId: data.seriesId || null } : {}),
      title: data.title.trim(),
      ...(data.bodyMarkdown !== undefined ? { bodyMarkdown: data.bodyMarkdown } : {}),
      ...(data.coverAssetId !== undefined ? { coverAssetId: data.coverAssetId } : {}),
      // Titelbild ist entweder ein Fotograf-Bild oder ein Spiel-Cover — das eine löscht das andere.
      ...(data.gameCoverUrl ? { coverAssetId: null, gameCoverUrl: data.gameCoverUrl, gameCoverName: data.gameCoverName?.trim() || null }
        : data.gameCoverUrl === null || data.coverAssetId ? { gameCoverUrl: null, gameCoverName: null } : {}),
      ...(data.category !== undefined ? { category: data.category || null } : {}),
      ...(data.eventId !== undefined ? { eventId: data.eventId || null } : {}),
      ...(data.template !== undefined ? { template: data.template || null } : {}),
      ...(data.campaignId !== undefined ? { campaignId: data.campaignId || null } : {}),
      ...(data.trainingSessionId !== undefined ? { trainingSessionId: data.trainingSessionId || null } : {}),
      ...(data.scheduledAt !== undefined && report.isDraft ? { scheduledAt: data.scheduledAt } : {}),
    },
  })]);
  if (data.media !== undefined) await syncReportMedia(reportId, report.authorId, nextEventId, data.media, data.albumId);
  const pollError = await savePollForReport(reportId, nextEventId, data.poll);
  if (pollError) return { error: pollError };
  if (!report.isDraft) notifyMentions(reportId, report.authorId, postDisplayTitle({ title: data.title, bodyMarkdown: nextBody, mediaCount: nextMediaCount }), nextBody).catch(() => {});
  if (!report.isDraft && data.coverAssetId && !data.gameCoverUrl && data.coverAssetId !== report.coverAssetId) {
    notifyAssetUsed(data.coverAssetId, report.authorId, "report", data.title.trim(), reportPath(reportId)).catch(() => {});
  }
  return { ok: true };
}

export async function deleteReport(authorId: string, reportId: string, opts: { isAdmin?: boolean } = {}): Promise<MutationResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report) return { error: "Bericht nicht gefunden" };
  if (report.authorId !== authorId && !opts.isAdmin) return { error: "Keine Berechtigung, diesen Bericht zu löschen" };

  await prisma.jobReport.delete({ where: { id: reportId } });
  return { ok: true };
}

export async function updateContribution(authorId: string, contributionId: string, bodyMarkdown: string): Promise<MutationResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId !== authorId) return { error: "Nur der Autor kann diese Ergänzung bearbeiten" };
  if (!bodyMarkdown.trim()) return { error: "Text erforderlich" };
  if (bodyMarkdown.length > CONTRIBUTION_MAX) return { error: `Ergänzung ist zu lang (max. ${CONTRIBUTION_MAX} Zeichen)` };

  await prisma.jobReportContribution.update({ where: { id: contributionId }, data: { bodyMarkdown: bodyMarkdown.trim() } });
  return { ok: true };
}

export async function deleteContribution(authorId: string, contributionId: string): Promise<MutationResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId !== authorId) return { error: "Nur der Autor kann diese Ergänzung löschen" };

  await prisma.jobReportContribution.delete({ where: { id: contributionId } });
  return { ok: true };
}

export type VoteResult = { ok: true } | { error: string };

export async function voteReport(voterId: string, reportId: string): Promise<VoteResult> {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId } });
  if (!report || report.isDraft) return { error: "Bericht nicht gefunden" };
  if (report.authorId === voterId) return { error: "Du kannst deinen eigenen Bericht nicht bewerten" };

  const existing = await prisma.jobReportVote.findUnique({
    where: { reportId_voterId: { reportId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diesen Bericht bereits bewertet" };

  await prisma.jobReportVote.create({ data: { reportId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  // Daumen werden nicht einzeln gemeldet — die tägliche Sammel-Benachrichtigung fasst sie zusammen (content-digest.ts).
  return { ok: true };
}

export async function unvoteReport(voterId: string, reportId: string): Promise<VoteResult> {
  await prisma.jobReportVote.deleteMany({ where: { reportId, voterId } });
  return { ok: true };
}

export async function voteContribution(voterId: string, contributionId: string): Promise<VoteResult> {
  const contribution = await prisma.jobReportContribution.findUnique({ where: { id: contributionId } });
  if (!contribution) return { error: "Ergänzung nicht gefunden" };
  if (contribution.authorId === voterId) return { error: "Du kannst deine eigene Ergänzung nicht bewerten" };

  const existing = await prisma.jobReportContributionVote.findUnique({
    where: { contributionId_voterId: { contributionId, voterId } },
  }).catch(() => null);
  if (existing) return { error: "Du hast diese Ergänzung bereits bewertet" };

  await prisma.jobReportContributionVote.create({ data: { contributionId, voterId } });
  onCommunityJobVoteCast(voterId).catch(() => {});
  return { ok: true };
}

export async function unvoteContribution(voterId: string, contributionId: string): Promise<VoteResult> {
  await prisma.jobReportContributionVote.deleteMany({ where: { contributionId, voterId } });
  return { ok: true };
}

// ── Auswertung fürs Büro ─────────────────────────────────────────────────────

/** Eigene Kennzahlen: Berichte, Bewertungen, Ergänzungen, Verlauf der letzten 8 Wochen. */
export async function getJournalistStats(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 56 * 86_400_000);
  const validVote = { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }] };
  const { weekStart, weekEnd } = getWeekBounds(now);

  const [reports, drafts, scheduled, recentVotes, contributionsReceived, contributionsWritten, contributionVotes, mediaUsedByOthers] = await Promise.all([
    prisma.jobReport.findMany({
      where: { authorId: userId, isDraft: false },
      select: {
        id: true, title: true, bodyMarkdown: true, category: true, publishedAt: true, template: true, adminConfirmedPosted: true,
        coverAssetId: true, gameCoverUrl: true, countsForScore: true,
        _count: { select: { votes: true, contributions: true, media: true } },
      },
    }),
    prisma.jobReport.count({ where: { authorId: userId, isDraft: true, scheduledAt: null } }),
    prisma.jobReport.count({ where: { authorId: userId, isDraft: true, scheduledAt: { not: null } } }),
    prisma.jobReportVote.findMany({
      where: { report: { authorId: userId }, createdAt: { gte: since }, ...validVote },
      select: { createdAt: true },
    }),
    prisma.jobReportContribution.count({ where: { report: { authorId: userId }, authorId: { not: userId } } }),
    prisma.jobReportContribution.count({ where: { authorId: userId } }),
    prisma.jobReportContributionVote.count({ where: { contribution: { authorId: userId }, ...validVote } }),
    // Eigene Bilder, die andere als Titelbild ihres Beitrags nutzen
    prisma.jobReport.count({ where: { isDraft: false, hiddenByAdminAt: null, authorId: { not: userId }, coverAsset: { authorId: userId } } }),
  ]);

  const totalVotes = reports.reduce((sum, r) => sum + r._count.votes, 0);
  const top = [...reports].sort((a, b) => b._count.votes - a._count.votes)[0];

  const byWeek = new Map<number, number>();
  for (const v of recentVotes) {
    const key = getWeekBounds(v.createdAt).weekStart.getTime();
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }
  const weekly = [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([ts, votes]) => ({ weekStart: new Date(ts).toISOString(), votes }));

  const byCategory = new Map<string, number>();
  for (const r of reports) byCategory.set(r.category ?? "ohne", (byCategory.get(r.category ?? "ohne") ?? 0) + 1);

  // Art der Beiträge (ein Beitrag kann mehreres sein): mit Bildern/Clips, Werbung, längerer Text
  const withMedia = reports.filter(r => r._count.media > 0 || !!r.coverAssetId || !!r.gameCoverUrl).length;
  const promo = reports.filter(r => !!r.template).length;
  const longText = reports.filter(r => r.bodyMarkdown.trim().length >= 600).length;
  const avgOf = (list: typeof reports) => (list.length > 0 ? list.reduce((s, r) => s + r._count.votes, 0) / list.length : 0);

  return {
    published: reports.length, drafts, scheduled, totalVotes,
    kinds: { withMedia, promo, longText },
    averageVotesWithMedia: avgOf(reports.filter(r => r._count.media > 0 || !!r.coverAssetId || !!r.gameCoverUrl)),
    averageVotesWithoutMedia: avgOf(reports.filter(r => r._count.media === 0 && !r.coverAssetId && !r.gameCoverUrl)),
    externallyPosted: reports.filter(r => r.adminConfirmedPosted).length,
    overDailyLimit: reports.filter(r => !r.countsForScore).length,
    mediaUsedByOthers,
    averageVotes: reports.length > 0 ? totalVotes / reports.length : 0,
    votesThisWeek: recentVotes.filter(v => v.createdAt >= weekStart && v.createdAt < weekEnd).length,
    top: top && top._count.votes > 0 ? { id: top.id, title: postDisplayTitle({ ...top, mediaCount: top._count.media }), votes: top._count.votes } : null,
    contributionsReceived, contributionsWritten, contributionVotes,
    weekly,
    categories: [...byCategory.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
  };
}

// ── Anbindung ans Community-Job-Gehaltssystem ────────────────────────────────

/** Score-Quellen dieses Bereichs — der Content Creator (content-creator-service.ts) rechnet alle Bereiche zusammen. */
export async function journalistScoreStreams(userId: string, weekStart: Date, weekEnd: Date): Promise<ScoreStream[]> {
  const week = { gte: weekStart, lt: weekEnd };
  const valid = { OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" as const } }] };
  // Kommentar-Daumen zählen nicht mehr fürs Gehalt; nur Inhalte innerhalb des Tageslimits (countsForScore) zählen.
  const [reportVotes, contributionVotes] = await Promise.all([
    prisma.jobReportVote.findMany({
      where: { report: { authorId: userId, hiddenByAdminAt: null, countsForScore: true }, createdAt: week, ...valid },
      select: { voterId: true, reportId: true, createdAt: true },
    }),
    prisma.jobReportContributionVote.findMany({
      where: { contribution: { authorId: userId, countsForScore: true, report: { hiddenByAdminAt: null } }, createdAt: week, ...valid },
      select: { voterId: true, contributionId: true, createdAt: true },
    }),
  ]);
  return [
    { key: "reports", label: "Daumen auf Beiträge", unit: "thumb", events: reportVotes.map(v => ({ voterId: v.voterId, itemKey: `report:${v.reportId}`, points: 1, createdAt: v.createdAt })) },
    { key: "contributions", label: "Daumen auf Ergänzungen", unit: "thumb", events: contributionVotes.map(v => ({ voterId: v.voterId, itemKey: `contribution:${v.contributionId}`, points: 1, createdAt: v.createdAt })) },
  ];
}

registerOwnVoteCounter(async (userId, weekStart, weekEnd) => {
  const [reportVotes, contributionVotes] = await Promise.all([
    prisma.jobReportVote.count({
      where: {
        voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
    prisma.jobReportContributionVote.count({
      where: {
        voterId: userId, createdAt: { gte: weekStart, lt: weekEnd },
        OR: [{ disputeResolution: null }, { disputeResolution: { not: "OVERTURNED" } }],
      },
    }),
  ]);
  return reportVotes + contributionVotes;
});

// ── Reihen ───────────────────────────────────────────────────────────────────

const SERIES_TITLE_MAX = 100;

export async function listMySeries(authorId: string) {
  return prisma.reportSeries.findMany({
    where: { authorId }, orderBy: { createdAt: "desc" },
    include: { _count: { select: { reports: true } } },
  });
}

export async function createSeries(authorId: string, title: string): Promise<{ ok: true; seriesId: string } | { error: string }> {
  if (!(await requireActiveJournalist(authorId))) return { error: "Community-Jobs sind für dein Konto nicht verfügbar" };
  const t = title.trim();
  if (!t) return { error: "Titel erforderlich" };
  if (t.length > SERIES_TITLE_MAX) return { error: `Titel ist zu lang (max. ${SERIES_TITLE_MAX} Zeichen)` };
  const series = await prisma.reportSeries.create({ data: { authorId, title: t } });
  return { ok: true, seriesId: series.id };
}

/** Löscht die Reihe; die Berichte bleiben bestehen (nur die Zuordnung entfällt). */
export async function deleteSeries(authorId: string, seriesId: string): Promise<MutationResult> {
  const series = await prisma.reportSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.authorId !== authorId) return { error: "Reihe nicht gefunden" };
  await prisma.reportSeries.delete({ where: { id: seriesId } });
  return { ok: true };
}

/** Alle veröffentlichten Teile einer Reihe in Veröffentlichungs-Reihenfolge (für die Navigation auf der Bericht-Seite). */
export async function getSeriesParts(seriesId: string) {
  return prisma.jobReport.findMany({
    where: { seriesId, isDraft: false, hiddenByAdminAt: null },
    orderBy: { publishedAt: "asc" }, select: { id: true, title: true },
  });
}

// ── Versionsverlauf ──────────────────────────────────────────────────────────

/** Frühere Fassungen eines Berichts — nur für Autor bzw. Admin. */
export async function listRevisions(viewerId: string, reportId: string, opts: { isAdmin?: boolean } = {}) {
  const report = await prisma.jobReport.findUnique({ where: { id: reportId }, select: { authorId: true } });
  if (!report || (report.authorId !== viewerId && !opts.isAdmin)) return null;
  return prisma.jobReportRevision.findMany({ where: { reportId }, orderBy: { savedAt: "desc" }, take: 30 });
}

// ── Rückblick (Woche/Monat) ──────────────────────────────────────────────────

function berlinMonthStart(now: Date): { start: Date; label: string } {
  const parts = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric", month: "numeric" }).formatToParts(now);
  const year = Number(parts.find(p => p.type === "year")?.value);
  const month = Number(parts.find(p => p.type === "month")?.value);
  // Erster des Monats 00:00 Berliner Zeit ≈ 22:00/23:00 UTC des Vortags — hier genügt der UTC-Tagesanfang abzüglich 2h.
  const start = new Date(Date.UTC(year, month - 1, 1) - 2 * 3_600_000);
  const label = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", month: "long", year: "numeric" }).format(now);
  return { start, label };
}

/**
 * Vorlage für einen Wochen- oder Monatsrückblick aus den Daten der Community: beliebteste Berichte
 * (mit Links) und Events des Zeitraums. Der Journalist ergänzt Highlights/Ausblick.
 */
export async function buildRecap(period: "week" | "month"): Promise<{ title: string; body: string; category: string }> {
  const now = new Date();
  const month = berlinMonthStart(now);
  const since = period === "week" ? new Date(now.getTime() - 7 * 86_400_000) : month.start;
  const base = appBaseUrl();

  const [reports, events] = await Promise.all([
    prisma.jobReport.findMany({
      where: { isDraft: false, hiddenByAdminAt: null, publishedAt: { gte: since } },
      select: { id: true, title: true, author: { select: { id: true, username: true, name: true } }, _count: { select: { votes: true } } },
    }),
    prisma.event.findMany({
      where: { hidden: false, startAt: { gte: since, lte: now } },
      orderBy: { startAt: "asc" }, take: 8,
      select: { id: true, title: true, game: true, finalRankingJson: true, _count: { select: { registrations: true } } },
    }),
  ]);

  const top = [...reports].sort((a, b) => b._count.votes - a._count.votes).slice(0, 5);
  const winnerIds = events.map(e => {
    try { const r = e.finalRankingJson ? JSON.parse(e.finalRankingJson) : []; return Array.isArray(r) && typeof r[0] === "string" ? r[0] as string : null; } catch { return null; }
  });
  const winners = await prisma.user.findMany({
    where: { id: { in: winnerIds.filter((x): x is string => !!x) } }, select: { id: true, username: true, name: true },
  });
  const winnerName = (id: string | null) => { const u = winners.find(w => w.id === id); return u ? (u.username ?? u.name ?? "?") : null; };

  const lines: string[] = [];
  lines.push(period === "week" ? "Was diese Woche in der Community los war:" : `Was im ${month.label} in der Community los war:`, "");
  lines.push("## Beliebteste Berichte");
  if (top.length === 0) lines.push("Noch keine Berichte in diesem Zeitraum.");
  top.forEach((r, i) => lines.push(`${i + 1}. [${r.title.replace(/[\[\]]/g, "")}](${base}${reportPath(r.id)}) — von [@${(r.author.username ?? r.author.name ?? "?").replace(/[\[\]]/g, "")}](user:${r.author.id}) · ${r._count.votes} 👍`));
  lines.push("", "## Events");
  if (events.length === 0) lines.push("Keine Events in diesem Zeitraum.");
  events.forEach((e, i) => {
    const w = winnerName(winnerIds[i]);
    lines.push(`- **${e.title}**${e.game ? ` (${e.game})` : ""} — ${e._count.registrations} Anmeldungen${w ? ` · Sieger: ${w}` : ""}`);
  });
  lines.push("", "## Meine Highlights", "- …", "- …", "", "## Ausblick", "…");

  const title = period === "week" ? "Wochenrückblick" : `Monatsrückblick ${month.label}`;
  return { title, body: lines.join("\n"), category: "news" };
}

import { prisma } from "./prisma";
import { dispatchNotification } from "./notify-dispatch";

/**
 * Tägliche Sammel-Benachrichtigung für Content Creator: statt einzelner Meldungen pro Daumen/Ergänzung gibt es
 * einmal am Tag eine Zusammenfassung („12 Daumen auf 3 Beiträge, 2 Ergänzungen, 4 Daumen auf deine Ergänzungen“).
 * Kommentare und @-Erwähnungen bleiben sofortige Meldungen (das sind Gespräche). Läuft im täglichen Cron.
 */

const LOOKBACK_MS = 48 * 3_600_000; // höchstens 2 Tage zurück (z.B. wenn ein Cron-Lauf ausfiel)

interface Tally { votes: number; votedReports: Set<string>; contributions: number; contributionVotes: number; topReportId: string | null; topVotes: Map<string, number> }

export async function runContentDigest(now: Date = new Date()): Promise<{ sent: number }> {
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const [votes, contributions, contributionVotes] = await Promise.all([
    prisma.jobReportVote.findMany({
      where: { createdAt: { gte: since }, report: { isDraft: false } },
      select: { createdAt: true, reportId: true, report: { select: { authorId: true } } },
    }),
    prisma.jobReportContribution.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, authorId: true, reportId: true, report: { select: { authorId: true } } },
    }),
    prisma.jobReportContributionVote.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, contribution: { select: { authorId: true } } },
    }),
  ]);

  const userIds = new Set<string>([
    ...votes.map(v => v.report.authorId),
    ...contributions.filter(c => c.authorId !== c.report.authorId).map(c => c.report.authorId),
    ...contributionVotes.map(v => v.contribution.authorId),
  ]);
  if (userIds.size === 0) return { sent: 0 };

  // Ab wann gezählt wird: letzte Sammel-Meldung, sonst die letzten 24 Stunden.
  const users = await prisma.user.findMany({ where: { id: { in: [...userIds] }, deletedAt: null }, select: { id: true, contentDigestSentAt: true } });
  const fromById = new Map(users.map(u => [u.id, u.contentDigestSentAt && u.contentDigestSentAt > since ? u.contentDigestSentAt : new Date(now.getTime() - 24 * 3_600_000)]));

  const tallies = new Map<string, Tally>();
  const tally = (id: string) => {
    let t = tallies.get(id);
    if (!t) { t = { votes: 0, votedReports: new Set(), contributions: 0, contributionVotes: 0, topReportId: null, topVotes: new Map() }; tallies.set(id, t); }
    return t;
  };
  const counts = (id: string, at: Date) => { const from = fromById.get(id); return !!from && at > from; };

  for (const v of votes) {
    const id = v.report.authorId;
    if (!counts(id, v.createdAt)) continue;
    const t = tally(id);
    t.votes++; t.votedReports.add(v.reportId);
    t.topVotes.set(v.reportId, (t.topVotes.get(v.reportId) ?? 0) + 1);
  }
  for (const c of contributions) {
    const id = c.report.authorId;
    if (c.authorId === id || !counts(id, c.createdAt)) continue;
    const t = tally(id);
    t.contributions++;
    t.topVotes.set(c.reportId, (t.topVotes.get(c.reportId) ?? 0) + 0.5); // Ergänzungen zählen fürs „wohin verlinken“ mit
  }
  for (const v of contributionVotes) {
    const id = v.contribution.authorId;
    if (!counts(id, v.createdAt)) continue;
    tally(id).contributionVotes++;
  }

  let sent = 0;
  for (const [userId, t] of tallies) {
    const parts: string[] = [];
    if (t.votes > 0) parts.push(`${t.votes} 👍 auf ${t.votedReports.size === 1 ? "einen Beitrag" : `${t.votedReports.size} Beiträge`}`);
    if (t.contributions > 0) parts.push(`${t.contributions} ${t.contributions === 1 ? "neue Ergänzung" : "neue Ergänzungen"}`);
    if (t.contributionVotes > 0) parts.push(`${t.contributionVotes} 👍 auf deine Ergänzungen`);
    if (parts.length === 0) continue;
    const top = [...t.topVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    await dispatchNotification("content_digest", {
      users: [userId],
      placeholders: {
        "{summary}": parts.join(", "),
        "{votes}": String(t.votes), "{contributions}": String(t.contributions),
        "{url}": top ? `/community-board/report/${top}` : "/profile?tab=community_jobs",
      },
    }).catch(() => {});
    await prisma.user.update({ where: { id: userId }, data: { contentDigestSentAt: now } });
    sent++;
  }
  return { sent };
}

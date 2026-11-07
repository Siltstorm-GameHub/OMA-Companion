import { prisma } from "./prisma";
import { getEventFacts } from "./report-event-facts";
import { formatBerlinDate } from "./time";
import { plainExcerpt } from "./report-text";
import { isVideoUrl } from "./upload-limits";

/**
 * Event-Recap auf Knopfdruck: Ergebnis, Teilnehmer, MVP, die beliebtesten Bilder zum Event (aus Beiträgen
 * anderer, mit Urheber) und Zitate aus den Kommentaren werden zu einem fertigen Beitrags-Entwurf mit Galerie.
 */

const IMAGE_LIMIT = 6;
const QUOTE_LIMIT = 3;

export interface EventRecapDraft {
  title: string;
  body: string;
  category: string;
  /** Bestes Bild als Titelbild (Mediathek-Bild eines anderen Autors — er wird beim Veröffentlichen benachrichtigt). */
  coverAssetId: string | null;
  imageCount: number;
  quoteCount: number;
}

const name = (u: { username: string | null; name: string | null }) => u.username ?? u.name ?? "Mitglied";
const oneLine = (s: string) => plainExcerpt(s, 220).replace(/\s+/g, " ").trim();

export async function buildEventRecap(eventId: string, baseUrl: string): Promise<EventRecapDraft | null> {
  const facts = await getEventFacts(eventId);
  if (!facts) return null;

  // Beiträge zum Event (für Bilder-Ranking und Kommentare)
  const reports = await prisma.jobReport.findMany({
    where: { eventId, isDraft: false, hiddenByAdminAt: null },
    select: { id: true, _count: { select: { votes: true } } },
  });
  const reportVotes = new Map(reports.map(r => [r.id, r._count.votes]));

  // Bilder: alle Standbilder zum Event, sortiert nach Daumen des Beitrags, in dem sie stehen
  const assets = await prisma.jobMediaAsset.findMany({
    where: { eventId, hiddenByAdminAt: null },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, url: true, caption: true, reportId: true, author: { select: { username: true, name: true } } },
  });
  const images = assets
    .filter(a => !isVideoUrl(a.url))
    .map(a => ({ ...a, score: a.reportId ? reportVotes.get(a.reportId) ?? 0 : 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, IMAGE_LIMIT);

  // Zitate: meistgelikte Kommentare und Ergänzungen zu Beiträgen über das Event
  const reportIds = reports.map(r => r.id);
  const [comments, contributions] = reportIds.length === 0 ? [[], []] : await Promise.all([
    prisma.communityBoardComment.findMany({
      where: { entityType: "report", entityId: { in: reportIds } },
      select: { bodyMarkdown: true, author: { select: { username: true, name: true } }, _count: { select: { votes: true } } },
      take: 100,
    }),
    prisma.jobReportContribution.findMany({
      where: { reportId: { in: reportIds } },
      select: { bodyMarkdown: true, author: { select: { username: true, name: true } }, _count: { select: { votes: true } } },
      take: 100,
    }),
  ]);
  const quotes = [...comments, ...contributions]
    .filter(q => q.bodyMarkdown.trim().length >= 12)
    .sort((a, b) => b._count.votes - a._count.votes)
    .slice(0, QUOTE_LIMIT);

  const date = formatBerlinDate(facts.startAt, { day: "2-digit", month: "long", year: "numeric" });
  const lines: string[] = [];
  lines.push(`${facts.title}${facts.game ? ` (${facts.game})` : ""} am ${date}${facts.participantsCount > 0 ? ` — ${facts.participantsCount} ${facts.participantsCount === 1 ? "Spieler war" : "Spieler waren"} dabei` : ""}.`);
  if (facts.summary?.trim()) lines.push("", `> ${facts.summary.trim().replace(/\n+/g, " ")}`);

  lines.push("", "## Ergebnis");
  if (facts.ranking.length > 0) {
    const medals = ["🥇", "🥈", "🥉"];
    facts.ranking.forEach(r => lines.push(`${medals[r.place - 1] ?? `${r.place}.`} ${r.name}`));
  } else {
    lines.push("Die Platzierungen stehen noch aus.");
  }
  if (facts.mvp) lines.push("", `**MVP:** ${facts.mvp} ⭐`);
  if (facts.participants.length > 0) {
    lines.push("", `**Mit dabei:** ${facts.participants.join(", ")}${facts.participantsCount > facts.participants.length ? " u.a." : ""}`);
  }

  if (quotes.length > 0) {
    lines.push("", "## Stimmen aus der Community");
    for (const q of quotes) lines.push(`> „${oneLine(q.bodyMarkdown)}“ — ${name(q.author)}`, "");
    lines.pop();
  }

  // Galerie: das beste Bild wird Titelbild, die übrigen stehen als Galerie im Text (mit Urheber).
  const gallery = images.slice(1);
  if (gallery.length > 0) {
    lines.push("", "## Bilder vom Event");
    for (const img of gallery) {
      const label = `${img.caption?.trim() ? `${img.caption.trim()} — ` : ""}📸 ${name(img.author)}`.replace(/[[\]]/g, "");
      lines.push(`![${label}](${img.url})`);
    }
  }
  if (images[0]) lines.push("", `_Titelbild: 📸 ${name(images[0].author)}_`);

  lines.push("", `Alle Details zum Event: ${baseUrl}${facts.url}`);

  return {
    title: `Recap: ${facts.title}`,
    body: lines.join("\n"),
    category: "turnierbericht",
    coverAssetId: images[0]?.id ?? null,
    imageCount: images.length,
    quoteCount: quotes.length,
  };
}

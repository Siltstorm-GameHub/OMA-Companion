// Daten für die Ergebnis-Prüfung (Admin-Seite /admin/events/[id]/results und Prüf-Bereich auf der
// Eventseite) — eine Quelle, damit beide Ansichten exakt dasselbe zeigen.

import { prisma } from "@/lib/prisma";
import { parseScreenshotUrls, isDuelMatch, submissionSubject } from "@/lib/tournaments/matchSubmissions";
import { statRoundLabel } from "@/lib/tournaments/stat-rounds";
import { seriesEventStatFieldsFromConfig } from "@/lib/series-stat-fields";
import type { ReviewMatch } from "@/app/(app)/(dashboard)/admin/events/[id]/results/ResultReviewClient";

export async function loadReviewData(eventId: string, opts: { onlyPending?: boolean } = {}) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, statFields: true,
      series: { select: { seriesStatConfig: true } },
      matches: {
        where: { submissions: opts.onlyPending ? { some: { status: "pending" } } : { some: {} } },
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: {
          entries: true,
          submissions: {
            ...(opts.onlyPending && { where: { status: "pending" } }),
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      participants: { select: { user: { select: { id: true, name: true, username: true } } } },
    },
  });
  if (!event) return null;

  const nameOf = new Map(event.participants.map(p => [p.user.id, p.user.username ?? p.user.name ?? "?"]));

  const matches: ReviewMatch[] = event.matches.map(m => ({
    id: m.id,
    label: isDuelMatch(m) ? (m.title ?? `Runde ${m.round} · Match ${m.position}`) : statRoundLabel(m),
    isDuel: isDuelMatch(m),
    player1: m.player1Id ? { id: m.player1Id, name: nameOf.get(m.player1Id) ?? "?" } : null,
    player2: m.player2Id ? { id: m.player2Id, name: nameOf.get(m.player2Id) ?? "?" } : null,
    current: m.playedAt ? { score1: m.score1, score2: m.score2 } : null,
    submissions: m.submissions.map(s => ({
      id: s.id,
      user: { id: s.user.id, name: s.user.username ?? s.user.name ?? "?" },
      // FFA/Coop: Spieler, dessen Werte gemeldet wurden (auch Meldungen für andere Spieler)
      forUser: isDuelMatch(m) ? null : { id: submissionSubject(s), name: s.forUserId ? nameOf.get(s.forUserId) ?? "?" : s.user.username ?? s.user.name ?? "?" },
      status: s.status,
      applied: s.applied,
      score1: s.score1, score2: s.score2, placement: s.placement, score: s.score,
      stats: s.statsJson ? (JSON.parse(s.statsJson) as Record<string, number>) : {},
      note: s.note,
      reviewNote: s.reviewNote,
      screenshotUrls: parseScreenshotUrls(s.screenshotUrls),
      original: s.originalJson ? JSON.parse(s.originalJson) : null,
      createdAt: s.createdAt.toISOString(),
    })),
  }));

  // Offene zuerst
  matches.sort((a, b) => Number(b.submissions.some(s => s.status === "pending")) - Number(a.submissions.some(s => s.status === "pending")));

  // Stat-Felder für die Korrektur: eigene des Events, sonst die der Reihe (Termine einer Reihe haben
  // oft keine eigenen) — plus alle Felder, die in Meldungen tatsächlich vorkommen
  let statFields: string[] = [];
  try { statFields = event.statFields ? JSON.parse(event.statFields) as string[] : []; } catch { statFields = []; }
  if (statFields.length === 0) statFields = seriesEventStatFieldsFromConfig(event.series?.seriesStatConfig);
  for (const m of matches) for (const s of m.submissions) for (const k of Object.keys(s.stats)) {
    if (!k.startsWith("_") && k !== "Match Win" && !statFields.includes(k)) statFields.push(k);
  }

  return { event: { id: event.id, title: event.title }, matches, statFields };
}

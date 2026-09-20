import { prisma } from "./prisma";

/**
 * Fakten zu einem Event als Grundlage für "Bericht aus Event erzeugen": Spiel, Datum, Teilnehmer,
 * Platzierungen und MVP (aus dem Event-Abschluss), damit der Journalist nur noch ausformulieren muss.
 */
export interface EventFacts {
  id: string;
  title: string;
  game: string | null;
  startAt: string;
  endAt: string | null;
  status: string;
  participantsCount: number;
  participants: string[];
  ranking: { place: number; name: string }[];
  mvp: string | null;
  summary: string | null;
  url: string;
}

function displayName(u: { username: string | null; name: string | null } | undefined): string {
  return u?.username ?? u?.name ?? "Unbekannt";
}

export async function getEventFacts(eventId: string): Promise<EventFacts | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, game: true, startAt: true, endAt: true, status: true, summary: true,
      finalRankingJson: true, completionData: true, hidden: true,
      registrations: {
        where: { role: "player" }, orderBy: { joinedAt: "asc" },
        select: { user: { select: { username: true, name: true } } },
      },
    },
  });
  if (!event || event.hidden) return null;

  let rankingIds: string[] = [];
  try {
    const parsed = event.finalRankingJson ? JSON.parse(event.finalRankingJson) : [];
    if (Array.isArray(parsed)) rankingIds = parsed.filter((x): x is string => typeof x === "string").slice(0, 5);
  } catch { /* ungültiges JSON → keine Platzierungen */ }

  let mvpId: string | null = null;
  try {
    const data = event.completionData ? JSON.parse(event.completionData) : null;
    if (data && typeof data.mvpUserId === "string") mvpId = data.mvpUserId;
  } catch { /* ignorieren */ }

  const wantedIds = [...new Set([...rankingIds, ...(mvpId ? [mvpId] : [])])];
  const users = wantedIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: wantedIds } }, select: { id: true, username: true, name: true } })
    : [];
  const byId = new Map(users.map(u => [u.id, u]));

  return {
    id: event.id, title: event.title, game: event.game,
    startAt: event.startAt.toISOString(), endAt: event.endAt?.toISOString() ?? null, status: event.status,
    participantsCount: event.registrations.length,
    participants: event.registrations.slice(0, 12).map(r => displayName(r.user)),
    ranking: rankingIds.map((id, i) => ({ place: i + 1, name: displayName(byId.get(id)) })),
    mvp: mvpId ? displayName(byId.get(mvpId)) : null,
    summary: event.summary,
    url: `/tournament/${event.id}`,
  };
}

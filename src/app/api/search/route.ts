import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SearchResults = {
  users: { id: string; name: string; image: string | null }[];
  events: { id: string; title: string; startAt: string; game: string | null }[];
  games: { slug: string; name: string; coverUrl: string | null }[];
};

const EMPTY: SearchResults = { users: [], events: [], games: [] };
const LIMIT = 5;

/**
 * Suche in der Kopfzeile: Mitglieder, Events und Spiele (je max. 5). Nur für eingeloggte Mitglieder.
 * Events: keine ausgeblendeten (auch nicht über die Reihe), kommende zuerst, dann die jüngsten.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json(EMPTY);

  const contains = { contains: q, mode: "insensitive" as const };
  const now = new Date();
  const eventWhere = {
    hidden: false,
    title: contains,
    OR: [{ seriesId: null }, { series: { hidden: false } }],
  };

  const [users, upcoming, past, games] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, OR: [{ username: contains }, { name: contains }] },
      orderBy: { rankPoints: "desc" },
      select: { id: true, username: true, name: true, image: true },
      take: LIMIT,
    }),
    prisma.event.findMany({
      where: { ...eventWhere, startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true, game: true },
      take: LIMIT,
    }),
    prisma.event.findMany({
      where: { ...eventWhere, startAt: { lt: now } },
      orderBy: { startAt: "desc" },
      select: { id: true, title: true, startAt: true, game: true },
      take: LIMIT,
    }),
    prisma.game.findMany({
      where: { status: "APPROVED", OR: [{ name: contains }, { aliases: { has: q } }] },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, coverUrl: true },
      take: LIMIT,
    }),
  ]);

  const results: SearchResults = {
    users: users.map((u) => ({ id: u.id, name: u.username ?? u.name ?? "Mitglied", image: u.image })),
    events: [...upcoming, ...past].slice(0, LIMIT).map((e) => ({ id: e.id, title: e.title, startAt: e.startAt.toISOString(), game: e.game })),
    games,
  };
  return NextResponse.json(results);
}

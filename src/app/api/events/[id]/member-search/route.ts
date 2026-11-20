import { NextRequest, NextResponse } from "next/server";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Mitglieder suchen, um sie bei einem Event als Spieler/Zuschauer einzutragen (Reiter "Teilnehmer").
// Ersetzt die frühere komplette Mitgliederliste, die mit jeder Bearbeiten-Seite geladen wurde.
// Nur für alle, die das Event verwalten dürfen.

const SELECT = { id: true, name: true, username: true, image: true } as const;

async function guard(eventId: string) {
  const user = await getSessionUser();
  if (!(await canManageEvent(user, eventId))) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  return null;
}

/** GET ?q=… — bis zu 20 Mitglieder, deren Name oder Username den Text enthält (ab 2 Zeichen). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guard(id);
  if (denied) return denied;
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 50) ?? "";
  if (q.length < 2) return NextResponse.json([]);
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [{ username: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }],
    },
    select: SELECT,
    orderBy: { username: "asc" },
    take: 20,
  });
  return NextResponse.json(users);
}

/** POST { names: string[] } — exakte Treffer (Name oder Username, ohne Groß/Klein) für "Liste einfügen". */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guard(id);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const names: string[] = Array.isArray(body?.names)
    ? [...new Set((body.names as unknown[]).filter((n): n is string => typeof n === "string").map((n) => n.trim()).filter(Boolean))].slice(0, 200)
    : [];
  if (names.length === 0) return NextResponse.json({ matched: [], unmatched: [] });
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: names.flatMap((n) => [{ username: { equals: n, mode: "insensitive" as const } }, { name: { equals: n, mode: "insensitive" as const } }]),
    },
    select: SELECT,
  });
  const lower = (s: string | null) => (s ?? "").toLowerCase();
  const matched: typeof users = [];
  const unmatched: string[] = [];
  for (const n of names) {
    const hit = users.find((u) => lower(u.username) === n.toLowerCase()) ?? users.find((u) => lower(u.name) === n.toLowerCase());
    if (hit) { if (!matched.some((m) => m.id === hit.id)) matched.push(hit); }
    else unmatched.push(n);
  }
  return NextResponse.json({ matched, unmatched });
}

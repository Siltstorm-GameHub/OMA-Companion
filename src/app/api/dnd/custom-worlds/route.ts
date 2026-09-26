import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess, MAX_WORLDS_PER_AUTHOR } from "@/lib/dnd/custom-worlds";
import { defaultCustomWorldDoc } from "@/lib/te-map/custom-world";
import { starterDoc, STARTERS, type StarterId } from "@/lib/te-map/starters";
import { getWorld } from "@/lib/te-map/worlds";

export const dynamic = "force-dynamic";

/** Eigene Welten (Admins sehen alle Locations im Admin-Bereich der Übersicht). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const select = { id: true, slug: true, title: true, status: true, reviewNote: true, updatedAt: true, submittedAt: true, author: { select: { name: true, username: true } } } as const;
  // Von Admins bearbeitete feste Locations sind keine „Meine Locations“ — die stehen im Admin-Bereich unter „Feste Locations“
  const authored = await prisma.dndCustomWorld.findMany({ where: { authorId: session.user.id }, select, orderBy: { updatedAt: "desc" } });
  const mine = authored.filter((w) => !getWorld(w.slug));
  return NextResponse.json({ isAdmin: access.isAdmin, max: MAX_WORLDS_PER_AUTHOR, mine });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  if (!access.isAdmin) {
    const count = (await prisma.dndCustomWorld.findMany({ where: { authorId: session.user.id }, select: { slug: true } })).filter((w) => !getWorld(w.slug)).length;
    if (count >= MAX_WORLDS_PER_AUTHOR) return NextResponse.json({ error: `Du kannst höchstens ${MAX_WORLDS_PER_AUTHOR} Locations anlegen.` }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const theme = body?.theme === "cave" ? "cave" : "outdoor";
  const starter = STARTERS.find((s) => s.id === body?.template);
  const doc = starter ? starterDoc(starter.id as StarterId, theme) : defaultCustomWorldDoc(theme);
  const row = await prisma.dndCustomWorld.create({
    data: { slug: `cw-tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, authorId: session.user.id, title: doc.title, doc: JSON.parse(JSON.stringify(doc)) },
  });
  // Der Slug hängt an der Id (kurz, eindeutig, URL-tauglich)
  await prisma.dndCustomWorld.update({ where: { id: row.id }, data: { slug: `cw-${row.id.slice(-10)}` } });
  return NextResponse.json({ id: row.id });
}

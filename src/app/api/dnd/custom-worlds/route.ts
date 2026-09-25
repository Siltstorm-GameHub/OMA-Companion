import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess, MAX_WORLDS_PER_AUTHOR } from "@/lib/dnd/custom-worlds";
import { defaultCustomWorldDoc } from "@/lib/te-map/custom-world";

export const dynamic = "force-dynamic";

/** Eigene Welten; Admins sehen mit ?scope=review zusätzlich alle eingereichten. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const select = { id: true, slug: true, title: true, status: true, reviewNote: true, updatedAt: true, submittedAt: true, author: { select: { name: true, username: true } } } as const;
  const mine = await prisma.dndCustomWorld.findMany({ where: { authorId: session.user.id }, select, orderBy: { updatedAt: "desc" } });
  const review = access.isAdmin && req.nextUrl.searchParams.get("scope") === "review"
    ? await prisma.dndCustomWorld.findMany({ where: { status: "PENDING" }, select, orderBy: { submittedAt: "asc" } })
    : [];
  return NextResponse.json({ isAdmin: access.isAdmin, max: MAX_WORLDS_PER_AUTHOR, mine, review });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  if (!access.isAdmin) {
    const count = await prisma.dndCustomWorld.count({ where: { authorId: session.user.id } });
    if (count >= MAX_WORLDS_PER_AUTHOR) return NextResponse.json({ error: `Du kannst höchstens ${MAX_WORLDS_PER_AUTHOR} Locations anlegen.` }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const doc = defaultCustomWorldDoc(body?.theme === "cave" ? "cave" : "outdoor");
  const row = await prisma.dndCustomWorld.create({
    data: { slug: `cw-tmp-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, authorId: session.user.id, title: doc.title, doc: JSON.parse(JSON.stringify(doc)) },
  });
  // Der Slug hängt an der Id (kurz, eindeutig, URL-tauglich)
  await prisma.dndCustomWorld.update({ where: { id: row.id }, data: { slug: `cw-${row.id.slice(-10)}` } });
  return NextResponse.json({ id: row.id });
}

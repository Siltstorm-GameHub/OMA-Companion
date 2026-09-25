import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import { createWorldEvent } from "@/lib/dnd/world-events";

export const dynamic = "force-dynamic";

/**
 * Spielleiter: löst ein Live-Ereignis aus. `slug` = Location oder "alle" für überall.
 * Body: { kind: "announce" | "check" | "loot", title, text, params }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed) return NextResponse.json({ error: "Nur Spielleiter (Community-Job oder Admin) dürfen Ereignisse auslösen." }, { status: 403 });

  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true, name: true } });
  const r = await createWorldEvent({ id: session.user.id, name: user?.username ?? user?.name ?? "Spielleiter" }, {
    locationSlug: slug === "alle" ? null : slug, kind: body?.kind, title: body?.title, text: body?.text, params: body?.params,
  });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r);
}

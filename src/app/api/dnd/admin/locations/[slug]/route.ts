import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteLocation, ensureEditableWorld, getBuilderAccess } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed || !access.isAdmin) return { error: NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 }) } as const;
  return { userId: session.user.id } as const;
}

/** Bearbeiten: liefert die Editor-Id der Location (feste Welten werden dafür einmalig übernommen). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const r = await ensureEditableWorld((await params).slug, a.userId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ id: r.id });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const r = await deleteLocation((await params).slug);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

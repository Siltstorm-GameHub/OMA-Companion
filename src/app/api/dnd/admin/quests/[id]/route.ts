import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteActivityQuest, getBuilderAccess, updateActivityQuest } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed || !access.isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const r = await updateActivityQuest((await params).id, body ?? {});
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const r = await deleteActivityQuest((await params).id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

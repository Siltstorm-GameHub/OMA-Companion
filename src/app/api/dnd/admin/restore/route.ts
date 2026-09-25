import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureDndWorldSeeded } from "@/lib/dnd/locations";
import { ensureDndQuestsSeeded } from "@/lib/dnd/quests";
import { getBuilderAccess, restoreRemoved } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

/** Gelöschte feste Location bzw. Quest wiederherstellen (Standardfassung aus dem Code). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const access = await getBuilderAccess(session.user.id);
  if (!access.allowed || !access.isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if ((body?.kind !== "LOCATION" && body?.kind !== "QUEST") || typeof body?.slug !== "string") return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  await restoreRemoved(body.kind, body.slug);
  await ensureDndWorldSeeded();
  await ensureDndQuestsSeeded();
  return NextResponse.json({ ok: true });
}

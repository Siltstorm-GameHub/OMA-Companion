import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { getCharacterSheet, setEquipped } from "@/lib/dnd/rpg-server";

export const dynamic = "force-dynamic";

/** Gegenstand ausrüsten/ablegen: { item, equipped }. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (typeof body?.item !== "string" || typeof body?.equipped !== "boolean") return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const r = await setEquipped(card.id, body.item, body.equipped);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(await getCharacterSheet(card));
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { getCharacterSheet } from "@/lib/dnd/rpg-server";

export const dynamic = "force-dynamic";

/** Charakterbogen: Stufe, XP, Gold, Attribute mit Modifikatoren, Rucksack. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  return NextResponse.json(await getCharacterSheet(card));
}

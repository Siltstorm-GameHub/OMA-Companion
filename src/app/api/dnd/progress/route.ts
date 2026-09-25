import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { getProgress, leaderboard } from "@/lib/dnd/progression";

export const dynamic = "force-dynamic";

/** Fortschrittsübersicht: Stufe/Titel, was die nächste Stufe bringt, Meilensteine, Statistik, Rang und Bestenliste. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const [progress, board] = await Promise.all([getProgress(card), leaderboard(card.id, 10)]);
  return NextResponse.json({ progress, leaderboard: board });
}

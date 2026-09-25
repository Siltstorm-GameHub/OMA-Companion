import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureDndQuestsSeeded } from "@/lib/dnd/quests";
import { ensureDndWorldSeeded } from "@/lib/dnd/locations";
import { getMyDndCard, getQuestLog } from "@/lib/dnd/quest-log";

export const dynamic = "force-dynamic";

/** Quest-Log des eigenen Charakters: laufend, verfügbar (Aktivitäts-Quests), abgeschlossen. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  await ensureDndWorldSeeded();
  await ensureDndQuestsSeeded();
  return NextResponse.json(await getQuestLog(card.id));
}

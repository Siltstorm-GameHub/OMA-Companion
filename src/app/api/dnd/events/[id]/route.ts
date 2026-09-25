import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { eventResults, respondToEvent } from "@/lib/dnd/world-events";

export const dynamic = "force-dynamic";

/** Auf ein Spielleiter-Ereignis reagieren (würfeln bzw. Beute nehmen). */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const r = await respondToEvent(card, (await params).id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ...r, results: await eventResults((await params).id) });
}

/** Bisherige Ergebnisse (für Spielleiter und Beteiligte). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ results: await eventResults((await params).id) });
}

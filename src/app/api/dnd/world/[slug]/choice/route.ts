import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cardAtLocation } from "@/lib/dnd/at-location";
import { resolveChoice } from "@/lib/dnd/rpg-server";
import { getTracker } from "@/lib/dnd/quest-log";

export const dynamic = "force-dynamic";

/** Antwort eines Dialogs auswerten (Entscheidung oder Probe). Der Server würfelt und wendet das Ergebnis an. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { slug } = await params;
  const at = await cardAtLocation(session.user.id, slug);
  if ("error" in at) return NextResponse.json({ error: at.error }, { status: at.status });

  const body = await req.json().catch(() => ({}));
  const actor = typeof body?.actor === "string" ? body.actor : "";
  const talk = Number(body?.talk);
  const choice = Number(body?.choice);
  if (!actor || !Number.isInteger(talk) || !Number.isInteger(choice) || talk < 0 || choice < 0) return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });

  const r = await resolveChoice(at.card, slug, actor, talk, choice);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ...r, tracker: await getTracker(at.card.id) });
}

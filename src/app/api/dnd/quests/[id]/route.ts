import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { abandonQuest, acceptActivityQuest, getMyDndCard, getTracker, setQuestTracked } from "@/lib/dnd/quest-log";

export const dynamic = "force-dynamic";

/** Quest-Aktion: { action: "accept" | "track" | "untrack" | "abandon" }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const r =
    body?.action === "accept" ? await acceptActivityQuest(card.id, id)
    : body?.action === "track" ? await setQuestTracked(card.id, id, true)
    : body?.action === "untrack" ? await setQuestTracked(card.id, id, false)
    : body?.action === "abandon" ? await abandonQuest(card.id, id)
    : { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, tracker: await getTracker(card.id) });
}

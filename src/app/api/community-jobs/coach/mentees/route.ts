import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listMentees, addMentee } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** Eigene Mentees (privat für den Coach). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ mentees: await listMentees(user.id) });
}

/** POST { menteeId, note? } — Spieler als Mentee hinzufügen (oder Notiz aktualisieren). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { menteeId, note } = await req.json().catch(() => ({}));
  if (typeof menteeId !== "string") return NextResponse.json({ error: "menteeId erforderlich" }, { status: 400 });

  const result = await addMentee(user.id, menteeId, typeof note === "string" ? note : undefined);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

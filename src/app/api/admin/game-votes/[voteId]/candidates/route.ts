import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { addCandidate, removeCandidate } from "@/lib/game-vote/service";

/** POST { gameId } — Kandidat zur Spielwahl hinzufügen (Mods, bis zum Ende der Abstimmung). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ voteId: string }> }) {
  await requireRole("moderator");
  const { voteId } = await params;
  const body = await req.json().catch(() => ({})) as { gameId?: unknown };
  if (typeof body.gameId !== "string") return NextResponse.json({ error: "Spiel fehlt" }, { status: 400 });
  const result = await addCandidate(voteId, body.gameId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

/** DELETE ?candidateId=… — Kandidat entfernen (seine Stimmen fallen weg). */
export async function DELETE(req: NextRequest) {
  await requireRole("moderator");
  const candidateId = req.nextUrl.searchParams.get("candidateId");
  if (!candidateId) return NextResponse.json({ error: "Kandidat fehlt" }, { status: 400 });
  const result = await removeCandidate(candidateId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

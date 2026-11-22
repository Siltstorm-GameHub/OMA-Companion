import { NextRequest, NextResponse } from "next/server";
import { canManageEvent, getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { addCandidate, removeCandidate } from "@/lib/game-vote/service";

/** Kandidaten bearbeiten dürfen alle, die das Event der Wahl verwalten (nicht nur Mods). */
async function allowed(voteId: string) {
  const vote = await prisma.gameVote.findUnique({ where: { id: voteId }, select: { eventId: true } });
  if (!vote) return false;
  return canManageEvent(await getSessionUser(), vote.eventId);
}

/** POST { gameId } — Kandidat zur Spielwahl hinzufügen (bis zum Ende der Abstimmung). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ voteId: string }> }) {
  const { voteId } = await params;
  if (!(await allowed(voteId))) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  const body = await req.json().catch(() => ({})) as { gameId?: unknown };
  if (typeof body.gameId !== "string") return NextResponse.json({ error: "Spiel fehlt" }, { status: 400 });
  const result = await addCandidate(voteId, body.gameId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}

/** DELETE ?candidateId=… — Kandidat entfernen (seine Stimmen fallen weg, die Abstimmenden bekommen eine Meldung). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ voteId: string }> }) {
  const { voteId } = await params;
  if (!(await allowed(voteId))) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  const candidateId = req.nextUrl.searchParams.get("candidateId");
  if (!candidateId) return NextResponse.json({ error: "Kandidat fehlt" }, { status: 400 });
  const cand = await prisma.gameVoteCandidate.findUnique({ where: { id: candidateId }, select: { voteId: true } });
  if (!cand || cand.voteId !== voteId) return NextResponse.json({ error: "Kandidat nicht gefunden" }, { status: 404 });
  const result = await removeCandidate(candidateId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, removedVotes: result.removedVotes });
}

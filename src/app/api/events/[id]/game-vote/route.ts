import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { castBallot } from "@/lib/game-vote/service";

/**
 * PUT /api/events/[id]/game-vote { candidateIds: string[] } — Stimme zur Spielwahl setzen/korrigieren
 * (alle Spiele, die man spielen würde). Die erste Stimme meldet als Mitspieler an (lib/game-vote).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null) as { candidateIds?: unknown } | null;
  const result = await castBallot(user.id, id, body?.candidateIds);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ registration: result.registration, candidateIds: result.candidateIds });
}

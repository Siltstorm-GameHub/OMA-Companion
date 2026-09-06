import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { rateAdHoc, rateAfterTraining } from "@/lib/coach-service";

/**
 * POST { coachId, stars, reason, trainingSessionId? } — mit trainingSessionId
 * zählt es als Termin-Bewertung (nur Teilnehmer, einmalig pro Termin), ohne als
 * Ad-hoc-Bewertung (jeder, mit 24h-Cooldown pro Rater-Coach-Paar).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { coachId, stars, reason, trainingSessionId } = await req.json().catch(() => ({}));
  if (typeof coachId !== "string" || typeof stars !== "number" || typeof reason !== "string") {
    return NextResponse.json({ error: "coachId, stars und reason erforderlich" }, { status: 400 });
  }

  const result = typeof trainingSessionId === "string"
    ? await rateAfterTraining(user.id, coachId, trainingSessionId, stars, reason)
    : await rateAdHoc(user.id, coachId, stars, reason);

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

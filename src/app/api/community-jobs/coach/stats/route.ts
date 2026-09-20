import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getCoachStats } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** Eigene Auswertung fürs Coach-Büro: Wochenziel, Bewertungs-Verlauf, letzte Termine. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getCoachStats(user.id));
}

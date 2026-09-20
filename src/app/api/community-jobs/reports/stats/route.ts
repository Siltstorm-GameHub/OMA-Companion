import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getJournalistStats } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** Eigene Auswertung fürs Journalisten-Büro. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getJournalistStats(user.id));
}

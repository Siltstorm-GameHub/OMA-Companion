import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { enrichPendingGames } from "@/lib/games/service";

// Steam-Abfragen laufen nacheinander — ein Durchgang kann einige Sekunden dauern.
export const maxDuration = 60;

/** Nächste Spiele ohne Steam-Abgleich ergänzen. Antwort enthält `remaining` für weitere Durchgänge. */
export async function POST() {
  await requireRole("moderator");
  return NextResponse.json(await enrichPendingGames(8));
}

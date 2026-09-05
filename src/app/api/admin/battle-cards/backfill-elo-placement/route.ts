import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { backfillEloPlacementMatches } from "@/lib/battle-cards/ranked-season";
import { markEloPlacementBackfillRan } from "@/lib/season/season-config";

/** Einmaliger Nachtrag (siehe ranked-season.ts: backfillEloPlacementMatches):
 *  zählt Kämpfe von VOR dem Elo-Launch nachträglich als Platzierungsspiele,
 *  damit User mit langer Kampfhistorie nicht ewig als "uneingestuft" gelten. */
export async function POST() {
  await requireRole("admin");
  const result = await backfillEloPlacementMatches();
  await markEloPlacementBackfillRan();
  return NextResponse.json(result);
}

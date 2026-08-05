import { NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { claimWage } from "@/lib/job-service";

export async function POST() {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const result = await claimWage(guard.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  // Bewusst ohne updateQuestProgress: einen Quest-Typ für Idle-Lohn gibt es
  // noch nicht, und einen zu erfinden, hieße TEMPLATES und QUEST_TYPE_META
  // mitzupflegen — das gehört in einen eigenen Schritt.
  return NextResponse.json(result);
}

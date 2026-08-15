import { NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { claimWage } from "@/lib/job-service";
import { updateQuestProgress } from "@/lib/quests";
import { checkAndAwardBadges } from "@/lib/award-badges";

export async function POST() {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const result = await claimWage(guard.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  // Nebenwirkung ohne Einfluss auf die Antwort — Muster wie beim Tages-Spin.
  // Gezählt wird die Abholung, nicht der Betrag: sonst wäre die Quest allein
  // vom Job abhängig statt vom Reinschauen.
  updateQuestProgress(guard.userId, "JOB_CLAIM", 1).catch(() => {});
  checkAndAwardBadges(guard.userId).catch(() => {});

  return NextResponse.json(result);
}

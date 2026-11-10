import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { syncStores } from "@/lib/games/store-sync";

export const maxDuration = 60;

/** Steam-Preise/Rabatte und Game-Pass-Katalog sofort abgleichen (läuft sonst täglich per Cron). */
export async function POST() {
  await requireRole("moderator");
  return NextResponse.json(await syncStores());
}

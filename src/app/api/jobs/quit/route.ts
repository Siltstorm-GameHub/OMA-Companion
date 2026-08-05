import { NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { quitJob } from "@/lib/job-service";

export async function POST() {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  const result = await quitJob(guard.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { quitJob } from "@/lib/job-service";

export async function POST() {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  const result = await quitJob(guard.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { hireJob } from "@/lib/job-service";

export async function POST(req: NextRequest) {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  const { jobKey } = await req.json().catch(() => ({ jobKey: null }));
  if (typeof jobKey !== "string" || !jobKey) {
    return NextResponse.json({ error: "Job fehlt" }, { status: 400 });
  }

  const result = await hireJob(guard.userId, jobKey);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result);
}

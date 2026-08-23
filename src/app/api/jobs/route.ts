import { NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { getJobOverview } from "@/lib/job-service";

export const dynamic = "force-dynamic";

/** Jobbörse: aktueller Job mit aufgelaufenem Lohn plus alle Stellen. */
export async function GET() {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  return NextResponse.json(await getJobOverview(guard.userId));
}

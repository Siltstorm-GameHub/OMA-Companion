import { NextResponse } from "next/server";
import { requireRoomAccess } from "@/lib/room-guard";
import { getJobOverview } from "@/lib/job-service";

export const dynamic = "force-dynamic";

/** Jobbörse: aktueller Job mit aufgelaufenem Lohn plus alle Stellen. */
export async function GET() {
  const guard = await requireRoomAccess();
  if ("response" in guard) return guard.response;

  return NextResponse.json(await getJobOverview(guard.userId));
}

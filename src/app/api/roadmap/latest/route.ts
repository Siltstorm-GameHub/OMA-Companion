import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { latestRoadmapChange } from "@/lib/roadmap-service";

export const dynamic = "force-dynamic";

/** Jüngste Änderung auf der Roadmap — der Client vergleicht mit seinem letzten Besuch (Punkt an "Roadmap") */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ at: null });
  return NextResponse.json({ at: await latestRoadmapChange() }, { headers: { "Cache-Control": "private, max-age=60" } });
}

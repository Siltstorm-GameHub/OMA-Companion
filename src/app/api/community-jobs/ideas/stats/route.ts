import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getVisionaerStats } from "@/lib/visionaer-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getVisionaerStats(user.id));
}

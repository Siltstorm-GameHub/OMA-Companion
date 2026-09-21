import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getMarketingStats } from "@/lib/marketing-manager-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getMarketingStats(user.id));
}

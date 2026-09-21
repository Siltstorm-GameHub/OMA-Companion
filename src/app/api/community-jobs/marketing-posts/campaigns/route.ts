import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createCampaign, listMyCampaigns } from "@/lib/marketing-manager-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ campaigns: await listMyCampaigns(user.id) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { eventId, title } = await req.json().catch(() => ({}));
  if (typeof eventId !== "string") return NextResponse.json({ error: "Event erforderlich" }, { status: 400 });
  const result = await createCampaign(user.id, { eventId, title: typeof title === "string" ? title : undefined });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

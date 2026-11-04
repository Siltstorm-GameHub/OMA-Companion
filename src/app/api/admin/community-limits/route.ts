import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getCommunityLimits, updateCommunityLimits } from "@/lib/community-event-limits";

/** Belohnungs-Obergrenzen und Mengenlimits für Community-Events (lib/community-event-limits.ts). */
export async function GET() {
  await requireRole("moderator");
  return NextResponse.json(await getCommunityLimits());
}

export async function PUT(req: NextRequest) {
  await requireRole("admin");
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  return NextResponse.json(await updateCommunityLimits(body));
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { countPendingApplications } from "@/lib/gameservers";

export async function GET() {
  await requireRole("moderator");
  const count = await countPendingApplications();
  return NextResponse.json({ count });
}

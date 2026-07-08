import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { finalizeYearlyContest } from "@/lib/clip-of-year";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const message = await finalizeYearlyContest(id);
  return NextResponse.json({ ok: true, message });
}

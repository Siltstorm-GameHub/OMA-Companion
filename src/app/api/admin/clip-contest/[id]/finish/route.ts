import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { finalizeContest } from "@/lib/clip-contest";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const message = await finalizeContest(id);
  return NextResponse.json({ ok: true, message });
}

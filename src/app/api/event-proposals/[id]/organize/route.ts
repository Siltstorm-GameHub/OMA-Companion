import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { organizeProposal, releaseProposal } from "@/lib/event-proposal-service";

/** "Ich organisiere das" übernehmen (POST) bzw. wieder abgeben (DELETE) */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const result = await organizeProposal(user, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const result = await releaseProposal(user, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

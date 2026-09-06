import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { voteContribution, unvoteContribution } from "@/lib/journalist-service";

export async function POST(_req: Request, { params }: { params: Promise<{ contribId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { contribId } = await params;
  const result = await voteContribution(user.id, contribId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ contribId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { contribId } = await params;
  const result = await unvoteContribution(user.id, contribId);
  return NextResponse.json(result);
}
